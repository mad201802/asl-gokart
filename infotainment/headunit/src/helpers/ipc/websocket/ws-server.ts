import { WebSocket, WebSocketServer } from 'ws';
import { BrowserWindow } from 'electron';
import { Zones } from 'src/data/controlling_models/zc';

const WSS_PORT = 6969;
export let wss: WebSocketServer;
export let connected_zonecontrollers = new Map<string, WebSocket>();

export function startWebSocketServer(mainWindow: BrowserWindow) {
  wss = new WebSocketServer({ port: WSS_PORT, host: '0.0.0.0' });
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      console.log(`Received message: ${message}`);
      const zone = JSON.parse(message.toString()).zone;

      // Check if the zone controller is already connected
      if(!connected_zonecontrollers.has(zone)) {
        
        /* ######### THIS DOES NOT WORK ######### */
        // Check if the zone controller is a valid zone
//        if(Object.values(Zones).includes(zone)) {

          // Add it to the map of connected zone controllers
          connected_zonecontrollers.set(zone, ws);
          console.log(`New zone controller connected: ${zone}`);
          console.log(`Total zone controllers connected: ${connected_zonecontrollers.size}`);
          console.log(Array.from(connected_zonecontrollers.keys()));
        } else {
          console.log(`Invalid zone controller [${zone}].`);
          console.log('Closing connection...');
          ws.close();
        }
//      } else {
        // Send the message to the renderer process
        mainWindow.webContents.send('websocket-message', message.toString());
//      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove the zone controller from the map of connected zone controllers
      connected_zonecontrollers.forEach((value, key) => {
        if(value === ws) {
          connected_zonecontrollers.delete(key);
          console.log(`Zone controller ${key} disconnected`);
          console.log(`Total zone controllers connected: ${connected_zonecontrollers.size}`);
          console.log(Array.from(connected_zonecontrollers.keys()));
        }
      });

    });
  });
  console.log('WebSocket server is running on ws://localhost: ' + WSS_PORT);
}