def calculate_density(people_count, capacity):

    occupancy = (people_count / capacity) * 100

    if occupancy > 100:
        occupancy = 100

    if occupancy < 40:
        status = "LOW"
    elif occupancy < 70:
        status = "MEDIUM"
    elif occupancy < 90:
        status = "HIGH"
    else:
        status = "CRITICAL"

    return {
        "occupancy": round(occupancy, 1),
        "status": status
    }