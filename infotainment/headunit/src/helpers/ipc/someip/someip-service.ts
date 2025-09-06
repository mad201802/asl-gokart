import { BrowserWindow, ipcMain, ipcRenderer } from 'electron';
import { SOMEIP_LIGHTS_MESSAGE_CHANNEL, SOMEIP_SEND_LIGHTS_CHANNEL } from './someip-channels';
import { LightsCommands, Zones } from '@/data/zonecontrollers/zonecontrollers';
import { IncomingPacket } from '@/data/zonecontrollers/packets';

// Import from the someip-node module
import {
  ServiceApplication,
} from '@asl-gokart/someip-node';

// SOMEIP service IDs
const HEADUNIT_SERVICE_ID = 0x0004; // Service ID for headunit
const ZC_LIGHTS_SERVICE_ID = 0x0001;   // Service ID for lights zone controller

// SOMEIP method IDs
const TOGGLE_TURN_SIGNAL_LEFT_METHOD_ID = 0x0001; // Method ID for left turn signal control
const TOGGLE_TURN_SIGNAL_RIGHT_METHOD_ID = 0x0002; // Method ID for right turn signal control
const TOGGLE_HAZARD_LIGHTS_METHOD_ID = 0x0003; // Method ID for hazard lights control

// SOMEIP event IDs
const TURN_SIGNALS_EVENT_ID = 0x0002;  // Event ID for turn signals status

// Function to create a SomeIpApplication and start it
let someipApp: ServiceApplication | null = null;

export function startSomeipService(mainWindow: BrowserWindow) {
    try {
        console.log("Starting SOMEIP service...");
        
        // Create a new SomeIP application for the headunit
        someipApp = new ServiceApplication(HEADUNIT_SERVICE_ID);
        // Initialize the application
        someipApp.init();
        
        console.log("SOMEIP service initialized");
        
        // Subscribe to the turn signals event to get status updates
        // This is a one-way notification from the lights controller to the headunit
        someipApp.offerEvent(TURN_SIGNALS_EVENT_ID);
        
        // Start the application
        someipApp.start(false);
        console.log("SOMEIP service started");
        
        // Setup listeners for turn signal events
        setupTurnSignalEventHandling(mainWindow);
    } catch (error) {
        console.error("Failed to start SOMEIP service:", error);
    }
}

// Function to handle turn signal events and forward them to the renderer
function setupTurnSignalEventHandling(mainWindow: BrowserWindow) {
    console.log("Setting up turn signal event handling");
    someipApp?.subscribe(ZC_LIGHTS_SERVICE_ID, TURN_SIGNALS_EVENT_ID, (payload) => {
        console.log(`Turn Signal Event received in the backend: ${payload.toString()}`)
        const incomingPacket: IncomingPacket = {
            zone: Zones.LIGHTS,
            command: LightsCommands.GET_TURN_SIGNAL_LIGHTS,
            value: payload
        }

        mainWindow.webContents.send(SOMEIP_LIGHTS_MESSAGE_CHANNEL, JSON.stringify(incomingPacket));
        return 0;
    });

}

function toggleTurnSignal(command: LightsCommands) {
    switch (command) {
        case LightsCommands.SET_TOGGLE_TURN_SIGNAL_LEFT:
            someipApp?.callMethod(ZC_LIGHTS_SERVICE_ID, TOGGLE_TURN_SIGNAL_LEFT_METHOD_ID, [0x01], () =>  {return 0})
            break;
        case LightsCommands.SET_TOGGLE_TURN_SIGNAL_RIGHT:
            someipApp?.callMethod(ZC_LIGHTS_SERVICE_ID, TOGGLE_TURN_SIGNAL_RIGHT_METHOD_ID, [0x01], () =>  {return 0})
            break;
        case LightsCommands.SET_TOGGLE_HAZARD_LIGHTS:
            someipApp?.callMethod(ZC_LIGHTS_SERVICE_ID, TOGGLE_HAZARD_LIGHTS_METHOD_ID, [0x01], () =>  {return 0})
            break;
    }
}

// Handle IPC messages from the renderer
export function registerSomeipHandlers() {
    // Listen for commands to control turn signals
    ipcMain.on(SOMEIP_SEND_LIGHTS_CHANNEL, (_, args) => {
        const { command } = args;
        toggleTurnSignal(command);
    });
}
