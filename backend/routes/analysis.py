import os
import shutil
import tempfile
import asyncio
import time
from pathlib import Path
from typing import Dict, List, Optional
import cv2
import numpy as np
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect, Query
from pydantic import BaseModel, Field

from model.processor import analyze_video, CrowdAnalyzer
from model.detector import detect_people, reset_tracker
from model.density import calculate_density

router = APIRouter(tags=["Crowd & Stampede Analysis"])

SUPPORTED_VIDEO_EXTENSIONS = {".mp4", ".avi", ".mov", ".mkv", ".webm"}
SUPPORTED_IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}

class RiskFactor(BaseModel):
    factor: str
    score: int
    reason: str

class AnalysisResponse(BaseModel):
    people_count: int
    occupancy: float
    capacity_status: str
    zone_density: Dict[str, int]
    max_zone_people: int
    max_zone_percentage: float
    average_speed: float
    sudden_movement: bool
    risk_score: int
    risk_level: str
    average_acceleration: float
    dominant_direction: float
    direction_consistency: float
    collective_movement_percentage: float
    density_change: float
    speed_variance: float
    risk_factors: List[RiskFactor] = Field(default_factory=list)
    isolated_cluster_detected: bool = False
    isolated_cluster_zone: Optional[str] = None
    commotion_level: str = "NORMAL"
    commotion_score: float = 0.0
    avg_tortuosity: float = 1.0
    fps: float = 0.0
    total_frames: Optional[int] = None
    processed_frames: Optional[int] = None
    duration_seconds: Optional[float] = None

class FrameAnalysisResponse(BaseModel):
    people_count: int
    occupancy: float
    capacity_status: str
    zone_density: Dict[str, int]
    max_zone_people: int
    max_zone_percentage: float
    detections: List[Dict] = Field(default_factory=list)


def resolve_sample_video_path() -> str:
    """Finds crowd.mp4 regardless of current working directory."""
    candidates = [
        Path(__file__).resolve().parent.parent / "test" / "crowd.mp4",
        Path.cwd() / "test" / "crowd.mp4",
        Path.cwd() / "backend" / "test" / "crowd.mp4",
    ]
    for p in candidates:
        if p.exists():
            return str(p)
    return str(candidates[0])


@router.post("/analyze", response_model=AnalysisResponse, summary="Analyze uploaded crowd video")
async def analyze(
    video: UploadFile = File(..., description="Video file to analyze"),
    capacity: int = Form(100, description="Venue or zone capacity", gt=0),
    sample_fps: int = Form(15, description="Frame sampling rate for inference speed", gt=0)
):
    ext = os.path.splitext(video.filename or "")[1].lower()
    if ext not in SUPPORTED_VIDEO_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported video format '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_VIDEO_EXTENSIONS))}"
        )
        
    temp_dir = tempfile.mkdtemp(prefix="tklab_video_")
    temp_path = os.path.join(temp_dir, video.filename or f"video{ext}")
    
    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        start_time = time.time()
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(None, analyze_video, temp_path, capacity, sample_fps)
        process_time = time.time() - start_time
        
        print(f"Processed {video.filename} in {process_time:.2f}s (Effective FPS: {results.get('fps', 0)})")
        return results
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Video analysis failed: {str(e)}")
    finally:
        # Guarantee temporary files are cleaned up
        if os.path.exists(temp_path):
            try:
                os.remove(temp_path)
            except OSError:
                pass
        if os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError:
                pass


@router.post("/analyze/frame", response_model=FrameAnalysisResponse, summary="Analyze a single camera frame or snapshot")
async def analyze_frame(
    image: UploadFile = File(..., description="Image frame to analyze"),
    capacity: int = Form(20, description="Zone capacity", gt=0)
):
    ext = os.path.splitext(image.filename or "")[1].lower()
    if ext and ext not in SUPPORTED_IMAGE_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported image format '{ext}'. Supported formats: {', '.join(sorted(SUPPORTED_IMAGE_EXTENSIONS))}"
        )
        
    contents = await image.read()
    nparr = np.frombuffer(contents, np.uint8)
    frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if frame is None or frame.size == 0:
        raise HTTPException(status_code=400, detail="Could not decode image content.")
        
    frame_h, frame_w = frame.shape[:2]
    people = detect_people(frame)
    density = calculate_density(people, capacity, frame_w, frame_h)
    
    return {
        "people_count": len(people),
        "occupancy": float(density["occupancy"]),
        "capacity_status": density["status"],
        "zone_density": density["zone_density"],
        "max_zone_people": density["max_zone_people"],
        "max_zone_percentage": density["max_zone_percentage"],
        "detections": people
    }


@router.websocket("/ws/analyze")
async def websocket_analyze(
    websocket: WebSocket,
    capacity: int = Query(20, description="Venue capacity", gt=0),
    loop: bool = Query(True, description="Loop simulation video continuously")
):
    await websocket.accept()
    video_path = resolve_sample_video_path()
    
    if not os.path.exists(video_path):
        await websocket.send_json({"error": f"Simulated video not found at: {video_path}"})
        await websocket.close()
        return

    video = cv2.VideoCapture(video_path)
    if not video.isOpened():
        await websocket.send_json({"error": "Could not open simulated live video source."})
        await websocket.close()
        return
        
    fps = video.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30.0
        
    reset_tracker()
    analyzer = CrowdAnalyzer(capacity=max(1, capacity), fps=fps)
    
    # Target 10 frames per second over websocket for smooth UI without saturating network
    target_update_rate = 10.0
    delay = 1.0 / target_update_rate
    
    async def client_listener():
        try:
            while True:
                data = await websocket.receive_json()
                if isinstance(data, dict) and "capacity" in data:
                    new_cap = int(data["capacity"])
                    if new_cap > 0:
                        analyzer.capacity = new_cap
        except Exception:
            pass

    listener_task = asyncio.create_task(client_listener())

    try:
        while True:
            cycle_start = time.time()
            ret, frame = video.read()
            
            if not ret:
                if loop:
                    # Rewind cleanly to start for infinite live feed demo
                    video.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = video.read()
                    if not ret:
                        break
                else:
                    await websocket.send_json({"message": "Video stream ended."})
                    await websocket.close(code=1000)
                    break
                    
            process_start = time.time()
            loop_runner = asyncio.get_running_loop()
            metrics = await loop_runner.run_in_executor(None, analyzer.process_frame, frame, True)
            process_time = time.time() - process_start
            
            metrics["fps"] = round(1.0 / process_time, 1) if process_time > 0 else 0.0
            
            # Encode visual frame to JPEG
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
            metrics["frame_base64"] = base64.b64encode(buffer).decode('utf-8')
            
            await websocket.send_json(metrics)
            
            elapsed = time.time() - cycle_start
            sleep_time = max(0.001, delay - elapsed)
            await asyncio.sleep(sleep_time)
            
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        listener_task.cancel()
        video.release()

