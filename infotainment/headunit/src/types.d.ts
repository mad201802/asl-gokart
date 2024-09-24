// This allows TypeScript to pick up the magic constants that's auto-generated by Forge's Vite
// plugin that tells the Electron app where to look for the Vite-bundled app code (depending on

import { WebSocket } from "ws";
import { IncomingPacket, OutgoingPacket, Zones } from "./data/zonecontrollers/packets";

// whether you're running in development or production).
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

// Preload types
interface ThemeModeContext {
    toggle: () => Promise<boolean>;
    dark: () => Promise<void>;
    light: () => Promise<void>;
    system: () => Promise<boolean>;
    current: () => Promise<"dark" | "light" | "system">;
}
interface ElectronWindow {
    minimize: () => Promise<void>;
    maximize: () => Promise<void>;
    close: () => Promise<void>;
}

interface WebSocketContext {
    send: (message: OutgoingPacket, zone: Zones) => void;
    onThrottleMessage: (callback: (throttleMessage: string) => void) => void;
    onBatteryMessage: (callback: (batteryMessage: string) => void) => void;
}


declare global {
    interface Window {
        themeMode: ThemeModeContext;
        electronWindow: ElectronWindow;
        websocket: WebSocketContext;
    }
} 

// declare interface Window {
//     themeMode: ThemeModeContext;
//     electronWindow: ElectronWindow;
//     websocket: WebSocketContext;
// }
