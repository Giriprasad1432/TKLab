import requests
import json
import time

url = "http://localhost:8000/analyze"
video_path = "c:/Users/girib/Desktop/Giri/TKLab/backend/test/crowd.mp4"

print(f"Testing POST /analyze with {video_path}...")
start = time.time()
with open(video_path, "rb") as f:
    files = {"video": f}
    data = {"capacity": 50}
    response = requests.post(url, files=files, data=data)

print(f"Request took {time.time() - start:.2f}s")
print(f"Status Code: {response.status_code}")

if response.status_code == 200:
    res_json = response.json()
    print("\n--- JSON Sample Response ---")
    print(json.dumps(res_json, indent=2))
else:
    print(response.text)
