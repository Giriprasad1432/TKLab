import os
import shutil
import tempfile
import asyncio
import time
import cv2
import base64
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, WebSocket, WebSocketDisconnect
from pydantic import BaseModel
from typing import Dict, List, Any

from model.processor import analyze_video, CrowdAnalyzer

router = APIRouter()

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
    risk_factors: List[RiskFactor]
    fps: float = 0.0

@router.post("/analyze", response_model=AnalysisResponse)
async def analyze(video: UploadFile = File(...), capacity: int = Form(100)):
    if not video.filename.lower().endswith(".mp4"):
        raise HTTPException(status_code=400, detail="Only MP4 videos are supported.")
        
    try:
        temp_dir = tempfile.mkdtemp()
        temp_path = os.path.join(temp_dir, video.filename)
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(video.file, buffer)
            
        start_time = time.time()
        loop = asyncio.get_event_loop()
        results = await loop.run_in_executor(None, analyze_video, temp_path, capacity)
        process_time = time.time() - start_time
        
        if "fps" not in results:
            results["fps"] = 0.0
            
        print(f"Processed video in {process_time:.4f}s, average FPS: {results.get('fps', 0)}")
            
        os.remove(temp_path)
        os.rmdir(temp_dir)
        
        return results
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.websocket("/ws/analyze")
async def websocket_analyze(websocket: WebSocket, capacity: int = 20):
    await websocket.accept()
    video_path = "test/crowd.mp4"
    video = cv2.VideoCapture(video_path)
    
    if not video.isOpened():
        await websocket.send_json({"error": "Could not open simulated live video."})
        await websocket.close()
        return
        
    fps = video.get(cv2.CAP_PROP_FPS)
    if fps <= 0:
        fps = 30
        
    analyzer = CrowdAnalyzer(capacity=capacity, fps=fps)
    
    # Process at max 10 updates per second to be performant
    target_update_rate = 10.0
    delay = 1.0 / target_update_rate
    
    try:
        while True:
            start_time = time.time()
            ret, frame = video.read()
            
            if not ret:
                # Video ended cleanly
                await websocket.send_json({"message": "Video stream ended."})
                await websocket.close(code=1000)
                break
                
            process_start_time = time.time()
            loop = asyncio.get_event_loop()
            metrics = await loop.run_in_executor(None, analyzer.process_frame, frame, True)
            process_time = time.time() - process_start_time
            
            # Real measured processing FPS
            if process_time > 0:
                metrics["fps"] = round(1.0 / process_time, 1)
            else:
                metrics["fps"] = 0.0
                
            print(f"Processed frame in {process_time:.4f}s, measured FPS: {metrics['fps']}")
            
            # Encode frame
            _, buffer = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 50])
            metrics["frame_base64"] = base64.b64encode(buffer).decode('utf-8')
            
            await websocket.send_json(metrics)
            
            elapsed = time.time() - start_time
            sleep_time = max(0.0, delay - elapsed)
            await asyncio.sleep(sleep_time)
            
    except WebSocketDisconnect:
        print("Client disconnected from WebSocket.")
    except Exception as e:
        print(f"WebSocket Error: {e}")
        try:
            await websocket.close()
        except:
            pass
    finally:
        video.release()
