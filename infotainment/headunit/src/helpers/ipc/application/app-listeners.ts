import { ipcMain } from "electron";
import { APP_VERSION_CHANNEL } from "./app-channels";

export function addAppEventListeners() {
    ipcMain.handle(APP_VERSION_CHANNEL, async () => {
        return await process.env.npm_package_version;
    });
}