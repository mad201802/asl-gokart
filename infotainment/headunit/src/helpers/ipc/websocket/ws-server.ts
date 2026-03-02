import { BrowserWindow } from 'electron';
import log from 'electron-log/main';
import { BatteryContoller, ThrottleController, ZoneController, Zones } from '@/data/zonecontrollers/zonecontrollers';
import { WEBSOCKET_BATTERY_MESSAGE_CHANNEL, WEBSOCKET_THROTTLE_MESSAGE_CHANNEL, WEBSOCKET_BUTTONS_MESSAGE_CHANNEL, WEBSOCKET_LIGHTS_MESSAGE_CHANNEL } from './ws-channels';
import * as http from 'http';
import { ButtonHandler } from './handlers/button-handler';
import { defaultButtonMappings } from './handlers/default-mapping';
import { processAnalytics } from '@/helpers/analytics_helpers';
const WebSocket = require('faye-websocket').WebSocket;

const WSS_PORT = 6969;
export let connected_zonecontrollers = new Map<Zones, ZoneController>();

const buttonHandler: ButtonHandler = new ButtonHandler(defaultButtonMappings);

export function startWebSocketServer(mainWindow: BrowserWindow) {
  const server = http.createServer();

  server.on('upgrade', (req, socket, head) => {
    if (WebSocket.isWebSocket(req)) {
      const ws = new WebSocket(req, socket, head);

      log.info('WebSocket client connected');

      ws.on('message', (event: any) => {
        // TODO: add zod message validation
        const message = event.data;
        const receivedMsg = JSON.parse(message.toString());

        if (receivedMsg.zone && !receivedMsg.command) {
          log.info(`Received register packet for zone [${receivedMsg.zone}]`);

          if (Object.values(Zones).includes(receivedMsg.zone)) {
            // if (!connected_zonecontrollers.has(receivedMsg.zone)) {
              switch (receivedMsg.zone) {
                case Zones.THROTTLE:
                  connected_zonecontrollers.set(receivedMsg.zone, new ThrottleController(ws));
                  break;
                case Zones.BATTERY:
                  connected_zonecontrollers.set(receivedMsg.zone, new BatteryContoller(ws));
                  break;
                case Zones.BUTTONS:
                  connected_zonecontrollers.set(receivedMsg.zone, new ZoneController(ws));
                  break;
                case Zones.LIGHTS:
                  connected_zonecontrollers.set(receivedMsg.zone, new ZoneController(ws));
                  break;
                default:
                  log.error("Couldn't register new zone controller: Invalid zone!");
              }

              log.info(`New zone controller connected: ${receivedMsg.zone}`);
              log.info(`Total zone controllers connected: ${connected_zonecontrollers.size}`);
              log.info(Array.from(connected_zonecontrollers.keys()));
            // } else {
            //   console.error(`This zone has already been registered!`);
            // }
          } else {
            log.error(`This zone does not exist!`);
          }
        } else {
          log.debug("Received data message from zone controller");

          // Find the zone controller that received the message
          connected_zonecontrollers.forEach((zc: ZoneController, zone: Zones) => {
            // console.log(`Checking zone controller ${zone}`);

            if (zc.webSocket === ws) {
              // console.log(`Found zone controller ${zone}`);
              switch (zone) {
                case Zones.THROTTLE:
                  log.debug("Forwarding message to ipcRenderer's ThrottleListener:");
                  log.debug(message.toString());
                  mainWindow.webContents.send(WEBSOCKET_THROTTLE_MESSAGE_CHANNEL, message.toString());
                  processAnalytics(message.toString());
                  break;
                case Zones.BATTERY:
                  log.debug("Forwarding message to ipcRenderer's BatteryListener:");
                  log.debug(message.toString());
                  mainWindow.webContents.send(WEBSOCKET_BATTERY_MESSAGE_CHANNEL, message.toString());
                  processAnalytics(message.toString());
                  break;
                case Zones.BUTTONS:
                  log.debug("Forwarding message to ipcRenderer's ButtonsListener:");
                  log.debug(message.toString());
                  // mainWindow.webContents.send(WEBSOCKET_BUTTONS_MESSAGE_CHANNEL, message.toString());

                  // Send the message to the ButtonHandler
                  buttonHandler.handleIncomingButtonMessage(JSON.parse(message.toString()));
                  break;
                case Zones.LIGHTS:
                  log.debug("Forwarding message to ipcRenderer's LightsListener:");
                  log.debug(message.toString());
                  mainWindow.webContents.send(WEBSOCKET_LIGHTS_MESSAGE_CHANNEL, message.toString());
                  break;
                default:
                  log.error("Couldn't send message to ipcRenderer: No zc registered for this message yet!");
              }
            }
          });
        }
      });

      ws.on('close', () => {
        log.info(`WebSocket client disconnected. Code: ${ws.code} | Reason: ${ws.reason}`);

        // Remove the zone controller from the map
        connected_zonecontrollers.forEach((zc, key) => {
          if (zc.webSocket === ws) {
            connected_zonecontrollers.delete(key);
            log.info(`Zone controller ${key} disconnected`);
            log.info(`Total zone controllers connected: ${connected_zonecontrollers.size}`);
            log.info(Array.from(connected_zonecontrollers.keys()));
          }
        });

        ws.close();
      });

      ws.on('error', (err: any) => {
        log.error(`WebSocket client error: ${err.name} | ${err.message} | ${err.stack}`);
      });
    }
  });

  server.listen(WSS_PORT, '0.0.0.0', () => {
    log.info('WebSocket server is running on ws://0.0.0.0:' + WSS_PORT);
  });

  server.on('error', (err) => {
    log.error(`WebSocket server error name: ${err.name}`);
    log.error(`WebSocket server error: ${err.message}`);
    log.error(`WebSocket server error stack: ${err.stack}`);
    log.error(`WebSocket server error cause: ${err.cause}`);
  });
}
