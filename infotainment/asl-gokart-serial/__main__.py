import time
import tkinter as tk
from tkinter import ttk
from struct import *
from serial import Serial

class ControllerConnector(object):
    def __init__(self, serialport):
        self.serialport = serialport

    def startSerial(self):
        self.connection = Serial(self.serialport, 19200, timeout=5)

    def getBytes(self, *commands):
        ser = self.connection
        packets = []
        for command in commands:
            ser.write(command)
            packet = ser.read(19)
            packets.append(packet)
        return packets

class KLSReader(object):
    def __init__(self, serialport):
        self.connector = ControllerConnector(serialport)
        self.connector.startSerial()

    def getData(self):
        packet_a, packet_b = self.connector.getBytes(b'\x3A\x00\x3A', b'\x3B\x00\x3B')
        data_a = self.unpackPacketA(packet_a)
        data_b = self.unpackPacketB(packet_b)
        return {**data_a, **data_b}

    def unpackPacketA(self, data):
        (throttle, brakePedal, brakeSwitch, footSwitch, forwardSwitch, reverse,
        hallA, hallB, hallC, batteryVoltage, motorTemp, controllerTemp, settingDir,
        actualDir) = unpack('!2x5B4?3B2?3x', data)

        return {
            'Throttle': throttle,
            'Brake Pedal': brakePedal,
            'Brake Switch': brakeSwitch,
            'Foot Switch': footSwitch,
            'Forward Switch': forwardSwitch,
            'Reverse': reverse,
            'Hall A': hallA,
            'Hall B': hallB,
            'Hall C': hallC,
            'Battery Voltage': batteryVoltage,
            'Motor Temperature': motorTemp,
            'Controller Temperature': controllerTemp,
            'Setting Direction': settingDir,
            'Actual Direction': actualDir
        }

    def unpackPacketB(self, data):
        (rpm, phaseCurrent) = unpack('!4x2H11x', data)

        return {
            'RPM': rpm,
            'Phase Current': phaseCurrent
        }

class MotorControllerUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Motor Controller UI")

        self.controller = KLSReader('COM6')

        self.label = ttk.Label(root, text="Motor Controller Data:")
        self.label.pack()

        self.data_frame = ttk.Frame(root)
        self.data_frame.pack()

        self.data_labels = []
        self.data_values = []

        self.create_data_labels()

        self.update_data()

    def create_data_labels(self):
        labels = [
            "Throttle", "Brake Pedal", "Brake Switch", "Foot Switch", "Forward Switch",
            "Reverse", "Hall A", "Hall B", "Hall C", "Battery Voltage", "Motor Temperature",
            "Controller Temperature", "Setting Direction", "Actual Direction", "RPM", "Phase Current"
        ]

        for label_text in labels:
            label = ttk.Label(self.data_frame, text=label_text + ":")
            label.grid(column=0, row=labels.index(label_text))
            self.data_labels.append(label)

            value = ttk.Label(self.data_frame, text="")
            value.grid(column=1, row=labels.index(label_text))
            self.data_values.append(value)

    def update_data(self):
        data = self.controller.getData()
        for label, value in zip(self.data_labels, self.data_values):
            label_text = label.cget("text").rstrip(":")
            value_text = str(data.get(label_text, ""))
            value.config(text=value_text)
        self.root.after(100, self.update_data)

if __name__ == "__main__":
    root = tk.Tk()
    app = MotorControllerUI(root)
    root.mainloop()
