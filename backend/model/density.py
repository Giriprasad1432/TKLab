import math
import numpy as np

def calculate_density(people, capacity, frame_width, frame_height, cluster_proximity_px: float = 90.0):
    """
    Computes:
    1. Overall occupancy against venue capacity.
    2. Spatial 3x3 zone distribution.
    3. Dense crowd clustering (distinguishing separated individuals from dense crowd packs).
    4. Isolated dense clustering and predictive congestion zones.
    """
    people_count = len(people)
    occupancy = (people_count / capacity) * 100.0 if capacity > 0 else 0.0

    if occupancy < 80:
        status = "NORMAL"
    elif occupancy <= 100:
        status = "NEAR_CAPACITY"
    else:
        status = "OVER_CAPACITY"

    safe_width = max(1.0, float(frame_width))
    safe_height = max(1.0, float(frame_height))
    zone_width = safe_width / 3.0
    zone_height = safe_height / 3.0

    # 1. 3x3 Grid zone density calculation
    zone_density = {f"zone_{i}": 0 for i in range(1, 10)}
    person_zones = []

    for person in people:
        center_x = (person["x1"] + person["x2"]) / 2.0
        center_y = (person["y1"] + person["y2"]) / 2.0
        
        col = int(center_x // zone_width)
        row = int(center_y // zone_height)
        col = max(0, min(col, 2))
        row = max(0, min(row, 2))
        
        zone_index = row * 3 + col + 1
        zone_id = f"zone_{zone_index}"
        zone_density[zone_id] += 1
        person_zones.append(zone_id)

    max_zone_id = "zone_1"
    max_zone_people = 0
    for z_id, count in zone_density.items():
        if count > max_zone_people:
            max_zone_people = count
            max_zone_id = z_id

    max_zone_percentage = (max_zone_people / people_count * 100.0) if people_count > 0 else 0.0

    # 2. Spatial Crowd Clustering (Separate individuals vs Dense Crowd Packs)
    # Scale proximity by resolution (e.g. 90px on 1080p)
    diag = math.sqrt(safe_width**2 + safe_height**2)
    adaptive_prox = max(40.0, diag * 0.045)  # ~99px on 1920x1080

    clusters = []
    separated_count = 0
    clustered_count = 0

    if people_count > 0:
        centers = [((p["x1"] + p["x2"]) / 2.0, (p["y1"] + p["y2"]) / 2.0) for p in people]
        visited = [False] * people_count

        cluster_id = 1
        for i in range(people_count):
            if visited[i]:
                continue

            # Breadth-first clustering based on spatial proximity
            current_cluster_indices = [i]
            visited[i] = True
            queue = [i]

            while queue:
                curr = queue.pop(0)
                cx, cy = centers[curr]

                for j in range(people_count):
                    if not visited[j]:
                        ox, oy = centers[j]
                        dist = math.sqrt((cx - ox)**2 + (cy - oy)**2)
                        if dist <= adaptive_prox:
                            visited[j] = True
                            current_cluster_indices.append(j)
                            queue.append(j)

            # Groups of 3 or more people are designated as a Dense Crowd Pack
            if len(current_cluster_indices) >= 3:
                member_people = [people[idx] for idx in current_cluster_indices]
                min_x = max(0, int(min(p["x1"] for p in member_people) - 10))
                min_y = max(0, int(min(p["y1"] for p in member_people) - 10))
                max_x = min(int(safe_width), int(max(p["x2"] for p in member_people) + 10))
                max_y = min(int(safe_height), int(max(p["y2"] for p in member_people) + 10))

                c_cx = sum(centers[idx][0] for idx in current_cluster_indices) / len(current_cluster_indices)
                c_cy = sum(centers[idx][1] for idx in current_cluster_indices) / len(current_cluster_indices)

                # Determine cluster zone
                c_col = max(0, min(int(c_cx // zone_width), 2))
                c_row = max(0, min(int(c_cy // zone_height), 2))
                c_zone = f"zone_{c_row * 3 + c_col + 1}"

                # Area in pixels normalized
                area_sq_px = max(1.0, float((max_x - min_x) * (max_y - min_y)))
                norm_density_index = (len(current_cluster_indices) * 10000.0) / area_sq_px

                if norm_density_index >= 3.5:
                    d_level = "CRITICAL"
                elif norm_density_index >= 1.8:
                    d_level = "HIGH"
                elif norm_density_index >= 0.9:
                    d_level = "MODERATE"
                else:
                    d_level = "LOW"

                clusters.append({
                    "cluster_id": cluster_id,
                    "people_count": len(current_cluster_indices),
                    "zone_id": c_zone,
                    "center": (round(c_cx, 1), round(c_cy, 1)),
                    "bbox": [min_x, min_y, max_x, max_y],
                    "density_level": d_level,
                    "density_index": round(norm_density_index, 2),
                    "member_ids": [p.get("id", -1) for p in member_people]
                })

                # Mark people as clustered
                for idx in current_cluster_indices:
                    people[idx]["in_cluster"] = True
                    people[idx]["cluster_id"] = cluster_id

                clustered_count += len(current_cluster_indices)
                cluster_id += 1
            else:
                for idx in current_cluster_indices:
                    people[idx]["in_cluster"] = False
                    people[idx]["cluster_id"] = None
                separated_count += len(current_cluster_indices)

    # 3. Detect isolated dense cluster (e.g., surrounding is clear but one specific zone is packed)
    isolated_cluster = bool(
        people_count >= 4 and
        occupancy < 65 and
        (max_zone_percentage >= 40.0 or any(c["people_count"] >= 5 for c in clusters))
    )

    return {
        "occupancy": round(occupancy),
        "status": status,
        "zone_density": zone_density,
        "max_zone_people": max_zone_people,
        "max_zone_percentage": round(max_zone_percentage, 1),
        "max_zone_id": max_zone_id,
        "isolated_cluster": isolated_cluster,
        "clusters": clusters,
        "separated_people_count": separated_count,
        "clustered_people_count": clustered_count
    }