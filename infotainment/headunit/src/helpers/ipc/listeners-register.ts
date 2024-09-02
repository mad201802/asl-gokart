import { BrowserWindow, ipcMain } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { WEBSOCKET_SEND_CHANNEL, WEBSOCKET_THROTTLE_MESSAGE_CHANNEL } from "./websocket/ws-channels";
import { connected_zonecontrollers, startWebSocketServer, wss } from "./websocket/ws-server";
import { OutgoingPacket } from "@/data/zonecontrollers/packets";
import { WebSocket } from "ws";
import { ZoneController, Zones } from "@/data/zonecontrollers/zonecontrollers";

export default function registerListeners(mainWindow: BrowserWindow) {
    addWindowEventListeners(mainWindow);
    addThemeEventListeners();
    startWebSocketServer(mainWindow);

    ipcMain.on(WEBSOCKET_SEND_CHANNEL, (event, message: OutgoingPacket, zoneToSendTo: Zones) => {
        // Send the message to the zone controller matching the specified zone
        if (wss) {
            connected_zonecontrollers.forEach((zc: ZoneController, z: Zones) => {
                if (z === zoneToSendTo) {
                    zc.webSocket.send(JSON.stringify(message));
                    console.log(`[WEBSOCKET_SEND_CHANNEL] Sent message to [${z}] zone controller : ${JSON.stringify(message)}`);
                }
            });
        }
    });
}
