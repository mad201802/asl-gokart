import asyncio
import websockets
import json

async def send_json():
    uri = "ws://192.168.1.100:6969"  # Replace with your WebSocket server URL

    async with websockets.connect(uri) as websocket:
        print("Connected to server")

        # Create a JSON object to send
        data = {
            "zone": "throttle",  # Custom message type
        }

        # Convert the Python dictionary to a JSON-formatted string
        json_data = json.dumps(data)

        # Send the JSON message over the WebSocket connection
        await websocket.send(json_data)
        print(f"Sent JSON: {json_data}")
        await asyncio.sleep(5)
        await websocket.ping()
        # Wait for a response from the server
        response = await websocket.recv()
        print(f"Received response: {response}")

asyncio.run(send_json())
