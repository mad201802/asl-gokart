# This script connects to the socket.io websocket server of the headunit and sends a message to the server.

import socketio
import time

sio = socketio.Client()

@sio.event
def connect():
    print('connection established')
    sio.emit('message', 'Hello from Python!')

@sio.event
def disconnect():
    print('disconnected from server')

def send_message():
    while True:
        message = input("Enter a message to send to the server (or 'exit' to quit): ")
        if message.lower() == 'exit':
            break
        sio.emit('message', message)

sio.connect('http://localhost:4321')
send_message()
sio.disconnect()
