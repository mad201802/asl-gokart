import {
    UPDATER_GET_RELEASES_CHANNEL,
    UPDATER_INSTALL_CHANNEL,
    UPDATER_PROGRESS_CHANNEL,
    UPDATER_RELAUNCH_CHANNEL,
} from './updater-channels';

export function exposeUpdaterContext(): void {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('updater', {
        getReleases: async () => {
            return ipcRenderer.invoke(UPDATER_GET_RELEASES_CHANNEL);
        },
        install: async (tag: string, downloadUrl: string, assetName: string) => {
            return ipcRenderer.invoke(UPDATER_INSTALL_CHANNEL, tag, downloadUrl, assetName);
        },
        onProgress: (callback: (progress: { percent: number; bytesDownloaded: number; totalBytes: number }) => void) => {
            const listener = (_event: Electron.IpcRendererEvent, progress: { percent: number; bytesDownloaded: number; totalBytes: number }) => {
                callback(progress);
            };
            ipcRenderer.on(UPDATER_PROGRESS_CHANNEL, listener);
            return () => ipcRenderer.removeListener(UPDATER_PROGRESS_CHANNEL, listener);
        },
        relaunch: async () => {
            return ipcRenderer.invoke(UPDATER_RELAUNCH_CHANNEL);
        },
    });
}
