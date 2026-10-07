def calculate_risk(occupancy, average_speed, sudden_movement):

    score = 0

    # Occupancy contribution
    if occupancy >= 90:
        score += 40
    elif occupancy >= 70:
        score += 25
    elif occupancy >= 40:
        score += 10

    # Movement contribution
    if average_speed >= 300:
        score += 35
    elif average_speed >= 150:
        score += 20
    elif average_speed >= 75:
        score += 10

    # Sudden movement contribution
    if sudden_movement:
        score += 25

    # Limit score
    if score > 100:
        score = 100

    # Risk level
    if score < 40:
        level = "SAFE"
    elif score < 70:
        level = "WARNING"
    else:
        level = "CRITICAL"

    return {
        "score": score,
        "level": level
    }