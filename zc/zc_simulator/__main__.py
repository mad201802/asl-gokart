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

def smooth_rpm_iterator():
    """Generate smooth RPM values that oscillate between 0 and 1500"""
    value = 0
    step = 50  # Controls the smoothness of transition
    direction = 1  # 1 for increasing, -1 for decreasing
    
    while True:
        # Change direction when reaching limits
        if value >= 1500:
            direction = -1
        elif value <= 0:
            direction = 1
            
        # Update value
        value += step * direction
        # Ensure value stays in range [0, 1500]
        value = max(0.0, min(1500.0, value))
        # Round to nearest integer
        yield int(value)

def smooth_battery_iterator():
    """Generate smooth battery values that oscillate between  and 1500"""
    value = 67.2
    step = 0.05  # Controls the smoothness of transition
    direction = -1  # 1 for increasing, -1 for decreasing
    
    while True:
        # Change direction when reaching limits
        if value >= 67.2:
            direction = -1
        elif value <= 51.6:
            direction = 1
            
        # Update value
        value += step * direction
        # Ensure value stays in range [0, 1500]
        value = max(51.6, min(67.2, value))
        # Round to nearest integer
        yield int(value)


with connect("ws://localhost:6969") as websocket:
    websocket.send(json.dumps(create_register_packet("throttle")))
    websocket.send(json.dumps(create_register_packet("battery")))
    throttle_gen = smooth_throttle_iterator()
    rpm_gen = smooth_rpm_iterator()
    battery_gen = smooth_battery_iterator()
    
    while True:
        throttle_value = next(throttle_gen)
        rpm_value = next(rpm_gen)
        battery_value = next(battery_gen)
        print(f"Throttle: {throttle_value} RPM: {rpm_value} Battery: {battery_value}")
        websocket.send(json.dumps(create_data_packet("throttle", "getThrottle", [throttle_value, throttle_value])))
        websocket.send(json.dumps(create_data_packet("throttle", "getRpm", rpm_value)))
        websocket.send(json.dumps(create_data_packet("battery", "getVoltage", battery_value)))
        time.sleep(0.3 * random.random())  # Sleep for 100ms between messages
