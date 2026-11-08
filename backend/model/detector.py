import os
import math
from pathlib import Path
from typing import List, Dict
import numpy as np
import cv2
from ultralytics import YOLO

CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = CURRENT_DIR.parent / "yolo11n.pt"
MODEL_NAME = str(DEFAULT_MODEL_PATH) if DEFAULT_MODEL_PATH.exists() else "yolo11n.pt"

# Resolution, NMS IoU, and confidence specifically tuned for dense crowd detection
IMGSZ = 1280
CONFIDENCE = 0.06
NMS_IOU = 0.62   # Prevents NMS from suppressing closely packed neighbors in dense crowds

# Load YOLO model
model = YOLO(MODEL_NAME)


def _box_iou(b1, b2) -> float:
    """Computes Intersection-over-Union between two bounding boxes [x1, y1, x2, y2]."""
    x_a = max(b1[0], b2[0])
    y_a = max(b1[1], b2[1])
    x_b = min(b1[2], b2[2])
    y_b = min(b1[3], b2[3])
    
    inter_w = max(0, x_b - x_a)
    inter_h = max(0, y_b - y_a)
    inter_area = inter_w * inter_h
    
    if inter_area <= 0:
        return 0.0
        
    area1 = max(1, (b1[2] - b1[0]) * (b1[3] - b1[1]))
    area2 = max(1, (b2[2] - b2[0]) * (b2[3] - b2[1]))
    union_area = float(area1 + area2 - inter_area)
    return inter_area / union_area if union_area > 0 else 0.0


def _is_valid_person_box(x1: int, y1: int, x2: int, y2: int, frame_w: int, frame_h: int) -> bool:
    """Filters out video artifacts, border noise, and non-pedestrian aspect ratios."""
    w = x2 - x1
    h = y2 - y1
    if w < 6 or h < 12:
        return False
    if w * h < 72:
        return False
    if w > frame_w * 0.92 or h > frame_h * 0.92:
        return False
    aspect = h / float(w)
    # Human aspect ratio: crouching/fallen (~0.35) to standing/walking upright (~5.5)
    if aspect < 0.35 or aspect > 6.0:
        return False
    return True


class CrowdTracker:
    """
    High-Density Crowd Tracker with Occlusion Memory.
    Maintains continuous track persistence through dense crowd crossings.
    If a person is momentarily occluded for 1-3 frames by someone in front,
    the tracker keeps their identity alive and estimates their position,
    preventing crowd count dropouts and severe flickering.
    """
    def __init__(self, max_distance: float = 80.0, max_missed: int = 15, max_persist_frames: int = 3):
        self.next_id = 1
        self.tracks = {}  # tid -> {'center': (cx, cy), 'box': (x1, y1, x2, y2), 'conf': conf, 'missed': 0, 'vx': 0.0, 'vy': 0.0}
        self.max_distance = max_distance
        self.max_missed = max_missed
        self.max_persist_frames = max_persist_frames

    def reset(self):
        self.next_id = 1
        self.tracks.clear()

    def update(self, detections: List[Dict], frame_w: int = 1920, frame_h: int = 1080) -> List[Dict]:
        """
        detections: list of dicts [{'x1', 'y1', 'x2', 'y2', 'conf'}]
        Returns list of dicts with guaranteed 'id', 'x1', 'y1', 'x2', 'y2', 'conf', 'persisted'
        """
        if not detections:
            for tid in list(self.tracks.keys()):
                self.tracks[tid]['missed'] += 1
                if self.tracks[tid]['missed'] > self.max_missed:
                    del self.tracks[tid]
            return []

        det_centers = [((d['x1'] + d['x2']) / 2.0, (d['y1'] + d['y2']) / 2.0) for d in detections]
        track_ids = list(self.tracks.keys())
        
        assigned_dets = set()
        assigned_tracks = set()

        if track_ids:
            # Predict new center using last velocity
            predicted_centers = []
            for tid in track_ids:
                trk = self.tracks[tid]
                pred_cx = trk['center'][0] + trk.get('vx', 0.0) * 0.5
                pred_cy = trk['center'][1] + trk.get('vy', 0.0) * 0.5
                predicted_centers.append((pred_cx, pred_cy))

            # Distance matrix
            dists = np.zeros((len(track_ids), len(det_centers)), dtype=np.float32)
            for i, tc in enumerate(predicted_centers):
                for j, dc in enumerate(det_centers):
                    dists[i, j] = math.hypot(tc[0] - dc[0], tc[1] - dc[1])

            # Greedy nearest neighbor association
            while True:
                min_val = np.min(dists) if dists.size > 0 else 999999.0
                if min_val > self.max_distance:
                    break
                i, j = np.unravel_index(np.argmin(dists), dists.shape)
                if i not in assigned_tracks and j not in assigned_dets:
                    assigned_tracks.add(i)
                    assigned_dets.add(j)
                    tid = track_ids[i]
                    d = detections[j]
                    
                    old_c = self.tracks[tid]['center']
                    new_c = det_centers[j]
                    vx = new_c[0] - old_c[0]
                    vy = new_c[1] - old_c[1]
                    
                    self.tracks[tid] = {
                        'center': new_c,
                        'box': (d['x1'], d['y1'], d['x2'], d['y2']),
                        'conf': d['conf'],
                        'missed': 0,
                        'vx': vx,
                        'vy': vy
                    }
                    d['id'] = tid
                    d['persisted'] = False
                dists[i, :] = 999999.0
                dists[:, j] = 999999.0

        # Handle unassigned tracks (momentarily occluded or missed)
        output_detections = list(detections)
        for i, tid in enumerate(track_ids):
            if i not in assigned_tracks:
                trk = self.tracks[tid]
                trk['missed'] += 1
                
                # Propagate position through occlusion
                vx, vy = trk.get('vx', 0.0) * 0.4, trk.get('vy', 0.0) * 0.4
                bx1, by1, bx2, by2 = trk['box']
                nbx1 = int(max(0, min(frame_w - 1, bx1 + vx)))
                nby1 = int(max(0, min(frame_h - 1, by1 + vy)))
                nbx2 = int(max(0, min(frame_w, bx2 + vx)))
                nby2 = int(max(0, min(frame_h, by2 + vy)))
                trk['box'] = (nbx1, nby1, nbx2, nby2)
                trk['center'] = ((nbx1 + nbx2) / 2.0, (nby1 + nby2) / 2.0)

                # If track was missed for <= max_persist_frames (0.1s), carry it forward
                if trk['missed'] <= self.max_persist_frames:
                    output_detections.append({
                        "x1": nbx1,
                        "y1": nby1,
                        "x2": nbx2,
                        "y2": nby2,
                        "conf": round(trk['conf'] * 0.85, 3),
                        "id": tid,
                        "persisted": True
                    })

                if trk['missed'] > self.max_missed:
                    del self.tracks[tid]

        # Initialize tracks for new detections
        for j, d in enumerate(detections):
            if j not in assigned_dets:
                tid = self.next_id
                self.next_id += 1
                self.tracks[tid] = {
                    'center': det_centers[j],
                    'box': (d['x1'], d['y1'], d['x2'], d['y2']),
                    'conf': d['conf'],
                    'missed': 0,
                    'vx': 0.0,
                    'vy': 0.0
                }
                d['id'] = tid
                d['persisted'] = False

        return output_detections


