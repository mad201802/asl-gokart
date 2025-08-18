import { app, ipcMain } from "electron";
import { APP_TOGGLE_ANALYTICS_CHANNEL, APP_VERSION_CHANNEL } from "./app-channels";
import { toggleAnalytics } from "@/helpers/analytics_helpers";

export function addAppEventListeners() {
    ipcMain.handle(APP_VERSION_CHANNEL, async () => {
        return await app.getVersion();
    });
    ipcMain.handle(APP_TOGGLE_ANALYTICS_CHANNEL, async (_, enabled) => {
        return toggleAnalytics(enabled);
    })
}