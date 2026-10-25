import os
from pathlib import Path
from ultralytics import YOLO

CURRENT_DIR = Path(__file__).resolve().parent
DEFAULT_MODEL_PATH = CURRENT_DIR.parent / "yolo11n.pt"
MODEL_NAME = str(DEFAULT_MODEL_PATH) if DEFAULT_MODEL_PATH.exists() else "yolo11n.pt"
TRACKER_PATH = CURRENT_DIR / "crowd_tracker.yaml"
TRACKER_CONFIG = str(TRACKER_PATH) if TRACKER_PATH.exists() else "bytetrack.yaml"

# 1280 preserves full native width resolution for distant pedestrians at frame borders
IMGSZ = 1280
# 0.12 captures faint/distant small-head pedestrians without false positive noise
CONFIDENCE = 0.12

# Load YOLO model
model = YOLO(MODEL_NAME)


def reset_tracker():
    """Resets the internal tracker state so previous video tracks don't bleed into new sessions."""
    try:
        if hasattr(model, "predictor") and model.predictor is not None:
            if hasattr(model.predictor, "trackers"):
                delattr(model.predictor, "trackers")
    except Exception:
        pass



def detect_people(image, conf: float = CONFIDENCE, imgsz: int = IMGSZ):
    """
    Detects and tracks people in a given frame.
    Returns a list of dicts with person id, bounding box, and confidence.
    """
    if image is None or not hasattr(image, "shape") or image.size == 0:
        return []

    # Track people across frames using crowd-tuned tracker
    results = model.track(
        image,
        persist=True,
        classes=[0],
        conf=conf,
        imgsz=imgsz,
        tracker=TRACKER_CONFIG,
        verbose=False
    )


    people = []

    for result in results:
        if result.boxes is None:
            continue

        for box in result.boxes:
            # Person ID (-1 if untracked)
            if box.id is not None:
                person_id = int(box.id[0])
            else:
                person_id = -1

            # Bounding box
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            # Confidence score
            confidence = float(box.conf[0]) if box.conf is not None else 0.0

            people.append({
                "id": person_id,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2,
                "conf": round(confidence, 3)
            })

    return people