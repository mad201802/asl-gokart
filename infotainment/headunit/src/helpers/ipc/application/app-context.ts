import { APP_VERSION_CHANNEL, APP_TOGGLE_ANALYTICS_CHANNEL, APP_GET_ANALYTICS_URL_CHANNEL, APP_SET_ANALYTICS_URL_CHANNEL, APP_CHECK_ANALYTICS_CONNECTION_CHANNEL } from "./app-channels";

export function exposeAppContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('app', {
        getVersion: async () => {
            return await ipcRenderer.invoke(APP_VERSION_CHANNEL);
        },
        toggleAnalytics: async (enabled: boolean): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_TOGGLE_ANALYTICS_CHANNEL, enabled);
        },
        getAnalyticsUrl: async (): Promise<string> => {
            return await ipcRenderer.invoke(APP_GET_ANALYTICS_URL_CHANNEL);
        },
        setAnalyticsUrl: async (url: string): Promise<string> => {
            return await ipcRenderer.invoke(APP_SET_ANALYTICS_URL_CHANNEL, url);
        },
        checkAnalyticsConnection: async (url: string): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_CHECK_ANALYTICS_CONNECTION_CHANNEL, url);
        }
    });
}