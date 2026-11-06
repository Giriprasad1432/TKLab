#!/usr/bin/env python3
"""
TKLab Automated Pre-Flight System Verification Script
Runs a full end-to-end sanity check on AI models, risk calculation, 
3x3 directional sectors, and video pipeline before presentations/submission.
"""

import sys
import time
from pathlib import Path

# Add backend directory to path
sys.path.insert(0, str(Path(__file__).resolve().parent))

def run_preflight_check():
    print("=" * 65)
    print("      TKLab Automated Pre-Flight System Verification      ")
    print("=" * 65)
    errors = []

    # 1. Check Model Weights
    backend_dir = Path(__file__).resolve().parent
    model_path = backend_dir / "yolo11n.pt"
    print(f"\n[1/5] Checking YOLOv11 Weights: {model_path.name}...")
    if model_path.exists() and model_path.stat().st_size > 1000000:
        print(f"      [OK] Model weights found ({model_path.stat().st_size / (1024*1024):.2f} MB)")
    else:
        errors.append(f"Model file missing or corrupted at {model_path}")
        print("      [FAIL] Model weights missing!")

    # 2. Check Benchmark Videos
    test_dir = backend_dir / "test"
    print("\n[2/5] Checking Benchmark Video Assets...")
    expected_videos = ["crowd.mp4", "crowd2.mp4", "crowd3.mp4", "mot20_crowd.mp4"]
    for v in expected_videos:
        vp = test_dir / v
        if vp.exists() and vp.stat().st_size > 500000:
            print(f"      [OK] Video found: {v} ({vp.stat().st_size / (1024*1024):.1f} MB)")
        else:
            errors.append(f"Missing video asset: {v}")
            print(f"      [FAIL] Video missing: {v}")

    # 3. Test OpenCV Video Loading & First Frame
    print("\n[3/5] Testing Video Stream Ingestion (OpenCV)...")
    try:
        import cv2
        sample_vid = str(test_dir / "crowd.mp4")
        cap = cv2.VideoCapture(sample_vid)
        if cap.isOpened():
            ret, frame = cap.read()
            cap.release()
            if ret and frame is not None and frame.size > 0:
                h, w = frame.shape[:2]
                print(f"      [OK] Frame decoded successfully ({w}x{h} px)")
            else:
                errors.append("Could not decode frame from crowd.mp4")
                print("      [FAIL] Frame read returned empty")
        else:
            errors.append("Could not open sample video crowd.mp4")
            print("      [FAIL] VideoCapture failed to open")
    except Exception as e:
        errors.append(f"OpenCV test error: {e}")
        print(f"      [FAIL] OpenCV exception: {e}")

    # 4. Test YOLOv11 Person Detector & Tracking
    print("\n[4/5] Testing YOLOv11 Crowd Inference & Tracking...")
    try:
        from model.detector import detect_people, reset_tracker
        reset_tracker()
        start = time.time()
        people = detect_people(frame, conf=0.10, imgsz=960)
        dur = time.time() - start
        print(f"      [OK] Detected {len(people)} pedestrians in {dur:.2f}s ({1.0/dur:.1f} FPS)")
    except Exception as e:
        errors.append(f"Detector test error: {e}")
        print(f"      [FAIL] Detector exception: {e}")

    # 5. Test Density Clustering, 3x3 Sectors & Risk Engine
    print("\n[5/5] Testing 3x3 Spatial Sectors & Risk Evaluation...")
    try:
        from model.density import calculate_density
        from model.risk import calculate_risk
        density = calculate_density(people, capacity=20, frame_width=w, frame_height=h)
        risk = calculate_risk(
            occupancy=density["occupancy"],
            capacity=20,
            max_zone_people=density["max_zone_people"],
            max_zone_percentage=density["max_zone_percentage"],
            density_change=0,
            average_speed=25.0,
            average_acceleration=2.0,
            direction_consistency=0.7,
            collective_movement_percentage=70.0,
            clusters=density.get("clusters", [])
        )
        print(f"      [OK] Occupancy: {density['occupancy']:.1f}% ({density['status']})")
        print(f"      [OK] Peak Sector: {density['max_zone_id']} with {density['max_zone_people']} occupants")
        print(f"      [OK] Crowd Packs: {len(density.get('clusters', []))} identified")
        print(f"      [OK] Safety Risk Score: {risk['score']}/100 [{risk['level']}]")
    except Exception as e:
        errors.append(f"Risk engine test error: {e}")
        print(f"      [FAIL] Risk engine exception: {e}")

    # Final Summary
    print("\n" + "=" * 65)
    if not errors:
        print("  >>> [ALL PRE-FLIGHT CHECKS PASSED - SYSTEM READY TO PRESENT] <<<")
        print("=" * 65)
        return True
    else:
        print(f"  >>> [{len(errors)} CHECKS FAILED] <<<")
        for err in errors:
            print(f"  • {err}")
        print("=" * 65)
        return False

if __name__ == "__main__":
    success = run_preflight_check()
    sys.exit(0 if success else 1)

