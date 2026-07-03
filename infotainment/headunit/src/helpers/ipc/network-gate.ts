import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log/main";
import { getStoredMac, resolveInterfaceByMac } from "./hardware/network-config";

let isReady = false;
let checkInterval: ReturnType<typeof setInterval> | null = null;

export function isNetworkReady(): boolean {
    return isReady;
}

export function waitForCarNetwork(mainWindow: BrowserWindow): Promise<void> {
    return new Promise((resolve) => {
        const mac = getStoredMac();
        if (!mac) {
            log.info("[network-gate] No car network interface configured. Skipping gate.");
            isReady = true;
            resolve();
            return;
        }

        const check = () => {
            const resolved = resolveInterfaceByMac(mac);
            if (resolved) {
                log.info(`[network-gate] Car network interface found on ${resolved.name} (${resolved.address}). Ready.`);
                isReady = true;
                if (checkInterval) {
                    clearInterval(checkInterval);
                    checkInterval = null;
                }
                mainWindow.webContents.send("network-gate:status", { ready: true });
                resolve();
            } else {
                log.info(`[network-gate] Waiting for car network interface with MAC: ${mac}...`);
                mainWindow.webContents.send("network-gate:status", { ready: false });
            }
        };

        // Initial check
        const resolved = resolveInterfaceByMac(mac);
        if (resolved) {
            log.info(`[network-gate] Car network interface found immediately on ${resolved.name} (${resolved.address}).`);
            isReady = true;
            resolve();
            return;
        }

        // Poll every 2 seconds
        // ponytail: Keep it simple, just poll os.networkInterfaces() periodically
        checkInterval = setInterval(check, 2000);
    });
}

// Register IPC handler so renderer can ask for the status on mount
ipcMain.handle("network-gate:get-status", () => {
    return isReady;
});
