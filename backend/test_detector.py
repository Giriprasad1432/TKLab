import cv2
import os
import sys
from pathlib import Path

# Add backend directory to path if running directly
sys.path.insert(0, str(Path(__file__).resolve().parent))

from model.processor import CrowdAnalyzer
from model.detector import reset_tracker

def run_visual_detector():
    video_path = Path(__file__).resolve().parent / "test" / "crowd.mp4"
    if not video_path.exists():
        video_path = Path("test/crowd.mp4")
        
    video = cv2.VideoCapture(str(video_path))
    if not video.isOpened():
        print(f"ERROR: Could not open video file at {video_path}")
        return

    fps = video.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0

    capacity = 20
    reset_tracker()
    analyzer = CrowdAnalyzer(capacity=capacity, fps=fps)

    cv2.namedWindow("TKLab - Crowd & Stampede Detection", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("TKLab - Crowd & Stampede Detection", 1280, 720)

    print("==================================================")
    print("TKLab Crowd Detector Running")
    print("Controls:")
    print("  'q' - Exit")
    print("  'r' - Restart video")
    print("  '+' / '=' - Increase capacity")
    print("  '-' - Decrease capacity")
    print("==================================================")

    while True:
        ret, frame = video.read()
        if not ret:
            # Rewind video for continuous display
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)
            ret, frame = video.read()
            if not ret:
                break

        metrics = analyzer.process_frame(frame, draw=True)
        h, w = frame.shape[:2]

        # HUD Panel (semi-transparent dark overlay on top-left)
        overlay = frame.copy()
        cv2.rectangle(overlay, (15, 15), (410, 345), (20, 20, 25), -1)
        cv2.addWeighted(overlay, 0.75, frame, 0.25, 0, frame)
        cv2.rectangle(frame, (15, 15), (410, 345), (60, 60, 75), 1)

        # Header
        cv2.putText(frame, "TKLab Crowd HUD", (30, 42), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)

        # Risk Badge
        risk_color = (0, 255, 0) if metrics["risk_level"] == "SAFE" else ((0, 215, 255) if metrics["risk_level"] == "WARNING" else (0, 0, 255))
        cv2.putText(frame, f"RISK: {metrics['risk_level']} ({metrics['risk_score']}/100)", (30, 75), cv2.FONT_HERSHEY_SIMPLEX, 0.65, risk_color, 2, cv2.LINE_AA)

        # Key Metrics
        y = 105
        spacing = 23
        info_lines = [
            f"People: {metrics['people_count']}  |  Capacity: {analyzer.capacity}",
            f"Occupancy: {metrics['occupancy']}% [{metrics['capacity_status']}]",
            f"Max Zone Count: {metrics['max_zone_people']} ({metrics['max_zone_percentage']}%)",
            f"Cluster Anomaly: {'YES (' + metrics['isolated_cluster_zone'].upper() + ')' if metrics.get('isolated_cluster_detected') else 'NO'}",
            f"Commotion / Scuffle: {metrics.get('commotion_level', 'NORMAL')} (Score: {metrics.get('commotion_score', 0):.2f})",
            f"Avg Speed: {metrics['average_speed']:.3f} d/s",
            f"Acceleration: {metrics['average_acceleration']:.3f}",
            f"Direction: {metrics['dominant_direction']:.0f} deg (Consist: {metrics['direction_consistency']*100:.0f}%)",
            f"Collective Movement: {metrics['collective_movement_percentage']:.1f}%",
            f"Sudden Movement: {'YES' if metrics['sudden_movement'] else 'NO'}"
        ]


        for line in info_lines:
            cv2.putText(frame, line, (30, y), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (220, 220, 220), 1, cv2.LINE_AA)
            y += spacing

        # Active Risk Factors
        if metrics["risk_factors"]:
            top_reason = metrics["risk_factors"][0]["reason"]
            cv2.putText(frame, f"Alert: {top_reason[:38]}", (30, y + 5), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 165, 255), 1, cv2.LINE_AA)

        cv2.imshow("TKLab - Crowd & Stampede Detection", frame)

        key = cv2.waitKey(25) & 0xFF
        if key == ord('q'):
            break
        elif key == ord('r'):
            video.set(cv2.CAP_PROP_POS_FRAMES, 0)
        elif key in (ord('+'), ord('=')):
            analyzer.capacity += 5
            print(f"Capacity increased to {analyzer.capacity}")
        elif key == ord('-'):
            analyzer.capacity = max(1, analyzer.capacity - 5)
            print(f"Capacity decreased to {analyzer.capacity}")

    video.release()
    cv2.destroyAllWindows()

if __name__ == "__main__":
    run_visual_detector()