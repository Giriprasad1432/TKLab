def calculate_density(people, capacity, frame_width, frame_height):
    people_count = len(people)
    occupancy = (people_count / capacity) * 100.0 if capacity > 0 else 0.0

    if occupancy < 80:
        status = "NORMAL"
    elif occupancy <= 100:
        status = "NEAR_CAPACITY"
    else:
        status = "OVER_CAPACITY"

    # 3x3 Grid zone density calculation
    zone_density = {f"zone_{i}": 0 for i in range(1, 10)}
    
    safe_width = max(1.0, float(frame_width))
    safe_height = max(1.0, float(frame_height))
    zone_width = safe_width / 3.0
    zone_height = safe_height / 3.0

    for person in people:
        center_x = (person["x1"] + person["x2"]) / 2.0
        center_y = (person["y1"] + person["y2"]) / 2.0
        
        # Determine col and row (0, 1, or 2)
        col = int(center_x // zone_width)
        row = int(center_y // zone_height)
        
        # Clamp to 0-2 boundaries
        col = max(0, min(col, 2))
        row = max(0, min(row, 2))
        
        zone_index = row * 3 + col + 1
        zone_density[f"zone_{zone_index}"] += 1

    max_zone_id = "zone_1"
    max_zone_people = 0
    for z_id, count in zone_density.items():
        if count > max_zone_people:
            max_zone_people = count
            max_zone_id = z_id

    max_zone_percentage = (max_zone_people / people_count * 100.0) if people_count > 0 else 0.0

    # Detect isolated dense cluster (e.g., surrounding is clear but one specific zone is packed)
    isolated_cluster = bool(
        people_count >= 4 and
        occupancy < 65 and
        max_zone_percentage >= 40.0
    )

    return {
        "occupancy": round(occupancy),
        "status": status,
        "zone_density": zone_density,
        "max_zone_people": max_zone_people,
        "max_zone_percentage": round(max_zone_percentage, 1),
        "max_zone_id": max_zone_id,
        "isolated_cluster": isolated_cluster
    }
