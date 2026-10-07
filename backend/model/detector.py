from ultralytics import YOLO


# Load YOLO model
model = YOLO("yolo11n.pt")


def detect_people(image):
    results = model(image)

    people = []

    for result in results:
        for box in result.boxes:
            class_id = int(box.cls[0])

            # COCO class 0 = person
            if class_id == 0:
                x1, y1, x2, y2 = map(int, box.xyxy[0])

                people.append({
                    "x1": x1,
                    "y1": y1,
                    "x2": x2,
                    "y2": y2
                })

    return people