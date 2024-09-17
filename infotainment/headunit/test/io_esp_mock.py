import asyncio
import json
import socketio

# SocketIO server address
SERVER_ADDRESS = 'http://localhost:6969'

sio = socketio.AsyncClient()

@sio.event
async def connect():
    print('connection established')
    # Send a JSON object to the server
    await sio.emit('message', json.dumps({'zone': 'battery'}))
    # Start a background task to handle the sleep and subsequent emission
    sio.start_background_task(background_task)

@sio.event
async def disconnect():
    print('disconnected from server')

async def background_task():
    # wait 5 seconds
    await asyncio.sleep(5)
    # Send another JSON object to the server
    await sio.emit('message', json.dumps(
        {
            'zone': 'battery',
            'command': 'getVoltage',
            'value': 55.8
        }
    ))

async def main():
    await sio.connect(SERVER_ADDRESS)
    # Keep the connection alive
    await sio.wait()

if __name__ == '__main__':
    asyncio.run(main())