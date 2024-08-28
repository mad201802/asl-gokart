import { WEBSOCKET_MESSAGE_CHANNEL, WEBSOCKET_SEND_CHANNEL } from './ws-channels';

export function exposeWebSocketContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('websocket', {
        send: (message: string) => ipcRenderer.send(WEBSOCKET_SEND_CHANNEL, message),
        onMessage: (callback: (message: string) => void) => {
            ipcRenderer.on(WEBSOCKET_MESSAGE_CHANNEL, (_, message) => callback(message));
        }
    });
}