import json
import numpy as np
from websockets.sync.client import connect
import time
import random

# JSON data model for a zone controller register message

# ReigsterPacket

def create_register_packet(zone: str):
    return {
        "zone": zone,
    }

def create_data_packet(zone: str, command: str, value):
    return {
        "zone": zone,
        "command": command,
        "value": value
    }
def smooth_throttle_iterator():
    """Generate smooth throttle values that oscillate between 0 and 1"""
    value = 0.0
    step = 0.05  # Controls the smoothness of transition
    direction = 1  # 1 for increasing, -1 for decreasing
    
    while True:
        # Change direction when reaching limits
        if value >= 1.0:
            direction = -1
        elif value <= 0.0:
            direction = 1
            
        # Update value
        value += step * direction
        # Ensure value stays in range [0, 1]
        value = max(0.0, min(1.0, value))
        # Round to 1 decimal place
        yield round(value, 1)


with connect("ws://localhost:6969") as websocket:
    websocket.send(json.dumps(create_register_packet("throttle")))
    throttle_gen = smooth_throttle_iterator()
    
    while True:
        throttle_value = next(throttle_gen)
        print(f"Throttle: {throttle_value}")
        websocket.send(json.dumps(create_data_packet("throttle", "getThrottle", [throttle_value, throttle_value])))
        time.sleep(0.3 * random.random())  # Sleep for 100ms between messages


