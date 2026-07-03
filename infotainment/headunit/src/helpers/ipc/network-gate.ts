import { BrowserWindow, ipcMain } from "electron";
import log from "electron-log/main";
import { getStoredMac, resolveInterfaceByMac } from "./hardware/network-config";

let isReady = false;
let checkInterval: ReturnType<typeof setInterval> | null = null;
let resolveGate: (() => void) | null = null;
let storedMainWindow: BrowserWindow | null = null;

export function isNetworkReady(): boolean {
    return isReady;
}

export function waitForCarNetwork(mainWindow: BrowserWindow): Promise<void> {
    storedMainWindow = mainWindow;
    return new Promise((resolve) => {
        resolveGate = resolve;
        const mac = getStoredMac();
        if (!mac) {
            log.info("[network-gate] No car network interface configured. Skipping gate.");
            isReady = true;
            resolveGate = null;
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
                if (resolveGate) {
                    resolveGate();
                    resolveGate = null;
                }
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
            resolveGate = null;
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

// Register IPC handler to skip/override the network check
ipcMain.handle("network-gate:skip", () => {
    if (isReady) return;
    log.info("[network-gate] Skip/override requested by user.");
    isReady = true;
    if (checkInterval) {
        clearInterval(checkInterval);
        checkInterval = null;
    }
    if (storedMainWindow) {
        storedMainWindow.webContents.send("network-gate:status", { ready: true });
    }
    if (resolveGate) {
        resolveGate();
        resolveGate = null;
    }
});
