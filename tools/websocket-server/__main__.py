import asyncio
from websockets.server import serve
import json
import logging

# WebSocket server path
# ws:// + WS_SERVER_PATH + : + WS_SERVER_PORT
# ->  ws://localhost:8765
WS_SERVER_PATH = "localhost"
WS_SERVER_PORT = 8765

async def echo(websocket):
    async for message in websocket:
        data = json.loads(message)
        # print(f"Recieved raw: {data}")
        if "event" in data and "data" in data:
            # Data object matches predefined form
            print(f"Recieved data. Event: {data['event']}, Data: {data['data']}")
            await websocket.send(message)
        else: 
            # Data object does not match predefined form
            logging.error("Recieved invalid data object")
            await websocket.send(json.dumps({"error": "Invalid data object"}))

async def main():
    async with serve(echo, WS_SERVER_PATH, WS_SERVER_PORT):
        await asyncio.Future()  # run forever

asyncio.run(main())