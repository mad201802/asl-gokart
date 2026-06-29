import { 
    APP_VERSION_CHANNEL, 
    APP_TOGGLE_ANALYTICS_CHANNEL, 
    APP_GET_ANALYTICS_URL_CHANNEL, 
    APP_SET_ANALYTICS_URL_CHANNEL, 
    APP_CHECK_ANALYTICS_CONNECTION_CHANNEL, 
    APP_SET_LOG_LEVEL_CHANNEL, 
    APP_GET_LOG_LEVEL_CHANNEL, 
    APP_GET_ANALYTICS_INTERFACE_CHANNEL, 
    APP_SET_ANALYTICS_INTERFACE_CHANNEL,
    APP_GET_AUTO_START_CHANNEL,
    APP_SET_AUTO_START_CHANNEL,
    APP_GET_FULLSCREEN_STARTUP_CHANNEL,
    APP_SET_FULLSCREEN_STARTUP_CHANNEL,
    APP_GET_DEV_TOOLS_CHANNEL,
    APP_SET_DEV_TOOLS_CHANNEL
} from "./app-channels";

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
        },
        setLogLevel: async (level: string): Promise<string> => {
            return await ipcRenderer.invoke(APP_SET_LOG_LEVEL_CHANNEL, level);
        },
        getLogLevel: async (): Promise<string> => {
            return await ipcRenderer.invoke(APP_GET_LOG_LEVEL_CHANNEL);
        },
        getAnalyticsInterface: async () => {
            return await ipcRenderer.invoke(APP_GET_ANALYTICS_INTERFACE_CHANNEL);
        },
        setAnalyticsInterface: async (mac: string | null) => {
            return await ipcRenderer.invoke(APP_SET_ANALYTICS_INTERFACE_CHANNEL, mac);
        },
        getAutoStart: async (): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_GET_AUTO_START_CHANNEL);
        },
        setAutoStart: async (enabled: boolean): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_SET_AUTO_START_CHANNEL, enabled);
        },
        getFullscreenOnStartup: async (): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_GET_FULLSCREEN_STARTUP_CHANNEL);
        },
        setFullscreenOnStartup: async (enabled: boolean): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_SET_FULLSCREEN_STARTUP_CHANNEL, enabled);
        },
        getDevToolsEnabled: async (): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_GET_DEV_TOOLS_CHANNEL);
        },
        setDevToolsEnabled: async (enabled: boolean): Promise<boolean> => {
            return await ipcRenderer.invoke(APP_SET_DEV_TOOLS_CHANNEL, enabled);
        },
    });
}