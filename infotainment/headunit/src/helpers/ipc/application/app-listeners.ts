import { app, ipcMain } from "electron";
import { APP_TOGGLE_ANALYTICS_CHANNEL, APP_VERSION_CHANNEL, APP_GET_ANALYTICS_URL_CHANNEL, APP_SET_ANALYTICS_URL_CHANNEL, APP_CHECK_ANALYTICS_CONNECTION_CHANNEL } from "./app-channels";
import { toggleAnalytics, getAnalyticsBackendUrl, setAnalyticsBackendUrl, checkAnalyticsConnection } from "@/helpers/analytics_helpers";

export function addAppEventListeners() {
    ipcMain.handle(APP_VERSION_CHANNEL, async () => {
        return await app.getVersion();
    });
    ipcMain.handle(APP_TOGGLE_ANALYTICS_CHANNEL, async (_, enabled) => {
        return toggleAnalytics(enabled);
    });
    ipcMain.handle(APP_GET_ANALYTICS_URL_CHANNEL, async () => {
        return getAnalyticsBackendUrl();
    });
    ipcMain.handle(APP_SET_ANALYTICS_URL_CHANNEL, async (_, url: string) => {
        setAnalyticsBackendUrl(url);
        return getAnalyticsBackendUrl();
    });
    ipcMain.handle(APP_CHECK_ANALYTICS_CONNECTION_CHANNEL, async (_, url: string) => {
        return checkAnalyticsConnection(url);
    });
}