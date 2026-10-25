import time
import torch
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routes.analysis import router as analysis_router
from model.detector import MODEL_NAME

app = FastAPI(
    title="Stampede & Crowd Dynamic Detection API",
    description="Real-time computer vision API for crowd occupancy, 3x3 spatial density heatmaps, collective movement tracking, and stampede risk prevention.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analysis_router)


@app.get("/", tags=["Status"])
def root():
    return {
        "name": "TKLab Stampede Detection API",
        "status": "online",
        "version": "1.0.0",
        "endpoints": {
            "websocket": "/ws/analyze?capacity={capacity}&loop={true|false}",
            "batch_video_analysis": "POST /analyze",
            "frame_analysis": "POST /analyze/frame",
            "health": "GET /health",
            "docs": "/docs"
        }
    }


@app.get("/health", tags=["Status"])
def health():
    cuda_available = torch.cuda.is_available()
    device_name = torch.cuda.get_device_name(0) if cuda_available else "CPU"
    return {
        "status": "healthy",
        "model": MODEL_NAME,
        "cuda_available": cuda_available,
        "compute_device": device_name,
        "timestamp": time.time()
    }


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"error": "Internal server error", "detail": str(exc)}
    )