import cv2
import time
from ultralytics import YOLO

def main():
    video_path = "test/crowd.mp4"
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        print(f"Failed to open {video_path}")
        return

    # Skip to frame 50
    cap.set(cv2.CAP_PROP_POS_FRAMES, 50)
    ret, frame = cap.read()
    if not ret:
        print("Failed to read frame 50")
        return
        
    cap.release()

    model = YOLO("yolo11n.pt")
    print("--- BEFORE: Default parameters (imgsz=640, conf=default) ---")
    
    start = time.time()
    results_before = model.track(
        frame, persist=True, classes=[0], tracker="bytetrack.yaml", verbose=False
    )
    time_before = time.time() - start
    count_before = len(results_before[0].boxes) if results_before[0].boxes else 0
    fps_before = 1.0 / time_before if time_before > 0 else 0
    
    print(f"People count: {count_before}")
    print(f"Measured FPS: {fps_before:.1f} (Time: {time_before:.4f}s)")
    
    print("\n--- AFTER: Tuned for distant people (imgsz=960, conf=0.2) ---")
    start = time.time()
    results_after = model.track(
        frame, persist=True, classes=[0], conf=0.2, imgsz=960, tracker="bytetrack.yaml", verbose=False
    )
    time_after = time.time() - start
    count_after = len(results_after[0].boxes) if results_after[0].boxes else 0
    fps_after = 1.0 / time_after if time_after > 0 else 0
    
    print(f"People count: {count_after}")
    print(f"Measured FPS: {fps_after:.1f} (Time: {time_after:.4f}s)")

if __name__ == "__main__":
    main()
