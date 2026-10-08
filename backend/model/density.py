def calculate_density(people, capacity, frame_width, frame_height):
    people_count = len(people)
    occupancy = (people_count / capacity) * 100 if capacity > 0 else 0

    if occupancy < 80:
        status = "NORMAL"
    elif occupancy <= 100:
        status = "NEAR_CAPACITY"
    else:
        status = "OVER_CAPACITY"

    # Zone calculation
    zone_density = {f"zone_{i}": 0 for i in range(1, 10)}
    
    zone_width = frame_width / 3
    zone_height = frame_height / 3

    for person in people:
        center_x = (person["x1"] + person["x2"]) / 2
        center_y = (person["y1"] + person["y2"]) / 2
        
        # Determine col and row (0, 1, or 2)
        col = int(center_x // zone_width)
        row = int(center_y // zone_height)
        
        # Clamp to 0-2 just in case
        col = max(0, min(col, 2))
        row = max(0, min(row, 2))
        
        zone_index = row * 3 + col + 1
        zone_density[f"zone_{zone_index}"] += 1

    max_zone_people = max(zone_density.values()) if zone_density else 0
    max_zone_percentage = (max_zone_people / people_count * 100) if people_count > 0 else 0.0

    return {
        "occupancy": round(occupancy),
        "status": status,
        "zone_density": zone_density,
        "max_zone_people": max_zone_people,
        "max_zone_percentage": round(max_zone_percentage, 1)
    }