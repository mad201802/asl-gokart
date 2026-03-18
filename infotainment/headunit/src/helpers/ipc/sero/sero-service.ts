// Import the sero-node module
import {
    SeroRuntime,
} from '@asl-gokart/sero-node';
import { BrowserWindow, ipcMain, ipcRenderer } from 'electron';
import log from 'electron-log/main';
import { SERO_SEND_LIGHTS_CHANNEL, SERO_LIGHTS_MESSAGE_CHANNEL, SERO_BATTERY_MESSAGE_CHANNEL } from './sero-channels';
import { BatteryCommands, LightsCommands, Zones } from '@/data/zonecontrollers/zonecontrollers';
import { IncomingPacket } from '@/data/zonecontrollers/packets';

const UNICAST_PORT = 30491;
const CLIENT_ID = 0x0002;
const RT_INTERVAL = 10; // Interval in milliseconds for processing SeroRuntime events

const rt = new SeroRuntime({
    port: UNICAST_PORT,
    clientId: CLIENT_ID,
});

setInterval(() => rt.process(), RT_INTERVAL);

export function startSeroService(mainWindow: BrowserWindow) {
    log.info("Starting SERO service...");
    
    log.info('SeroRuntime initialized on', rt.getLocalAddress().ip, 'port', rt.getLocalAddress().port);
    
    rt.onServiceFound((serviceId, address) => {
        log.info('Service found:', serviceId, 'at', address);
        if(serviceId == 0x0001) {
            // Subscribe to LED state change events (event ID 0x8001: [left, right])
            rt.subscribeEvent(0x0001, 0x8001, (svcId, evtId, payload) => {
                log.debug(`[SERO] LED state event: left=${payload[0]}, right=${payload[1]}`);
                handleZcLightsEvent(mainWindow, payload);
            });
        }
        if(serviceId == 0x0003) {
            // Subscribe to battery voltage events (event ID 0x8001: float voltage)
            rt.subscribeEvent(0x0003, 0x8001, (svcId, evtId, payload) => {
                log.debug(`[SERO] Battery voltage event: voltage=${payload.readFloatLE(0)}`);
                handleZcBatteryVoltageEvent(mainWindow, payload);
            });
            rt.subscribeEvent(0x0003, 0x8002, (svcId, evtId, payload) => {
                log.debug(`[SERO] Battery current event: current=${payload.readFloatLE(0)}`);
                handleZcBatteryCurrentEvent(mainWindow, payload);
            });
            rt.subscribeEvent(0x0003, 0x8003, (svcId, evtId, payload) => {
                const floatCount = Math.floor(payload.length / 4);
                const tempValues = Array.from({ length: floatCount }, (_, i) => payload.readFloatLE(i * 4));
                log.debug(`[SERO] Battery temperature event: temperatures=[${tempValues.join(', ')}]`);
                handleZcBatteryTemperatureEvent(mainWindow, tempValues);
            });
        }
    });
    
    rt.onServiceLost((service) => {
        log.info('Service lost:', service);
    });
    
    rt.onSubscriptionAck((ack) => {
        log.info('Subscription acknowledged:', ack);
    });

    rt.findService(0x0001);
    rt.findService(0x0003);

    
}

// --- zc_lights ---------------------------------------------------------------------------

function toggleTurnSignal(command: LightsCommands) {
    switch (command) {
        case LightsCommands.SET_TOGGLE_TURN_SIGNAL_LEFT:
            rt.fireAndForget(0x0001, 0x0002);
            break;
        case LightsCommands.SET_TOGGLE_TURN_SIGNAL_RIGHT:
            rt.fireAndForget(0x0001, 0x0003);
            break;
        case LightsCommands.SET_TOGGLE_HAZARD_LIGHTS:
            rt.fireAndForget(0x0001, 0x0004);
            break;
    }
}

function handleZcLightsEvent(mainWindow: BrowserWindow, payload: Buffer<ArrayBufferLike>) {
    const left = payload[0];
    const right = payload[1];
    const incomingPacket: IncomingPacket = {
        zone: Zones.LIGHTS,
        command: LightsCommands.GET_TURN_SIGNAL_LIGHTS,
        value: [left, right],
    };

    mainWindow.webContents.send(SERO_LIGHTS_MESSAGE_CHANNEL, JSON.stringify(incomingPacket));
}

// --- zc_battery ---------------------------------------------------------------------------

function handleZcBatteryVoltageEvent(mainWindow: BrowserWindow, payload: any) {
    const voltage = payload.readFloatLE(0);
    const incomingPacket: IncomingPacket = {
        zone: Zones.BATTERY,
        command: BatteryCommands.GET_VOLTAGE, // Event ID for voltage change
        value: voltage,
    };

    mainWindow.webContents.send(SERO_BATTERY_MESSAGE_CHANNEL, JSON.stringify(incomingPacket));
}

function handleZcBatteryCurrentEvent(mainWindow: BrowserWindow, payload: any) {
    const current = payload.readFloatLE(0);
    const incomingPacket: IncomingPacket = {
        zone: Zones.BATTERY,
        command: BatteryCommands.GET_CURRENT, // Event ID for current change
        value: current,
    };

    mainWindow.webContents.send(SERO_BATTERY_MESSAGE_CHANNEL, JSON.stringify(incomingPacket));
}

function handleZcBatteryTemperatureEvent(mainWindow: BrowserWindow, temps: number[]) {
    const incomingPacket: IncomingPacket = {
        zone: Zones.BATTERY,
        command: BatteryCommands.GET_TEMP,
        value: temps,
    };

    mainWindow.webContents.send(SERO_BATTERY_MESSAGE_CHANNEL, JSON.stringify(incomingPacket));
}

// -----------------------------------------------------------------------------------------

// Handles IPC messages from the renderer
export function registerSeroHandlers() {
    // Listen for commands to control turn signals
    ipcMain.on(SERO_SEND_LIGHTS_CHANNEL, (_, args) => {
        log.debug(`[SERO_SEND_LIGHTS_CHANNEL] Received command: ${JSON.stringify(args)}`);
        const { command } = args;
        toggleTurnSignal(command);
    })
}
