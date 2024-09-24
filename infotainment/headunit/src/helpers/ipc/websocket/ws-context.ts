import { WEBSOCKET_BATTERY_MESSAGE_CHANNEL, WEBSOCKET_MESSAGE_CHANNEL, WEBSOCKET_SEND_CHANNEL, WEBSOCKET_THROTTLE_MESSAGE_CHANNEL } from './ws-channels';
import { WebSocket } from 'ws';
import { IncomingPacket, OutgoingPacket } from '@/data/zonecontrollers/packets';
import { Zones } from '@/data/zonecontrollers/zonecontrollers';

export function exposeWebSocketContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('websocket', {
        send: (message: OutgoingPacket, zone: Zones) => {
            ipcRenderer.send(WEBSOCKET_SEND_CHANNEL, message, zone); 

        },
        onThrottleMessage: (callback: (throttleMessage: string) => void) => {
            ipcRenderer.on(WEBSOCKET_THROTTLE_MESSAGE_CHANNEL, (_, message) => callback(message));
        },
        onBatteryMessage: (callback: (batteryMessage: string) => void) => {
            ipcRenderer.on(WEBSOCKET_BATTERY_MESSAGE_CHANNEL, (_, message) => callback(message));
        },
    });
}