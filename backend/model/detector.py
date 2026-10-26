import os
import math
from pathlib import Path
import numpy as np
from ultralytics import YOLO

CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = CURRENT_DIR.parent / "yolo11n.pt"
MODEL_NAME = str(DEFAULT_MODEL_PATH) if DEFAULT_MODEL_PATH.exists() else "yolo11n.pt"

# Resolution and confidence optimized for dense public crowds and road pedestrian scenes
IMGSZ = 1280
CONFIDENCE = 0.08

# Load YOLO model
model = YOLO(MODEL_NAME)


class CrowdTracker:
    """
    Robust Dense Crowd Tracker.
    Unlike standard ByteTrack which suppresses 'unconfirmed' tracks in dense scenes,
    CrowdTracker preserves 100% of detected people, tracks their unique identities,
    and maintains trajectory persistence through brief occlusions.
    """
    def __init__(self, max_distance: float = 75.0, max_missed: int = 15):
        self.next_id = 1
        self.tracks = {}  # id -> {'center': (x, y), 'box': (x1, y1, x2, y2), 'conf': conf, 'missed': 0}
        self.max_distance = max_distance
        self.max_missed = max_missed

    def reset(self):
        self.next_id = 1
        self.tracks.clear()

    def update(self, detections):
        """
        detections: list of dicts [{'x1', 'y1', 'x2', 'y2', 'conf'}]
        Returns list of dicts with guaranteed 'id', 'x1', 'y1', 'x2', 'y2', 'conf'
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
            track_centers = [self.tracks[tid]['center'] for tid in track_ids]
            
            # Distance matrix between active tracks and current detections
            dists = np.zeros((len(track_ids), len(det_centers)), dtype=np.float32)
            for i, tc in enumerate(track_centers):
                for j, dc in enumerate(det_centers):
                    dists[i, j] = math.sqrt((tc[0] - dc[0])**2 + (tc[1] - dc[1])**2)

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
                    self.tracks[tid] = {
                        'center': det_centers[j],
                        'box': (d['x1'], d['y1'], d['x2'], d['y2']),
                        'conf': d['conf'],
                        'missed': 0
                    }
                    d['id'] = tid
                dists[i, :] = 999999.0
                dists[:, j] = 999999.0

        # Handle unassigned tracks
        for i, tid in enumerate(track_ids):
            if i not in assigned_tracks:
                self.tracks[tid]['missed'] += 1
                if self.tracks[tid]['missed'] > self.max_missed:
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
                    'missed': 0
                }
                d['id'] = tid

        return detections


tracker = CrowdTracker(max_distance=75.0, max_missed=15)


def reset_tracker():
    """Resets tracking memory between videos and streams."""
    tracker.reset()


def detect_people(image, conf: float = CONFIDENCE, imgsz: int = IMGSZ):
    """
    Detects and tracks people in a given frame with zero-drop crowd tracking.
    Guarantees every detected person is preserved, given a unique ID, and returned.
    """
    if image is None or not hasattr(image, "shape") or image.size == 0:
        return []

    # High-recall raw detection (retains all distant and small pedestrians)
    results = model.predict(
        image,
        classes=[0],
        conf=conf,
        imgsz=imgsz,
        verbose=False
    )

    detections = []
    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            confidence = float(box.conf[0]) if box.conf is not None else 0.0

            detections.append({
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "conf": round(confidence, 3)
            })

    # Associate persistent tracking IDs without discarding any detections
    tracked_people = tracker.update(detections)
    return tracked_people