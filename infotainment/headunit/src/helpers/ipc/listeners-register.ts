import { BrowserWindow, ipcMain } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { WEBSOCKET_SEND_CHANNEL } from "./websocket/ws-channels";
import { connected_zonecontrollers, startWebSocketServer, wss } from "./websocket/ws-server";
import { OutgoingZoneControllerMessage } from "@/data/models";
import { WebSocket } from "ws";
import { Zones } from "@/data/controlling_models/main";

export default function registerListeners(mainWindow: BrowserWindow) {
    addWindowEventListeners(mainWindow);
    addThemeEventListeners();
    startWebSocketServer(mainWindow);

    ipcMain.on(WEBSOCKET_SEND_CHANNEL, (event, message: OutgoingZoneControllerMessage, zone: Zones) => {
        // Send the message to the zone controller matching the specified zone
        if (wss) {
            connected_zonecontrollers.forEach((ws: WebSocket, key: string) => {
                if (key === zone) {
                    ws.send(JSON.stringify(message));
                    console.log(`Sent message to [${key}] zone controller : ${JSON.stringify(message)}`);
                }
            });
        }
    });
}
