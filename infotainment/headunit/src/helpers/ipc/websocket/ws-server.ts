import { WebSocket, WebSocketServer } from 'ws';
import { BrowserWindow } from 'electron';
import { BatteryContoller, ThrottleController, ZoneController, Zones } from '@/data/zonecontrollers/zonecontrollers';
import { WEBSOCKET_BATTERY_MESSAGE_CHANNEL, WEBSOCKET_THROTTLE_MESSAGE_CHANNEL } from './ws-channels';

const WSS_PORT = 6969;
export let wss: WebSocketServer;
export let connected_zonecontrollers = new Map<Zones, ZoneController>();

export function startWebSocketServer(mainWindow: BrowserWindow) {
  wss = new WebSocketServer({ port: WSS_PORT, host: '0.0.0.0' });
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      const receivedMsg = JSON.parse(message.toString());
      if(Object.keys(receivedMsg).includes("zone") && !(Object.keys(receivedMsg).includes("command"))) {
        console.log(`Received register packet for zone [${receivedMsg.zone}]`);
        if(Object.values(Zones).includes(receivedMsg.zone)) {
          if(!connected_zonecontrollers.has(receivedMsg.zone)) {
            // Add it to the map of connected zone controllers
            switch(receivedMsg.zone) {
              case Zones.THROTTLE:
                connected_zonecontrollers.set(receivedMsg.zone, new ThrottleController(ws));
                break;
              case Zones.BATTERY:
                connected_zonecontrollers.set(receivedMsg.zone, new BatteryContoller(ws));
                break;
              default:
                console.error("Couldn't register new zone controller: Invalid zone!");
            }
            console.log(`New zone controller connected: ${receivedMsg.zone}`);
            console.log(`Total zone controllers connected: ${connected_zonecontrollers.size}`);
            console.log(Array.from(connected_zonecontrollers.keys()));
          } else {
            console.error(`This zone has already been registered!`)
          }
        } else {
          console.error(`This zone does not exist!`);
        }
      } else {
        console.log("Received data message from zone controller");
        // Find the zone controller that received the message
        connected_zonecontrollers.forEach((zc: ZoneController, zone: Zones) => {
          console.log(`Checking zone controller ${zone}`);
          if(zc.webSocket === ws) {
            console.log(`Found zone controller ${zone}`);
            switch(zone) {
              case Zones.THROTTLE:
                console.log("Forwarding message to ipcRenderer's ThrottleListener");
                mainWindow.webContents.send(WEBSOCKET_THROTTLE_MESSAGE_CHANNEL, message.toString());
                break;
              case Zones.BATTERY:
                console.log("Forwarding message to ipcRenderer's BatteryListener");
                mainWindow.webContents.send(WEBSOCKET_BATTERY_MESSAGE_CHANNEL, message.toString());
                break;
              default:
                console.error("Couldn't send message to ipcRenderer: No zc registered for this message yet!");
            }
          }
        });
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      // Remove the zone controller from the map of connected zone controllers
      connected_zonecontrollers.forEach((zc, key) => {
        if(zc.webSocket === ws) {
          connected_zonecontrollers.delete(key);
          console.log(`Zone controller ${key} disconnected`);
          console.log(`Total zone controllers connected: ${connected_zonecontrollers.size}`);
          console.log(Array.from(connected_zonecontrollers.keys()));
        }
      });

    });

    ws.on('error', (err) => {
      console.error(`WebSocket client error: ${err}`);
    });

    ws.on('ping', () => {
      console.log('Received ping');
    });

    ws.on('pong', () => {
      console.log('Received pong');
    });

    ws.on('unexpected-response', (req, res) => {
      console.error(`Unexpected response: ${res.statusCode}`);
    });
  });

  wss.on('error', (err) => {
    console.error(`WebSocket server error: ${err}`);
  });

  console.log('WebSocket server is running on ws://localhost: ' + WSS_PORT);
}