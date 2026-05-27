import {
    FIRMWARE_GET_RELEASES_CHANNEL,
    FIRMWARE_DOWNLOAD_CHANNEL,
    FIRMWARE_TRIGGER_OTA_CHANNEL,
    FIRMWARE_GET_SERVER_URL_CHANNEL,
    FIRMWARE_GET_CACHED_VERSIONS_CHANNEL,
} from './firmware-channels';

export function exposeFirmwareContext(): void {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('firmware', {
        getReleases: async (assetName: string) => {
            return ipcRenderer.invoke(FIRMWARE_GET_RELEASES_CHANNEL, assetName);
        },
        downloadFirmware: async (ecuId: string, tag: string, downloadUrl: string) => {
            return ipcRenderer.invoke(FIRMWARE_DOWNLOAD_CHANNEL, ecuId, tag, downloadUrl);
        },
        triggerOta: async (ecuId: string, tag: string) => {
            return ipcRenderer.invoke(FIRMWARE_TRIGGER_OTA_CHANNEL, ecuId, tag);
        },
        getServerBaseUrl: async () => {
            return ipcRenderer.invoke(FIRMWARE_GET_SERVER_URL_CHANNEL);
        },
        getCachedVersions: async () => {
            return ipcRenderer.invoke(FIRMWARE_GET_CACHED_VERSIONS_CHANNEL);
        },
    });
}
