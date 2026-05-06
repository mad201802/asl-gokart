import {
    GET_AVAILABLE_NETWORK_INTERFACES_CHANNEL,
    SET_NETWORK_INTERFACE_CHANNEL,
    GET_NETWORK_INTERFACE_CHANNEL,
} from "./hardware-channels";

export function exposeHardwareContext() {
    const { contextBridge, ipcRenderer } = window.require('electron');

    contextBridge.exposeInMainWorld('hardware', {
        getAvailableNetworkInterfaces: async () => {
            return await ipcRenderer.invoke(GET_AVAILABLE_NETWORK_INTERFACES_CHANNEL);
        },
        getNetworkInterface: async () => {
            return await ipcRenderer.invoke(GET_NETWORK_INTERFACE_CHANNEL);
        },
        setNetworkInterface: async (mac:string) => {
            return await ipcRenderer.invoke(SET_NETWORK_INTERFACE_CHANNEL, mac);
        }
    });
}