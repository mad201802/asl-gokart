import { SOMEIP_LIGHTS_MESSAGE_CHANNEL, SOMEIP_SEND_LIGHTS_CHANNEL } from './someip-channels';
import { LightsCommands } from '@/data/zonecontrollers/zonecontrollers';
require('@asl-gokart/someip-node');

export function exposeSomeipContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('someip', {
        // Send commands to the SOMEIP zone controller for lights control
        sendLightsCommand: (command: LightsCommands, value?: boolean | boolean[]) => {
            ipcRenderer.send(SOMEIP_SEND_LIGHTS_CHANNEL, { command, value });
        },
        
        // Listen for lights status updates from SOMEIP
        onLightsMessage: (callback: (lightsMessage: string) => void) => {
            ipcRenderer.on(SOMEIP_LIGHTS_MESSAGE_CHANNEL, (_, message) => callback(message));
        },
    });
}
