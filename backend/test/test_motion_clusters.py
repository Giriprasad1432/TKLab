import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import cv2
from model.processor import CrowdAnalyzer

def test_stream():
    video_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'crowd.mp4')
    cap = cv2.VideoCapture(video_path)
    analyzer = CrowdAnalyzer(capacity=100, fps=30.0)
    for i in range(20):
        ret, frame = cap.read()
        if not ret:
            break
        res = analyzer.process_frame(frame, draw=False)
        if i % 5 == 0:
            print(f"--- Frame {i+1} ---")
            print(f"Total: {res['people_count']} | Separated: {res['separated_people_count']} | Clustered: {res['clustered_people_count']} (Packs: {len(res['clusters'])})")
            for c in res['clusters'][:3]:
                print(f"  Pack #{c['cluster_id']}: {c['people_count']} ppl | Level: {c['density_level']} | Speed: {c['speed_px_s']} px/s | Flow: {c['flow_angle']}° | Zone: {c['zone_id']} -> Pred: {c['predicted_zone']} (Surge: {c['predicted_surge']})")
    
    cap.release()
    summary = analyzer.get_summary()
    print("\n--- Session Summary ---")
    print(f"Peak People: {summary['people_count']}")
    print(f"Max Separated: {summary['max_separated_people']}")
    print(f"Max Clustered: {summary['max_clustered_people']}")
    print(f"Max Packs: {summary['max_clusters_count']}")
    print(f"Max Pack Size: {summary['max_pack_size']}")
    print(f"Peak Risk: {summary['risk_score']} ({summary['risk_level']})")

if __name__ == '__main__':
    test_stream()
