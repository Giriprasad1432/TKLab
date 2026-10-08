def calculate_risk(occupancy, capacity, max_zone_people, max_zone_percentage, density_change, average_speed, average_acceleration, direction_consistency, collective_movement_percentage):
    score = 0
    factors = []

    # Occupancy contribution (0 below 60%, ramp up to +30 at 100%, up to +45 at 150%+)
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
        score += occ_score
        factors.append({"factor": "occupancy", "score": occ_score, "reason": "Elevated occupancy"})

    # Max zone concentration (up to +25)
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
        factors.append({"factor": "zone_concentration", "score": zone_score, "reason": "High concentration in single zone"})

    # Density change (up to +10)
    dc_score = 0
    if density_change >= 5:
        dc_score = min(10, int(density_change))
    if dc_score > 0:
        score += dc_score
        factors.append({"factor": "density_change", "score": dc_score, "reason": "Sudden density increase"})

    # Motion indicators (up to +30), only count when density is elevated (occupancy >= 60)
    motion_score = 0
    if occupancy >= 60:
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
        factors.append({"factor": "motion_indicators", "score": motion_score, "reason": "Concerning crowd movement patterns"})

    # Limit total score
    if score > 100:
        score = 100

    # Risk level (raw)
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