import asyncio
import websockets
import json

async def test_ws():
    uri = "ws://localhost:8000/ws/analyze"
    print(f"Connecting to {uri}...")
    try:
        async with websockets.connect(uri) as websocket:
            print("Connected! Waiting for messages...")
            # Receive a few frames
            for i in range(3):
                message = await websocket.recv()
                data = json.loads(message)
                if "frame_base64" in data:
                    data["frame_base64"] = f"<base64_string_length_{len(data['frame_base64'])}>"
                
                print(f"\n--- WS Message {i+1} ---")
                print(json.dumps(data, indent=2))
                
            print("\nClosing connection.")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(test_ws())
