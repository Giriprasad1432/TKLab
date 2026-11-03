import os
import sys
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
from starlette.websockets import WebSocketState
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
    max_clusters_count: int = 0
    max_pack_size: int = 0
    max_clustered_people: int = 0
    max_separated_people: int = 0
    clusters: List[Dict] = Field(default_factory=list)
    separated_people_count: int = 0
    clustered_people_count: int = 0
    predicted_density_surges: List[Dict] = Field(default_factory=list)
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
    clusters: List[Dict] = Field(default_factory=list)
    separated_people_count: int = 0
    clustered_people_count: int = 0
    isolated_cluster: bool = False


VIDEO_TITLES = {
    "crowd.mp4": "Main Entrance Flow (crowd.mp4)",
    "crowd2.mp4": "High Density Concourse (crowd2.mp4)",
    "crowd3.mp4": "Rapid Movement & Commotion (crowd3.mp4)",
    "mot20_crowd.mp4": "MOT20 Benchmark Extreme Crowd (mot20_crowd.mp4)"
}

def get_test_directories() -> List[Path]:
    return [
        Path(__file__).resolve().parent.parent / "test",
        Path.cwd() / "test",
        Path.cwd() / "backend" / "test",
    ]

def get_available_sources() -> List[Dict]:
    sources = [
        {
            "id": "webcam",
            "name": "Live Webcam / Camera (Device 0)",
            "type": "live",
            "filename": "webcam",
            "description": "Real-time webcam feed with live YOLO crowd detection"
        }
    ]
    seen = set()
    for d in get_test_directories():
        if d.exists():
            for f in d.glob("*.mp4"):
                if f.name not in seen:
                    seen.add(f.name)
                    size_mb = round(f.stat().st_size / (1024 * 1024), 1)
                    sources.append({
                        "id": f.name,
                        "name": VIDEO_TITLES.get(f.name, f.name),
                        "type": "video",
                        "filename": f.name,
                        "size_mb": size_mb,
                        "description": f"Pre-recorded test footage ({size_mb} MB)"
                    })
    return sources

def resolve_video_source(source: Optional[str]):
    clean_src = (source or "crowd.mp4").strip()
    
    if clean_src.lower() in ("webcam", "camera", "live", "0") or clean_src.isdigit():
        return {
            "type": "webcam",
            "device_index": int(clean_src) if clean_src.isdigit() else 0
        }
        
    if clean_src.startswith(("rtsp://", "http://", "https://")):
        return {
            "type": "stream",
            "url": clean_src
        }
        
    # Check if exact file path exists
    p = Path(clean_src)
    if p.exists() and p.is_file():
        return {"type": "file", "path": str(p)}
        
    # Search in test directories
    filename = p.name
    for d in get_test_directories():
        candidate = d / filename
        if candidate.exists():
            return {"type": "file", "path": str(candidate)}
            
    # Default fallback to crowd.mp4
    for d in get_test_directories():
        candidate = d / "crowd.mp4"
        if candidate.exists():
            return {"type": "file", "path": str(candidate)}
            
    return {"type": "file", "path": str(get_test_directories()[0] / "crowd.mp4")}


def resolve_sample_video_path() -> str:
    """Finds crowd.mp4 regardless of current working directory."""
    res = resolve_video_source("crowd.mp4")
    return res.get("path", "")


@router.get("/sources", summary="List available camera feeds and preloaded test videos")
@router.get("/videos", summary="Alias for /sources")
def list_video_sources():
    sources = get_available_sources()
    return {
        "sources": sources,
        "default_source": "crowd.mp4"
    }


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


@router.post("/analyze/preloaded", response_model=AnalysisResponse, summary="Analyze a preloaded test video without file upload")
async def analyze_preloaded(
    filename: str = Query("crowd.mp4", description="Preloaded video name (e.g. crowd.mp4, crowd2.mp4, crowd3.mp4, mot20_crowd.mp4)"),
    capacity: int = Query(100, description="Venue or zone capacity", gt=0),
    sample_fps: int = Query(15, description="Frame sampling rate for inference speed", gt=0)
):
    resolved = resolve_video_source(filename)
    if resolved["type"] != "file" or not os.path.exists(resolved["path"]):
        raise HTTPException(status_code=404, detail=f"Preloaded video '{filename}' not found.")
        
    try:
        start_time = time.time()
        loop = asyncio.get_running_loop()
        results = await loop.run_in_executor(None, analyze_video, resolved["path"], capacity, sample_fps)
        process_time = time.time() - start_time
        print(f"Processed preloaded {filename} in {process_time:.2f}s (Effective FPS: {results.get('fps', 0)})")
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Preloaded video analysis failed: {str(e)}")


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
        "detections": people,
        "clusters": density.get("clusters", []),
        "separated_people_count": density.get("separated_people_count", 0),
        "clustered_people_count": density.get("clustered_people_count", 0),
        "isolated_cluster": density.get("isolated_cluster", False)
    }


