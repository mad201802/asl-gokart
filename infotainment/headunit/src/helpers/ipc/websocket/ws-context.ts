import { IncomingZoneControllerMessage, OutgoingZoneControllerMessage } from '@/data/models';
import { WEBSOCKET_MESSAGE_CHANNEL, WEBSOCKET_SEND_CHANNEL } from './ws-channels';
import { WebSocket } from 'ws';
import { Zones } from '@/data/controlling_models/zc';

export function exposeWebSocketContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('websocket', {
        send: (message: OutgoingZoneControllerMessage, zone: Zones) => {
            ipcRenderer.send(WEBSOCKET_SEND_CHANNEL, message, zone); 

        },
        onMessage: (callback: (message: IncomingZoneControllerMessage, ws: WebSocket) => void) => {
            ipcRenderer.on(WEBSOCKET_MESSAGE_CHANNEL, (_, message, ws) => callback(message, ws));
        }
    });
}