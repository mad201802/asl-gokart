// Import the sero-node module
import {
    SeroRuntime,
} from '@asl-gokart/sero-node';
import { BrowserWindow, ipcMain, ipcRenderer } from 'electron';
import log from 'electron-log/main';
import { SERO_SEND_LIGHTS_CHANNEL, SERO_LIGHTS_MESSAGE_CHANNEL } from './sero-channels';
import { LightsCommands, Zones } from '@/data/zonecontrollers/zonecontrollers';
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
    });
    
    rt.onServiceLost((service) => {
        log.info('Service lost:', service);
    });
    
    rt.onSubscriptionAck((ack) => {
        log.info('Subscription acknowledged:', ack);
    });

    rt.findService(0x0001);

    
}

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

// Handles IPC messages from the renderer
export function registerSeroHandlers() {
    // Listen for commands to control turn signals
    ipcMain.on(SERO_SEND_LIGHTS_CHANNEL, (_, args) => {
        log.debug(`[SERO_SEND_LIGHTS_CHANNEL] Received command: ${JSON.stringify(args)}`);
        const { command } = args;
        toggleTurnSignal(command);
    })
}
