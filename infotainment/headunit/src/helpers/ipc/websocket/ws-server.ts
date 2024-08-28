import { WebSocketServer } from 'ws';
import { BrowserWindow } from 'electron';

const WSS_PORT = 6969;

export function startWebSocketServer(mainWindow: BrowserWindow) {
  const wss: WebSocketServer = new WebSocketServer({ port: WSS_PORT, host: '0.0.0.0' });
  wss.on('connection', (ws) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      console.log(`Received message: ${message}`);
      mainWindow.webContents.send('websocket-message', message.toString());
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });
  console.log('WebSocket server is running on ws://localhost: ' + WSS_PORT);
}