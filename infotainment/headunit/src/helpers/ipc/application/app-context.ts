import { APP_VERSION_CHANNEL } from "./app-channels";

export function exposeAppContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('app', {
        getVersion: async () => {
            return await ipcRenderer.invoke(APP_VERSION_CHANNEL);
        },
    });
}