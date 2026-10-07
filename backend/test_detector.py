import cv2

from model.detector import detect_people
from model.density import calculate_density


# Temporary test capacity
# Later this will come from the monitored area's configuration
capacity = 20


# Open video
video = cv2.VideoCapture("test/crowd.mp4")

if not video.isOpened():
    print("ERROR: Could not open video")
    exit()

print("Video opened successfully!")


while True:

    # Read frame
    ret, frame = video.read()

    if not ret:
        break

    # Detect people
    people = detect_people(frame)

    # Calculate occupancy and density status
    density = calculate_density(
        len(people),
        capacity
    )

    # Draw bounding boxes
    for person in people:

        x1 = person["x1"]
        y1 = person["y1"]
        x2 = person["x2"]
        y2 = person["y2"]

        cv2.rectangle(
            frame,
            (x1, y1),
            (x2, y2),
            (0, 255, 0),
            2
        )

    # Display people count
    cv2.putText(
        frame,
        f"People: {len(people)}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    # Display occupancy
    cv2.putText(
        frame,
        f"Occupancy: {density['occupancy']}%",
        (20, 80),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )

    # Display status
    cv2.putText(
        frame,
        f"Status: {density['status']}",
        (20, 120),
        cv2.FONT_HERSHEY_SIMPLEX,
        0.8,
        (0, 255, 0),
        2
    )
    
    # Set window size
    cv2.namedWindow("Crowd Detection", cv2.WINDOW_NORMAL)
    cv2.resizeWindow("Crowd Detection", 1000, 600)

    # Show video
    cv2.imshow("Crowd Detection", frame)

    # Press Q to quit
    if cv2.waitKey(1) & 0xFF == ord("q"):
        break


# Release resources
video.release()
cv2.destroyAllWindows()