@router.websocket("/ws/analyze")
async def websocket_analyze(
    websocket: WebSocket,
    capacity: int = Query(20, description="Venue capacity", gt=0),
    source: str = Query("crowd.mp4", description="Video source: filename, 'webcam', device index, or RTSP/HTTP URL"),
    loop: bool = Query(True, description="Loop simulation video continuously")
):
    await websocket.accept()
    resolved = resolve_video_source(source)
    is_live = resolved["type"] in ("webcam", "stream")
    video = None

    if resolved["type"] == "webcam":
        device_idx = resolved["device_index"]
        if sys.platform == "win32":
            video = cv2.VideoCapture(device_idx, cv2.CAP_DSHOW)
            if not video.isOpened():
                video = cv2.VideoCapture(device_idx)
        else:
            video = cv2.VideoCapture(device_idx)

        if not video.isOpened():
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({
                    "error": f"Could not access live webcam (device {device_idx}). Ensure camera permissions are granted and camera is not open in another application."
                })
                await websocket.close(code=1008)
            return

    elif resolved["type"] == "stream":
        video = cv2.VideoCapture(resolved["url"])
        if not video.isOpened():
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({
                    "error": f"Could not open network stream: {resolved['url']}"
                })
                await websocket.close(code=1008)
            return

    else:
        video_path = resolved["path"]
        if not os.path.exists(video_path):
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({
                    "error": f"Test video not found: {source}"
                })
                await websocket.close(code=1008)
            return

        video = cv2.VideoCapture(video_path)
        if not video.isOpened():
            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json({
                    "error": f"Could not open video file: {video_path}"
                })
                await websocket.close(code=1008)
            return

    fps = video.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or is_live:
        fps = 30.0

    reset_tracker()
    analyzer = CrowdAnalyzer(capacity=max(1, capacity), fps=fps)

    target_update_rate = 10.0
    delay = 1.0 / target_update_rate

    stop_event = asyncio.Event()

    async def client_listener():
        try:
            while not stop_event.is_set():
                data = await websocket.receive_json()
                if isinstance(data, dict):
                    if "capacity" in data:
                        new_cap = int(data["capacity"])
                        if new_cap > 0:
                            analyzer.capacity = new_cap
        except (WebSocketDisconnect, RuntimeError, asyncio.CancelledError):
            pass
        except Exception:
            pass
        finally:
            stop_event.set()

    listener_task = asyncio.create_task(client_listener())

    try:
        while not stop_event.is_set():
            if websocket.client_state != WebSocketState.CONNECTED:
                break

            cycle_start = time.time()
            ret, frame = video.read()

            if not ret:
                if loop and not is_live:
                    video.set(cv2.CAP_PROP_POS_FRAMES, 0)
                    ret, frame = video.read()
                    if not ret:
                        break
                else:
                    if websocket.client_state == WebSocketState.CONNECTED:
                        try:
                            await websocket.send_json({"message": "Video stream ended."})
                            await websocket.close(code=1000)
                        except Exception:
                            pass
                    break

            process_start = time.time()
            loop_runner = asyncio.get_running_loop()
            metrics = await loop_runner.run_in_executor(None, analyzer.process_frame, frame, True)
            process_time = time.time() - process_start

            metrics["fps"] = round(1.0 / process_time, 1) if process_time > 0 else 0.0
            metrics["source"] = source
            metrics["is_live"] = is_live

            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 55])
            metrics["frame_base64"] = base64.b64encode(buffer).decode('utf-8')

            if websocket.client_state == WebSocketState.CONNECTED:
                await websocket.send_json(metrics)
            else:
                break

            elapsed = time.time() - cycle_start
            sleep_time = max(0.001, delay - elapsed)
            await asyncio.sleep(sleep_time)

    except (WebSocketDisconnect, RuntimeError):
        pass
    except Exception as e:
        print(f"WebSocket session closed: {e}")
    finally:
        stop_event.set()
        listener_task.cancel()
        try:
            await listener_task
        except (asyncio.CancelledError, Exception):
            pass
        if video:
            video.release()
        if websocket.client_state == WebSocketState.CONNECTED:
            try:
                await websocket.close()
            except Exception:
                pass

