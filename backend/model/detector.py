from ultralytics import YOLO

# Load YOLO model
model = YOLO("yolo11n.pt")


def detect_people(image):

    # Track people across frames
    results = model.track(
        image,
        persist=True,
        classes=[0],
        tracker="bytetrack.yaml",
        verbose=False
    )

    people = []

    for result in results:

        if result.boxes is None:
            continue

        for box in result.boxes:

            # Person ID
            if box.id is not None:
                person_id = int(box.id[0])
            else:
                person_id = -1

            # Bounding box
            x1, y1, x2, y2 = map(int, box.xyxy[0])

            people.append({
                "id": person_id,
                "x1": x1,
                "y1": y1,
                "x2": x2,
                "y2": y2
            })

    return people