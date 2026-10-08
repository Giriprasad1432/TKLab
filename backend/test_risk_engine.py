from model.processor import analyze_video
import os

def test_capacities():
    video_path = "test/crowd.mp4"
    if not os.path.exists(video_path):
        print(f"File not found: {video_path}")
        return
        
    capacities = [20, 8, 4]
    print(f"Testing risk engine on {video_path}...\n")
    
    for cap in capacities:
        print(f"--- Running batch analysis with capacity = {cap} ---")
        summary = analyze_video(video_path, cap)
        print(f"Max Risk Score reached: {summary['risk_score']}")
        print(f"Max Risk Level reached: {summary['risk_level']}")
        print(f"Peak Occupancy reached: {summary['occupancy']}% (with max {summary['people_count']} people)")
        print(f"Max Zone Percentage: {summary['max_zone_percentage']}%\n")

if __name__ == "__main__":
    test_capacities()
