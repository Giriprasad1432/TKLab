import cv2
import math
import numpy as np
from collections import deque
from model.detector import detect_people, reset_tracker
from model.density import calculate_density
from model.risk import calculate_risk

class CrowdAnalyzer:
    def __init__(self, capacity: int = 20, fps: float = 30.0):
        self.capacity = max(1, capacity)
        self.fps = max(1.0, float(fps))
        self.frame_count = 0
        
        self.history_frames = int(self.fps * 3)  # 3 seconds rolling window
        self.max_missed_frames = int(self.fps * 1.5)  # 1.5 seconds retention grace period
        
        self.person_history = {}    # pid -> deque of (frame_idx, cx, cy)
        self.person_last_seen = {}  # pid -> last seen frame_idx
        self.max_zone_people_history = deque(maxlen=self.history_frames)
        
        self.previous_average_speed = 0.0
        
        # Summary trackers across session
        self.max_people_count = 0
        self.max_occupancy = 0.0
        self.max_average_speed = 0.0
        self.max_average_acceleration = 0.0
        self.max_direction_consistency = 0.0
        self.max_collective_movement_percentage = 0.0
        self.max_density_change = 0.0
        self.max_speed_variance = 0.0
        self.dominant_direction_at_peak = 0.0
        self.any_sudden_movement = False
        self.smoothed_risk_score = 0.0
        self.max_risk_score = 0
        self.final_risk_level = "SAFE"
        self.worst_zone_density = {f"zone_{i}": 0 for i in range(1, 10)}
        self.max_zone_people_overall = 0
        self.max_zone_percentage_overall = 0.0
        self.peak_risk_factors = []

    def process_frame(self, frame, draw: bool = False):
        self.frame_count += 1
        people = detect_people(frame)
        
        current_people_count = len(people)
        if current_people_count > self.max_people_count:
            self.max_people_count = current_people_count
            
        frame_height, frame_width = frame.shape[:2]
        diag = math.sqrt(frame_width**2 + frame_height**2)
        if diag <= 0:
            diag = 1.0
            
        density = calculate_density(people, self.capacity, frame_width, frame_height)
        
        if density["occupancy"] > self.max_occupancy:
            self.max_occupancy = density["occupancy"]
            
        if density["max_zone_people"] > self.max_zone_people_overall:
            self.max_zone_people_overall = density["max_zone_people"]
            self.max_zone_percentage_overall = density["max_zone_percentage"]
            self.worst_zone_density = density["zone_density"]
            
        # Record density history for "density_change" metric
        self.max_zone_people_history.append(density["max_zone_people"])
        density_change = max(0.0, float(density["max_zone_people"] - self.max_zone_people_history[0]))
        if density_change > self.max_density_change:
            self.max_density_change = density_change
            
        # Clean up tracks that have been absent beyond grace period
        for pid in list(self.person_history.keys()):
            if self.frame_count - self.person_last_seen.get(pid, 0) > self.max_missed_frames:
                del self.person_history[pid]
                self.person_last_seen.pop(pid, None)
                
        speeds = []
        accelerations = []
        directions = []
        tortuosities = []
        
        for person in people:
            pid = person.get("id", -1)
            # Do NOT group untracked IDs (-1) together
            if pid < 0:
                continue
                
            center_x = (person["x1"] + person["x2"]) / 2.0
            center_y = (person["y1"] + person["y2"]) / 2.0
            
            self.person_last_seen[pid] = self.frame_count
            
            if pid not in self.person_history:
                self.person_history[pid] = deque(maxlen=self.history_frames)
            
            history = self.person_history[pid]
            history.append((self.frame_count, center_x, center_y))
            
            if len(history) >= 2:
                # Compute instantaneous speeds in the trajectory
                person_speeds = []
                path_distance = 0.0
                for i in range(1, len(history)):
                    dx = history[i][1] - history[i-1][1]
                    dy = history[i][2] - history[i-1][2]
                    seg_dist = math.sqrt(dx**2 + dy**2)
                    path_distance += seg_dist
                    dt = (history[i][0] - history[i-1][0]) / self.fps
                    if dt > 0:
                        spd = (seg_dist / diag) / dt
                        person_speeds.append(spd)
                        
                if person_speeds:
                    avg_person_speed = float(np.mean(person_speeds))
                    speeds.append(avg_person_speed)
                    
                    if len(person_speeds) >= 2:
                        dt_window = (history[-1][0] - history[0][0]) / self.fps
                        if dt_window > 0:
                            accel = (person_speeds[-1] - person_speeds[0]) / dt_window
                            accelerations.append(float(accel))
                            
                # Net direction over the active window
                dx_net = history[-1][1] - history[0][1]
                dy_net = history[-1][2] - history[0][2]
                net_disp = math.sqrt(dx_net**2 + dy_net**2)
                
                # Movement Tortuosity (ratio of path traveled to net progress)
                # Walking straight = 1.0 - 1.3, fighting/scuffling in place >= 2.5 - 4.0
                if len(history) >= 4 and path_distance > 8.0:
                    tortuosity = path_distance / (net_disp + 1.5)
                    tortuosities.append(tortuosity)

                # Filter out jitter/micro-shifts (< 6 pixels)
                if net_disp > 6.0:
                    ang_net = math.degrees(math.atan2(dy_net, dx_net))
                    if ang_net < 0: 
                        ang_net += 360.0
                    directions.append(ang_net)
            
        # Aggregate Crowd Metrics
        average_speed = float(np.mean(speeds)) if speeds else 0.0
        speed_variance = float(np.var(speeds)) if speeds else 0.0
        average_acceleration = float(np.mean(accelerations)) if accelerations else 0.0
        avg_tortuosity = float(np.mean(tortuosities)) if tortuosities else 1.0
        
        dominant_direction = 0.0
        direction_consistency = 0.0
        collective_movement_percentage = 0.0
        
        if directions:
            # 8 directional bins
            hist, bin_edges = np.histogram(directions, bins=8, range=(0, 360))
            max_bin = int(np.argmax(hist))
            dominant_direction = float((bin_edges[max_bin] + bin_edges[max_bin+1]) / 2.0)
            
            consistency = float(hist[max_bin] / len(directions))
            direction_consistency = consistency
            collective_movement_percentage = consistency * 100.0

        # Commotion & Violent Agitation Analysis
        # Combines high path tortuosity (back-and-forth grappling), directional clashes, and velocity bursts
        tortuosity_score = min(1.0, max(0.0, (avg_tortuosity - 1.4) / 2.2))
        turbulence_score = min(1.0, max(0.0, (average_speed * 12.0) * (1.0 - direction_consistency)))
        kinetic_accel = min(1.0, abs(average_acceleration) * 5.0)
        
        commotion_score = round(0.40 * tortuosity_score + 0.35 * turbulence_score + 0.25 * kinetic_accel, 2)
        if commotion_score >= 0.65:
            commotion_level = "CRITICAL"
        elif commotion_score >= 0.40:
            commotion_level = "ELEVATED"
        else:
            commotion_level = "NORMAL"
            
        if average_speed > self.max_average_speed:
            self.max_average_speed = average_speed
            
        if abs(average_acceleration) > abs(self.max_average_acceleration):
            self.max_average_acceleration = average_acceleration
            
        if direction_consistency > self.max_direction_consistency:
            self.max_direction_consistency = direction_consistency
            self.dominant_direction_at_peak = dominant_direction
            
        if collective_movement_percentage > self.max_collective_movement_percentage:
            self.max_collective_movement_percentage = collective_movement_percentage
            
        if speed_variance > self.max_speed_variance:
            self.max_speed_variance = speed_variance
            
        speed_change = average_speed - self.previous_average_speed
        sudden_movement = bool(
            (self.previous_average_speed > 0 and speed_change > 0.08) or
            (abs(average_acceleration) > 0.15) or
            (commotion_level in ("ELEVATED", "CRITICAL"))
        )
        
        if sudden_movement:
            self.any_sudden_movement = True

        isolated_cluster = density.get("isolated_cluster", False)
        max_zone_id = density.get("max_zone_id", "zone_1")
            
        raw_risk = calculate_risk(
            occupancy=density["occupancy"], 
            capacity=self.capacity,
            max_zone_people=density["max_zone_people"],
            max_zone_percentage=density["max_zone_percentage"], 
            density_change=density_change, 
            average_speed=average_speed, 
            average_acceleration=average_acceleration, 
            direction_consistency=direction_consistency, 
            collective_movement_percentage=collective_movement_percentage,
            commotion_score=commotion_score,
            isolated_cluster=isolated_cluster,
            max_zone_id=max_zone_id
        )

        
        current_score = raw_risk["score"]
        # Fast attack, smooth decay
        if current_score >= self.smoothed_risk_score:
            self.smoothed_risk_score = 0.75 * current_score + 0.25 * self.smoothed_risk_score
        else:
            self.smoothed_risk_score = 0.15 * current_score + 0.85 * self.smoothed_risk_score
            
        final_score = int(round(self.smoothed_risk_score))
        if final_score < 30:
            final_level = "SAFE"
        elif final_score < 60:
            final_level = "WARNING"
        else:
            final_level = "CRITICAL"
        
        if final_score >= self.max_risk_score:
            self.max_risk_score = final_score
            self.final_risk_level = final_level
            if raw_risk["factors"]:
                self.peak_risk_factors = raw_risk["factors"]
            
        self.previous_average_speed = average_speed
        
        # High quality visualization overlay
        if draw:
            zone_w = int(frame_width / 3)
            zone_h = int(frame_height / 3)
            # Grid
            for i in range(1, 3):
                cv2.line(frame, (i * zone_w, 0), (i * zone_w, frame_height), (120, 120, 120), 1, cv2.LINE_AA)
                cv2.line(frame, (0, i * zone_h), (frame_width, i * zone_h), (120, 120, 120), 1, cv2.LINE_AA)
            
            # Highlight isolated cluster zone if detected
            if isolated_cluster:
                # determine zone row & col
                try:
                    z_idx = int(max_zone_id.split("_")[1]) - 1
                    z_r, z_c = z_idx // 3, z_idx % 3
                    zx1, zy1 = z_c * zone_w, z_r * zone_h
                    zx2, zy2 = zx1 + zone_w, zy1 + zone_h
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (zx1, zy1), (zx2, zy2), (0, 165, 255), -1)
                    cv2.addWeighted(overlay, 0.25, frame, 0.75, 0, frame)
                    cv2.rectangle(frame, (zx1, zy1), (zx2, zy2), (0, 165, 255), 2)
                    cv2.putText(frame, f"DENSE CLUSTER ({max_zone_people})", (zx1 + 10, zy1 + 25), cv2.FONT_HERSHEY_SIMPLEX, 0.55, (0, 220, 255), 2, cv2.LINE_AA)
                except Exception:
                    pass

            # Highlight commotion / scuffle alert banner
            if commotion_level != "NORMAL":
                comm_color = (0, 0, 255) if commotion_level == "CRITICAL" else (0, 165, 255)
                cv2.rectangle(frame, (frame_width // 4, 10), (frame_width * 3 // 4, 45), (10, 10, 20), -1)
                cv2.rectangle(frame, (frame_width // 4, 10), (frame_width * 3 // 4, 45), comm_color, 2)
                cv2.putText(frame, f"! COMMOTION / FIGHT ALERT ({commotion_level}) !", (frame_width // 4 + 20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.65, comm_color, 2, cv2.LINE_AA)

            # Draw tracking trail & detections
            for p in people:
                pid = p.get("id", -1)
                color = (0, 255, 0) if final_level == "SAFE" else ((0, 215, 255) if final_level == "WARNING" else (0, 0, 255))
                cv2.rectangle(frame, (p["x1"], p["y1"]), (p["x2"], p["y2"]), color, 2)
                
                label = f"ID:{pid}" if pid >= 0 else "person"
                cv2.putText(frame, label, (p["x1"], max(18, p["y1"]-6)), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1, cv2.LINE_AA)
                
                # Draw motion trail if history exists
                if pid in self.person_history and len(self.person_history[pid]) >= 2:
                    pts = np.array([(int(pt[1]), int(pt[2])) for pt in self.person_history[pid]], np.int32)
                    cv2.polylines(frame, [pts], isClosed=False, color=(255, 200, 0), thickness=1, lineType=cv2.LINE_AA)

        return {
            "people_count": current_people_count,
            "occupancy": float(density["occupancy"]),
            "capacity_status": density["status"],
            "zone_density": density["zone_density"],
            "max_zone_people": density["max_zone_people"],
            "max_zone_percentage": density["max_zone_percentage"],
            "average_speed": round(average_speed, 3),
            "sudden_movement": sudden_movement,
            "risk_score": final_score,
            "risk_level": final_level,
            "risk_factors": raw_risk["factors"],
            "average_acceleration": round(average_acceleration, 3),
            "dominant_direction": round(dominant_direction, 1),
            "direction_consistency": round(direction_consistency, 2),
            "collective_movement_percentage": round(collective_movement_percentage, 1),
            "density_change": round(density_change, 1),
            "speed_variance": round(speed_variance, 3),
            "isolated_cluster_detected": isolated_cluster,
            "isolated_cluster_zone": max_zone_id,
            "commotion_level": commotion_level,
            "commotion_score": commotion_score,
            "avg_tortuosity": round(avg_tortuosity, 2)
        }

    def get_summary(self):
        # Derive true capacity status from peak occupancy
        if self.max_occupancy < 80:
            cap_status = "NORMAL"
        elif self.max_occupancy <= 100:
            cap_status = "NEAR_CAPACITY"
        else:
            cap_status = "OVER_CAPACITY"

        return {
            "people_count": self.max_people_count,
            "occupancy": round(self.max_occupancy, 1),
            "capacity_status": cap_status,
            "zone_density": self.worst_zone_density,
            "max_zone_people": self.max_zone_people_overall,
            "max_zone_percentage": self.max_zone_percentage_overall,
            "average_speed": round(self.max_average_speed, 3),
            "sudden_movement": self.any_sudden_movement,
            "risk_score": self.max_risk_score,
            "risk_level": self.final_risk_level,
            "risk_factors": self.peak_risk_factors,
            "average_acceleration": round(self.max_average_acceleration, 3),
            "dominant_direction": round(self.dominant_direction_at_peak, 1),
            "direction_consistency": round(self.max_direction_consistency, 2),
            "collective_movement_percentage": round(self.max_collective_movement_percentage, 1),
            "density_change": round(self.max_density_change, 1),
            "speed_variance": round(self.max_speed_variance, 3)
        }



def analyze_video(video_path: str, capacity: int = 20, sample_fps: int = 15):
    """
    Analyzes an uploaded video file, computing full crowd metrics and safety risk.
    Uses smart frame-stride sampling for responsive batch performance.
    """
    reset_tracker()
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        raise ValueError(f"Could not open video file: {video_path}")
        
    native_fps = video.get(cv2.CAP_PROP_FPS)
    if native_fps <= 0:
        native_fps = 30.0
        
    total_video_frames = int(video.get(cv2.CAP_PROP_FRAME_COUNT))
    
    # Calculate sampling stride to maintain fast inference while preserving motion physics
    stride = 1
    effective_fps = native_fps
    if native_fps > sample_fps and sample_fps > 0:
        stride = max(1, round(native_fps / sample_fps))
        effective_fps = native_fps / stride
        
    analyzer = CrowdAnalyzer(capacity=capacity, fps=effective_fps)

    import time
    start_time = time.time()
    
    frame_idx = 0
    while True:
        ret, frame = video.read()
        if not ret:
            break
            
        if frame_idx % stride == 0:
            analyzer.process_frame(frame, draw=False)
            
        frame_idx += 1
        
    video.release()
    
    total_time = time.time() - start_time
    summary = analyzer.get_summary()
    
    summary["fps"] = round(analyzer.frame_count / total_time, 1) if total_time > 0 and analyzer.frame_count > 0 else 0.0
    summary["total_frames"] = total_video_frames if total_video_frames > 0 else frame_idx
    summary["processed_frames"] = analyzer.frame_count
    summary["duration_seconds"] = round(total_video_frames / native_fps, 2) if total_video_frames > 0 else 0.0
        
    return summary
