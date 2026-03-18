import { SERO_BATTERY_MESSAGE_CHANNEL, SERO_LIGHTS_MESSAGE_CHANNEL, SERO_SEND_BATTERY_CHANNEL, SERO_SEND_LIGHTS_CHANNEL } from "./sero-channels";
import { BatteryCommands, LightsCommands } from "@/data/zonecontrollers/zonecontrollers";
require('@asl-gokart/sero-node');

export function exposeSeroContext()  {
    const { contextBridge, ipcRenderer } = window.require('electron');
    
    contextBridge.exposeInMainWorld('sero', {
        // Send commands to the SERO zone controller for lights control
        sendLightsCommand: (command: LightsCommands, value?: boolean | boolean[]) => {
            ipcRenderer.send(SERO_SEND_LIGHTS_CHANNEL, { command, value });
        },
        // Listen for lights status updates from SERO
        onLightsMessage: (callback: (lightsMessage: string) => void) => {
            ipcRenderer.on(SERO_LIGHTS_MESSAGE_CHANNEL, (_, message) => callback(message));
        },

        // Send commands to the SERO zone controller for battery control
        sendBatteryCommand: (command: BatteryCommands, value?: boolean | boolean[]) => {
            ipcRenderer.send(SERO_SEND_BATTERY_CHANNEL, { command, value });
        },
        // Listen for battery status updates from SERO
        onBatteryMessage: (callback: (batteryMessage: string) => void) => {
            ipcRenderer.on(SERO_BATTERY_MESSAGE_CHANNEL, (_, message) => callback(message));
        },
    });
}