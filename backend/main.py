from fastapi import FastAPI

app = FastAPI(title="Stampede Detection API")


@app.get("/")
def root():
    return {
        "message": "Stampede Detection API is running"
    }