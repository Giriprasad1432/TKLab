def calculate_risk(
    occupancy,
    capacity,
    max_zone_people,
    max_zone_percentage,
    density_change,
    average_speed,
    average_acceleration,
    direction_consistency,
    collective_movement_percentage,
    commotion_score: float = 0.0,
    isolated_cluster: bool = False,
    max_zone_id: str = "zone_1",
    clusters: list = None,
    predicted_surges: list = None
):
    score = 0
    factors = []

    # 1. Occupancy contribution (0 below 60%, ramp up to +30 at 100%, up to +45 at 150%+)
    if occupancy >= 150:
        occ_score = 45
    elif occupancy >= 100:
        occ_score = 30 + 15 * ((occupancy - 100) / 50)
    elif occupancy >= 60:
        occ_score = 30 * ((occupancy - 60) / 40)
    else:
        occ_score = 0
        
    occ_score = int(min(45, occ_score))
    if occ_score > 0:
        reason = (
            f"Critical over-capacity ({int(occupancy)}% of venue capacity)"
            if occupancy >= 100
            else f"Elevated occupancy ({int(occupancy)}% of venue capacity)"
        )
        factors.append({"factor": "occupancy", "score": occ_score, "reason": reason})

    # 2. Max zone concentration (up to +25)
    zone_score = 0
    max_zone_relative_to_cap = (max_zone_people / capacity) * 100 if capacity > 0 else 0
    if max_zone_relative_to_cap >= 50:
        zone_score += 15
    elif max_zone_relative_to_cap >= 30:
        zone_score += 10
    elif max_zone_relative_to_cap >= 20:
        zone_score += 5
        
    if max_zone_percentage >= 50:
        zone_score += 10
    elif max_zone_percentage >= 30:
        zone_score += 5
        
    zone_score = min(25, zone_score)
    if zone_score > 0:
        score += zone_score
        factors.append({
            "factor": "zone_concentration",
            "score": zone_score,
            "reason": f"High crowd concentration in single zone ({max_zone_percentage:.0f}% of crowd)"
        })

    # 3. Isolated Dense Gathering (surroundings clear, but tight clump in one region)
    if isolated_cluster:
        clump_score = 15
        score += clump_score
        clean_zone = max_zone_id.replace("_", " ").title()
        factors.append({
            "factor": "isolated_cluster",
            "score": clump_score,
            "reason": f"Abnormal localized gathering in {clean_zone} ({max_zone_people} people) despite clear venue"
        })

    # 4. Crowd Pack Density Compression (evaluates dense clusters directly)
    if clusters:
        critical_clusters = [c for c in clusters if c.get("density_level") == "CRITICAL"]
        high_clusters = [c for c in clusters if c.get("density_level") == "HIGH"]
        
        if critical_clusters:
            comp_score = 20
            score += comp_score
            c = critical_clusters[0]
            factors.append({
                "factor": "cluster_compression",
                "score": comp_score,
                "reason": f"Severe physical crowd compression in Pack #{c.get('cluster_id', 1)} ({c.get('people_count')} people, density index {c.get('density_index')})"
            })
        elif high_clusters:
            comp_score = 10
            score += comp_score
            c = high_clusters[0]
            factors.append({
                "factor": "cluster_compression",
                "score": comp_score,
                "reason": f"Elevated crowd packing density in Pack #{c.get('cluster_id', 1)} ({c.get('people_count')} people)"
            })

    # 5. Predictive Bottleneck Surges (forecasting crowd flow towards congested zones)
    if predicted_surges:
        surge_score = 15
        score += surge_score
        s = predicted_surges[0]
        target_name = str(s.get("target_zone", "")).replace("_", " ").title()
        factors.append({
            "factor": "predictive_bottleneck_surge",
            "score": surge_score,
            "reason": f"Predictive flow surge: Crowd pack of {s.get('people_count')} marching toward {target_name} (ETA ~{s.get('eta_seconds', 3)}s)"
        })

    # 6. Density surge change (up to +10)
    dc_score = 0
    if density_change >= 5:
        dc_score = min(10, int(density_change))
    if dc_score > 0:
        score += dc_score
        factors.append({
            "factor": "density_change",
            "score": dc_score,
            "reason": f"Rapid crowd density surge (+{int(density_change)} people)"
        })

    # 7. Violent Commotion / Scuffle / Fight Anomaly
    if commotion_score >= 0.65:
        comm_score = 25
        score += comm_score
        factors.append({
            "factor": "violent_commotion",
            "score": comm_score,
            "reason": "Intense erratic movement & opposing velocity turbulence (potential fight/scuffle)"
        })
    elif commotion_score >= 0.40:
        comm_score = 15
        score += comm_score
        factors.append({
            "factor": "violent_commotion",
            "score": comm_score,
            "reason": "Elevated movement agitation & localized directional clash"
        })

    # 8. Directional Motion & Stampede Panic Rush (up to +30)
    motion_score = 0
    if occupancy >= 50 or collective_movement_percentage >= 60:
        if average_speed >= 0.2:
            motion_score += 10
        elif average_speed >= 0.1:
            motion_score += 5
            
        accel_mag = abs(average_acceleration)
        if accel_mag >= 0.1:
            motion_score += 10
        elif accel_mag >= 0.05:
            motion_score += 5
            
        if collective_movement_percentage >= 60:
            motion_score += 10
        elif collective_movement_percentage >= 40:
            motion_score += 5
            
    motion_score = min(30, motion_score)
    if motion_score > 0:
        score += motion_score
        factors.append({
            "factor": "motion_indicators",
            "score": motion_score,
            "reason": "Concerning crowd movement & velocity patterns"
        })

    # Limit total score to [0, 100]
    score = max(0, min(100, score))

    # Risk level categorization
    if score < 30:
        level = "SAFE"
    elif score < 60:
        level = "WARNING"
    else:
        level = "CRITICAL"

    return {
        "score": score,
        "level": level,
        "factors": factors
    }