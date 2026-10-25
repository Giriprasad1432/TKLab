import os
import glob
import shutil
from pathlib import Path

def convert_mot20_to_yolo(
    mot20_root=r"C:\Users\girib\Videos\MOT20\MOT20",
    output_root=r"C:\Users\girib\Desktop\Giri\TKLab\backend\dataset_mot20",
    max_frames_per_seq=150,  # Samples frames for fast balanced training
    val_seqs=("MOT20-01",),   # Reserve sequence 01 for validation
):
    """
    Converts MOT20 pedestrian tracking dataset to YOLO11 detection format.
    Filters for pedestrian class (class 1 in MOT20) and generates YOLO normalized labels.
    """
    mot20_train = os.path.join(mot20_root, "train")
    if not os.path.exists(mot20_train):
        print(f"Error: MOT20 train directory not found at {mot20_train}")
        return

    output_dir = Path(output_root)
    img_train_dir = output_dir / "images" / "train"
    img_val_dir = output_dir / "images" / "val"
    lbl_train_dir = output_dir / "labels" / "train"
    lbl_val_dir = output_dir / "labels" / "val"

    for d in [img_train_dir, img_val_dir, lbl_train_dir, lbl_val_dir]:
        d.mkdir(parents=True, exist_ok=True)

    seq_dirs = sorted([d for d in glob.glob(os.path.join(mot20_train, "MOT20-*")) if os.path.isdir(d)])
    print(f"Found {len(seq_dirs)} MOT20 training sequences.")

    total_images = 0
    total_annotations = 0

    for seq_path in seq_dirs:
        seq_name = os.path.basename(seq_path)
        is_val = seq_name in val_seqs
        dest_img_dir = img_val_dir if is_val else img_train_dir
        dest_lbl_dir = lbl_val_dir if is_val else lbl_train_dir

        gt_file = os.path.join(seq_path, "gt", "gt.txt")
        img_dir = os.path.join(seq_path, "img1")

        if not os.path.exists(gt_file) or not os.path.exists(img_dir):
            continue

        print(f"Processing {seq_name} ({'Validation' if is_val else 'Train'})...")

        # Parse ground truth: frame -> list of [x, y, w, h]
        frame_boxes = {}
        with open(gt_file, "r") as f:
            for line in f:
                parts = line.strip().split(",")
                if len(parts) < 8:
                    continue
                frame_idx = int(parts[0])
                cls_id = int(parts[7])
                # In MOT20: 1 = Pedestrian, 2 = Person on vehicle, 7 = Static person
                if cls_id not in (1, 7):
                    continue

                left, top, w, h = float(parts[2]), float(parts[3]), float(parts[4]), float(parts[5])
                if w <= 0 or h <= 0:
                    continue

                if frame_idx not in frame_boxes:
                    frame_boxes[frame_idx] = []
                frame_boxes[frame_idx].append((left, top, w, h))

        # Sample images
        all_imgs = sorted(glob.glob(os.path.join(img_dir, "*.jpg")))
        step = max(1, len(all_imgs) // max_frames_per_seq) if max_frames_per_seq else 1
        sampled_imgs = all_imgs[::step]

        # Read dimensions from first image
        import cv2
        sample_frame = cv2.imread(sampled_imgs[0])
        img_h, img_w = sample_frame.shape[:2]

        for img_p in sampled_imgs:
            frame_num = int(os.path.splitext(os.path.basename(img_p))[0])
            dest_img_name = f"{seq_name}_{frame_num:06d}.jpg"
            dest_img_p = dest_img_dir / dest_img_name
            shutil.copyfile(img_p, dest_img_p)

            # Generate YOLO labels
            dest_lbl_p = dest_lbl_dir / f"{seq_name}_{frame_num:06d}.txt"
            boxes = frame_boxes.get(frame_num, [])
            
            with open(dest_lbl_p, "w") as lf:
                for left, top, w, h in boxes:
                    # Clip coordinates to image boundary
                    x1 = max(0.0, min(float(img_w), left))
                    y1 = max(0.0, min(float(img_h), top))
                    x2 = max(0.0, min(float(img_w), left + w))
                    y2 = max(0.0, min(float(img_h), top + h))

                    box_w = x2 - x1
                    box_h = y2 - y1
                    if box_w < 3 or box_h < 3:
                        continue

                    # Normalized center x, center y, width, height
                    x_center = (x1 + box_w / 2.0) / img_w
                    y_center = (y1 + box_h / 2.0) / img_h
                    norm_w = box_w / img_w
                    norm_h = box_h / img_h

                    lf.write(f"0 {x_center:.6f} {y_center:.6f} {norm_w:.6f} {norm_h:.6f}\n")
                    total_annotations += 1

            total_images += 1

    # Create dataset yaml file for Ultralytics YOLO
    yaml_path = output_dir / "mot20.yaml"
    with open(yaml_path, "w") as yf:
        yf.write(f"path: {output_dir.as_posix()}\n")
        yf.write("train: images/train\n")
        yf.write("val: images/val\n\n")
        yf.write("names:\n")
        yf.write("  0: person\n")

    print("\n=======================================================")
    print(f"MOT20 Dataset Successfully Converted!")
    print(f"Total Processed Images: {total_images}")
    print(f"Total Bounding Boxes:   {total_annotations}")
    print(f"Dataset YAML Config:    {yaml_path}")
    print("=======================================================")

if __name__ == "__main__":
    convert_mot20_to_yolo()
