import cv2
import math

from model.detector import detect_people
from model.density import calculate_density
from model.risk import calculate_risk


# ============================================================
# CONFIGURATION
# ============================================================

# Temporary test capacity
capacity = 20


# ============================================================
# TRACKING MEMORY
# ============================================================

# Previous center position of each person
previous_positions = {}

# Previous average crowd speed
previous_average_speed = 0


# ============================================================
# OPEN VIDEO
# ============================================================

video = cv2.VideoCapture("test/crowd.mp4")

if not video.isOpened():
    print("ERROR: Could not open video")
    exit()

print("Video opened successfully!")


# ============================================================
# VIDEO FPS
# ============================================================

fps = video.get(cv2.CAP_PROP_FPS)

if fps <= 0:
    fps = 30

print(f"Video FPS: {fps}")


# ============================================================
# CREATE WINDOW
# ============================================================

cv2.namedWindow(
    "Crowd Detection",
    cv2.WINDOW_NORMAL
)

cv2.resizeWindow(
    "Crowd Detection",
    1000,
    600
)


# ============================================================
# MAIN VIDEO LOOP
# ============================================================

while True:

    # --------------------------------------------------------
    # Read frame
    # --------------------------------------------------------

    ret, frame = video.read()

    if not ret:
        break


    # --------------------------------------------------------
    # Detect and track people
    # --------------------------------------------------------

    people = detect_people(frame)


    # --------------------------------------------------------
    # Calculate occupancy
    # --------------------------------------------------------

    density = calculate_density(
        len(people),
        capacity
    )


    # --------------------------------------------------------
    # Store speeds of all detected people
    # --------------------------------------------------------

    speeds = []


    # ========================================================
    # PROCESS EACH PERSON
    # ========================================================

    for person in people:

        x1 = person["x1"]
        y1 = person["y1"]
        x2 = person["x2"]
        y2 = person["y2"]

        person_id = person["id"]


        # ----------------------------------------------------
        # Calculate center point
        # ----------------------------------------------------

        center_x = (x1 + x2) // 2
        center_y = (y1 + y2) // 2


        # ----------------------------------------------------
        # Calculate movement
        # ----------------------------------------------------

        movement = 0

        if person_id in previous_positions:

            previous_x, previous_y = previous_positions[person_id]

            movement = math.sqrt(
                (center_x - previous_x) ** 2 +
                (center_y - previous_y) ** 2
            )


        # ----------------------------------------------------
        # Save current position
        # ----------------------------------------------------

        previous_positions[person_id] = (
            center_x,
            center_y
        )


        # ----------------------------------------------------
        # Convert movement to pixels/second
        # ----------------------------------------------------

        speed = movement * fps

        speeds.append(speed)


        # ----------------------------------------------------
        # Draw bounding box
        # ----------------------------------------------------

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )


        # ----------------------------------------------------
        # Display tracking ID
        # ----------------------------------------------------

        cv2.putText(
            frame,
            f"ID: {person_id}",
            (x1, y1 - 10),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (0, 255, 255),
            2
        )


        # ----------------------------------------------------
        # Display individual speed
        # ----------------------------------------------------

        cv2.putText(
            frame,
            f"{speed:.0f} px/s",
            (x1, y2 + 20),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (255, 255, 0),
            2
        )


    # ========================================================
    # CALCULATE AVERAGE CROWD SPEED
    # ========================================================

    if len(speeds) > 0:

        average_speed = sum(speeds) / len(speeds)

    else:

        average_speed = 0


    # ========================================================
    # DETECT SUDDEN MOVEMENT
    # ========================================================

    speed_change = (
        average_speed - previous_average_speed
    )


    sudden_movement = (
        previous_average_speed > 0
        and speed_change > 100
    )


    # ========================================================
    # CALCULATE RISK
    # ========================================================

    risk = calculate_risk(
        density["occupancy"],
        average_speed,
        sudden_movement
    )


    # ========================================================
    # REMEMBER CURRENT SPEED
    # ========================================================

    previous_average_speed = average_speed


    # ========================================================
    # DISPLAY PEOPLE COUNT
    # ========================================================

    cv2.putText(
        frame,
        f"People: {len(people)}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )


    # ========================================================
    # DISPLAY OCCUPANCY
    # ========================================================

    cv2.putText(
        frame,
        f"Occupancy: {density['occupancy']}%",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )


    # ========================================================
    # DISPLAY AVERAGE SPEED
    # ========================================================

    cv2.putText(
        frame,
        f"Avg Speed: {average_speed:.1f} px/s",
        (20, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (255, 255, 0),
        2
    )


    # ========================================================
    # DISPLAY SPEED CHANGE
    # ========================================================

    cv2.putText(
        frame,
        f"Speed Change: {speed_change:.1f}",
        (20, 160),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (255, 255, 0),
        2
    )


    # ========================================================
    # DISPLAY SUDDEN MOVEMENT
    # ========================================================

    sudden_text = (
        "YES"
        if sudden_movement
        else "NO"
    )

    cv2.putText(
        frame,
        f"Sudden Movement: {sudden_text}",
        (20, 200),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.7,
        (0, 165, 255),
        2
    )


    # ========================================================
    # DISPLAY RISK SCORE
    # ========================================================

    cv2.putText(
        frame,
        f"Risk Score: {risk['score']}",
        (20, 240),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 165, 255),
        2
    )


    # ========================================================
    # DISPLAY RISK LEVEL
    # ========================================================

    cv2.putText(
        frame,
        f"Risk Level: {risk['level']}",
        (20, 280),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.9,
        (0, 0, 255),
        2
    )


    # ========================================================
    # SHOW VIDEO
    # ========================================================

    cv2.imshow(
        "Crowd Detection",
        frame
    )


    # ========================================================
    # PRESS Q TO EXIT
    # ========================================================

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# ============================================================
# CLEANUP
# ============================================================

video.release()
cv2.destroyAllWindows()