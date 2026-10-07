import cv2
import math
import numpy as np
from collections import deque
from model.detector import detect_people
from model.density import calculate_density
from model.risk import calculate_risk

class CrowdAnalyzer:
    def __init__(self, capacity, fps=30):
        self.capacity = capacity
        self.fps = fps
        self.frame_count = 0
        
        self.history_frames = int(fps * 3) # 3 seconds rolling window
        self.person_history = {} # pid -> deque of (frame_idx, cx, cy)
        self.max_zone_people_history = deque(maxlen=self.history_frames)
        
        self.previous_average_speed = 0
        
        # Summary trackers for the batch analysis
        self.max_people_count = 0
        self.max_occupancy = 0
        self.max_average_speed = 0
        self.any_sudden_movement = False
        self.max_risk_score = 0
        self.final_risk_level = "SAFE"
        self.worst_zone_density = {f"zone_{i}": 0 for i in range(1, 10)}
        self.max_zone_people_overall = 0
        self.max_zone_percentage_overall = 0.0

    def process_frame(self, frame):
        self.frame_count += 1
        people = detect_people(frame)
        
        current_people_count = len(people)
        if current_people_count > self.max_people_count:
            self.max_people_count = current_people_count
            
        frame_height, frame_width = frame.shape[:2]
        density = calculate_density(people, self.capacity, frame_width, frame_height)
        
        if density["occupancy"] > self.max_occupancy:
            self.max_occupancy = density["occupancy"]
            
        if density["max_zone_people"] > self.max_zone_people_overall:
            self.max_zone_people_overall = density["max_zone_people"]
            self.max_zone_percentage_overall = density["max_zone_percentage"]
            self.worst_zone_density = density["zone_density"]
            
        # Record density history for "density_change" metric
        self.max_zone_people_history.append(density["max_zone_people"])
        density_change = density["max_zone_people"] - self.max_zone_people_history[0]
            
        # Clean up old tracks
        current_ids = set(p["id"] for p in people)
        for pid in list(self.person_history.keys()):
            if pid not in current_ids:
                del self.person_history[pid]
                
        speeds = []
        accelerations = []
        directions = []
        
        for person in people:
            pid = person["id"]
            center_x = (person["x1"] + person["x2"]) / 2
            center_y = (person["y1"] + person["y2"]) / 2
            
            if pid not in self.person_history:
                self.person_history[pid] = deque(maxlen=self.history_frames)
            
            history = self.person_history[pid]
            history.append((self.frame_count, center_x, center_y))
            
            if len(history) >= 2:
                # Compute instantaneous speeds in the history
                person_speeds = []
                for i in range(1, len(history)):
                    dx = history[i][1] - history[i-1][1]
                    dy = history[i][2] - history[i-1][2]
                    dt = (history[i][0] - history[i-1][0]) / self.fps
                    if dt > 0:
                        spd = math.sqrt(dx**2 + dy**2) / dt
                        person_speeds.append(spd)
                        
                if person_speeds:
                    avg_person_speed = np.mean(person_speeds)
                    speeds.append(avg_person_speed)
                    
                    if len(person_speeds) >= 2:
                        dt_window = (history[-1][0] - history[1][0]) / self.fps
                        if dt_window > 0:
                            accel = (person_speeds[-1] - person_speeds[0]) / dt_window
                            accelerations.append(accel)
                            
                # Net direction over the window
                dx_net = history[-1][1] - history[0][1]
                dy_net = history[-1][2] - history[0][2]
                # Only count direction if they moved a non-trivial amount (e.g. > 5 pixels)
                if math.sqrt(dx_net**2 + dy_net**2) > 5.0:
                    ang_net = math.degrees(math.atan2(dy_net, dx_net))
                    if ang_net < 0: 
                        ang_net += 360
                    directions.append(ang_net)
            
        # Aggregate Crowd Metrics
        average_speed = float(np.mean(speeds)) if speeds else 0.0
        speed_variance = float(np.var(speeds)) if speeds else 0.0
        average_acceleration = float(np.mean(accelerations)) if accelerations else 0.0
        
        dominant_direction = 0.0
        direction_consistency = 0.0
        collective_movement_percentage = 0.0
        
        if directions:
            # 8 directional bins
            hist, bin_edges = np.histogram(directions, bins=8, range=(0, 360))
            max_bin = np.argmax(hist)
            dominant_direction = float((bin_edges[max_bin] + bin_edges[max_bin+1]) / 2)
            
            consistency = hist[max_bin] / len(directions)
            direction_consistency = float(consistency)
            collective_movement_percentage = float(consistency * 100)
            
        if average_speed > self.max_average_speed:
            self.max_average_speed = average_speed
            
        speed_change = average_speed - self.previous_average_speed
        sudden_movement = (self.previous_average_speed > 0 and speed_change > 100)
        
        if sudden_movement:
            self.any_sudden_movement = True
            
        risk = calculate_risk(density["occupancy"], average_speed, sudden_movement)
        
        if risk["score"] > self.max_risk_score:
            self.max_risk_score = risk["score"]
            self.final_risk_level = risk["level"]
            
        self.previous_average_speed = average_speed
        
        return {
            "people_count": current_people_count,
            "occupancy": density["occupancy"],
            "capacity_status": density["status"],
            "zone_density": density["zone_density"],
            "max_zone_people": density["max_zone_people"],
            "max_zone_percentage": density["max_zone_percentage"],
            "average_speed": round(average_speed, 1),
            "sudden_movement": sudden_movement,
            "risk_score": risk["score"],
            "risk_level": risk["level"],
            "average_acceleration": round(average_acceleration, 2),
            "dominant_direction": round(dominant_direction, 1),
            "direction_consistency": round(direction_consistency, 2),
            "collective_movement_percentage": round(collective_movement_percentage, 1),
            "density_change": float(density_change),
            "speed_variance": round(speed_variance, 2)
        }

    def get_summary(self):
        return {
            "people_count": self.max_people_count,
            "occupancy": self.max_occupancy,
            "capacity_status": "N/A",  # Just a placeholder for batch summary
            "zone_density": self.worst_zone_density,
            "max_zone_people": self.max_zone_people_overall,
            "max_zone_percentage": self.max_zone_percentage_overall,
            "average_speed": round(self.max_average_speed, 1),
            "sudden_movement": self.any_sudden_movement,
            "risk_score": self.max_risk_score,
            "risk_level": self.final_risk_level,
            # We add 0 for temporal features in the batch summary
            "average_acceleration": 0.0,
            "dominant_direction": 0.0,
            "direction_consistency": 0.0,
            "collective_movement_percentage": 0.0,
            "density_change": 0.0,
            "speed_variance": 0.0
        }

def analyze_video(video_path, capacity):
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        raise Exception("Could not open video")
        
    fps = video.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30
        
    analyzer = CrowdAnalyzer(capacity=capacity, fps=fps)

    while True:
        ret, frame = video.read()
        if not ret:
            break
            
        analyzer.process_frame(frame)
        
    video.release()
    return analyzer.get_summary()