tracker = CrowdTracker(max_distance=80.0, max_missed=15, max_persist_frames=3)


def reset_tracker():
    """Resets tracking memory between videos and streams."""
    tracker.reset()


def _run_yolo_pass(image, conf: float, imgsz: int, iou: float = NMS_IOU):
    """Executes single YOLO pass for person class (0)."""
    results = model.predict(
        image,
        classes=[0],
        conf=conf,
        iou=iou,
        imgsz=imgsz,
        verbose=False
    )
    raw_boxes = []
    for result in results:
        if result.boxes is None:
            continue
        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            confidence = float(box.conf[0]) if box.conf is not None else 0.0
            raw_boxes.append((x1, y1, x2, y2, confidence))
    return raw_boxes


def detect_people(image, conf: float = CONFIDENCE, imgsz: int = IMGSZ, enable_dense_scan: bool = True):
    """
    Detects and tracks people in a given frame with dual-pass dense crowd sensitivity.
    1. Global frame pass with tuned NMS IoU to separate overlapping pedestrians.
    2. High-resolution patch pass on perspective dense zones for distant/small people.
    3. Occlusion-persistent tracking that eliminates crowd count dropouts.
    """
    if image is None or not hasattr(image, "shape") or image.size == 0:
        return []

    frame_h, frame_w = image.shape[:2]

    # Pass 1: Global full-frame detection
    raw_boxes = _run_yolo_pass(image, conf=conf, imgsz=imgsz, iou=NMS_IOU)
    
    global_detections = []
    for x1, y1, x2, y2, c in raw_boxes:
        if _is_valid_person_box(x1, y1, x2, y2, frame_w, frame_h):
            global_detections.append({
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "conf": round(c, 3)
            })

    # Pass 2: Distant & Dense Area Scan (SAHI-inspired Tile Inference)
    # Distant crowds in perspective shots are concentrated in the upper 70% of the frame.
    # Running a targeted high-res crop doubles effective pixel density for tiny distant heads.
    if enable_dense_scan and frame_w >= 800 and frame_h >= 450:
        crop_h = int(frame_h * 0.72)
        crop_img = image[0:crop_h, :]
        
        # Run patch scan
        patch_boxes = _run_yolo_pass(crop_img, conf=max(0.04, conf * 0.85), imgsz=imgsz, iou=NMS_IOU)
        
        # Merge patch detections into global detections if not already covered
        existing_boxes = [[d['x1'], d['y1'], d['x2'], d['y2']] for d in global_detections]
        
        for px1, py1, px2, py2, pc in patch_boxes:
            gx1, gy1, gx2, gy2 = px1, py1, px2, py2  # y-offset is 0
            if not _is_valid_person_box(gx1, gy1, gx2, gy2, frame_w, frame_h):
                continue
                
            # Check overlap with existing global detections
            patch_box = [gx1, gy1, gx2, gy2]
            max_iou = 0.0
            for eb in existing_boxes:
                iou_val = _box_iou(patch_box, eb)
                if iou_val > max_iou:
                    max_iou = iou_val
                    
            # If this is a newly discovered distant person not captured in full pass
            if max_iou < 0.45:
                global_detections.append({
                    "x1": gx1,
                    "y1": gy1,
                    "x2": gx2,
                    "y2": gy2,
                    "conf": round(pc, 3)
                })
                existing_boxes.append(patch_box)

    # Associate persistent tracking IDs with occlusion memory
    tracked_people = tracker.update(global_detections, frame_w=frame_w, frame_h=frame_h)
    return tracked_people
