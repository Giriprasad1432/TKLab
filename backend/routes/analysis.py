from fastapi import APIRouter

router = APIRouter()

@router.get("/")
def analyze():
    return {"status": "analysis complete"}
