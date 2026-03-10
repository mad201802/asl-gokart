// Import the sero-node module
import {
    SeroRuntime,
} from '@asl-gokart/sero-node';
import { BrowserWindow, ipcMain, ipcRenderer } from 'electron';
import log from 'electron-log/main';
import { SERO_SEND_LIGHTS_CHANNEL } from './sero-channels';
import { LightsCommands } from '@/data/zonecontrollers/zonecontrollers';

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
            log.info('SERO zone controller found, sending initial status request...');
            rt.fireAndForget(0x0001, 0x0002); // Example command to request initial status
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

// Handles IPC messages from the renderer
export function registerSeroHandlers() {
    // Listen for commands to control turn signals
    ipcMain.on(SERO_SEND_LIGHTS_CHANNEL, (_, args) => {
        log.info(`[SERO_SEND_LIGHTS_CHANNEL] Received command: ${JSON.stringify(args)}`);
        const { command } = args;
        toggleTurnSignal(command);
    })
}
