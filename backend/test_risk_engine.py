import os
import sys
from pathlib import Path

# Add backend to path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent))

from model.processor import analyze_video

def test_capacities():
    video_path = Path(__file__).resolve().parent / "test" / "crowd.mp4"
    if not video_path.exists():
        video_path = Path("test/crowd.mp4")
    if not os.path.exists(str(video_path)):
        print(f"File not found: {video_path}")
        return
        
    capacities = [20, 8, 4]
    print(f"Testing risk engine on {video_path}...\n")
    
    for cap in capacities:
        print(f"--- Running batch analysis with capacity = {cap} ---")
        summary = analyze_video(str(video_path), cap)
        print(f"Max Risk Score reached: {summary['risk_score']}")
        print(f"Max Risk Level reached: {summary['risk_level']}")
        print(f"Peak Occupancy reached: {summary['occupancy']}% (with max {summary['people_count']} people)")
        print(f"Max Zone Percentage: {summary['max_zone_percentage']}%\n")

if __name__ == "__main__":
    test_capacities()
