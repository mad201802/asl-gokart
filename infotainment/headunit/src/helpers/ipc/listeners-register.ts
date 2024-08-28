import { BrowserWindow, ipcMain } from "electron";
import { addThemeEventListeners } from "./theme/theme-listeners";
import { addWindowEventListeners } from "./window/window-listeners";
import { WEBSOCKET_SEND_CHANNEL } from "./websocket/ws-channels";
import { startWebSocketServer } from "./websocket/ws-server";

export default function registerListeners(mainWindow: BrowserWindow) {
    addWindowEventListeners(mainWindow);
    addThemeEventListeners();
    startWebSocketServer(mainWindow);

    // ipcMain.on(WEBSOCKET_SEND_CHANNEL, (event, message) => {
    //     // Senden Sie die Nachricht an alle verbundenen WebSocket-Clients
    //     if (wss) {
    //         wss.clients.forEach((client) => {
    //             if (client.readyState === client.OPEN) {
    //                 client.send(message);
    //             }
    //         });
    //     }
    // });
}
