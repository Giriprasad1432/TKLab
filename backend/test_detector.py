import cv2
from model.detector import detect_people

video = cv2.VideoCapture("test/crowd.mp4")

while True:
    ret, frame = video.read()

    if not ret:
        break

    people = detect_people(frame)

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

    cv2.putText(
        frame,
        f"People: {len(people)}",
        (20, 40),
        cv2.FONT_HERSHEY_SIMPLEX,
        1,
        (0, 255, 0),
        2
    )

    cv2.imshow("Crowd Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord("q"):
        break

video.release()
cv2.destroyAllWindows()