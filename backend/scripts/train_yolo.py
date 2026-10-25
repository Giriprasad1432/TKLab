import os
import argparse
from pathlib import Path
from ultralytics import YOLO

def train_yolo(
    yaml_config=r"c:\Users\girib\Desktop\Giri\TKLab\backend\dataset_mot20\mot20.yaml",
    base_model="yolo11n.pt",
    epochs=15,
    batch=8,
    imgsz=960,
    device="0"  # uses GPU if available, else automatically falls back to cpu
):
    """
    Fine-tunes YOLO11 on the converted MOT20 dense pedestrian dataset.
    Saves trained weights to backend/yolo11n_crowd.pt
    """
    backend_root = Path(__file__).resolve().parent.parent
    base_model_path = backend_root / base_model

    print("==================================================")
    print("Starting YOLO11 Crowd Fine-Tuning")
    print(f"Base Model:    {base_model_path}")
    print(f"Dataset YAML:  {yaml_config}")
    print(f"Epochs:        {epochs} | Batch: {batch} | ImgSz: {imgsz}")
    print("==================================================")

    model = YOLO(str(base_model_path) if base_model_path.exists() else base_model)

    import torch
    if not torch.cuda.is_available():
        print("Note: CUDA GPU not detected, training will run on CPU.")
        device = "cpu"

    results = model.train(
        data=yaml_config,
        epochs=epochs,
        batch=batch,
        imgsz=imgsz,
        device=device,
        project=str(backend_root / "runs"),
        name="mot20_finetune",
        save=True,
        verbose=True
    )

    best_weights = Path(results.save_dir) / "weights" / "best.pt"
    if best_weights.exists():
        target_path = backend_root / "yolo11n_crowd.pt"
        import shutil
        shutil.copyfile(best_weights, target_path)
        print(f"\nTraining completed! Fine-tuned weights deployed to: {target_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Fine-tune YOLO11 on MOT20 Crowd Dataset")
    parser.add_argument("--epochs", type=int, default=15, help="Number of training epochs")
    parser.add_argument("--batch", type=int, default=8, help="Batch size")
    parser.add_argument("--imgsz", type=int, default=960, help="Image resolution")
    args = parser.parse_args()

    train_yolo(epochs=args.epochs, batch=args.batch, imgsz=args.imgsz)
