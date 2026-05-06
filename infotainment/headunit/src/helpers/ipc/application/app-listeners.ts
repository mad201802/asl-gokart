import { app, ipcMain } from "electron";
import log from "electron-log/main";
import { APP_TOGGLE_ANALYTICS_CHANNEL, APP_VERSION_CHANNEL, APP_GET_ANALYTICS_URL_CHANNEL, APP_SET_ANALYTICS_URL_CHANNEL, APP_CHECK_ANALYTICS_CONNECTION_CHANNEL, APP_SET_LOG_LEVEL_CHANNEL, APP_GET_LOG_LEVEL_CHANNEL, APP_GET_ANALYTICS_INTERFACE_CHANNEL, APP_SET_ANALYTICS_INTERFACE_CHANNEL } from "./app-channels";
import { toggleAnalytics, getAnalyticsBackendUrl, setAnalyticsBackendUrl, checkAnalyticsConnection } from "@/helpers/analytics_helpers";
import { getCurrentAnalyticsInterface, setStoredAnalyticsMac } from "@/helpers/ipc/hardware/network-config";
import type { LogLevel } from "@/lib/logger";

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
    ipcMain.handle(APP_SET_LOG_LEVEL_CHANNEL, async (_, level: LogLevel) => {
        log.transports.console.level = level;
        log.transports.file.level = level;
        log.info(`Log level changed to: ${level}`);
        return level;
    });
    ipcMain.handle(APP_GET_LOG_LEVEL_CHANNEL, async () => {
        return (log.transports.console.level as string) ?? "info";
    });
    ipcMain.handle(APP_GET_ANALYTICS_INTERFACE_CHANNEL, async () => {
        return getCurrentAnalyticsInterface();
    });
    ipcMain.handle(APP_SET_ANALYTICS_INTERFACE_CHANNEL, async (_, mac: string | null) => {
        setStoredAnalyticsMac(mac);
        log.info(`[app] Analytics interface set to MAC: ${mac ?? "(none — OS default routing)"}`);
        return getCurrentAnalyticsInterface();
    });
}