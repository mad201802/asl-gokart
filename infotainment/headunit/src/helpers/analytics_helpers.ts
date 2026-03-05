import { SensorData } from "@/data/analytics/sensor-data";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { BatteryCommands, ThrottleCommands, Zones } from "@/data/zonecontrollers/zonecontrollers";
import log from "electron-log/main";


let analyticsBackendUrl = "http://localhost:3000/api/gokart";
const COMMAND_RATE_LIMITS: Record<string, number> = {
    [ThrottleCommands.GET_THROTTLE]: 1000,
    [ThrottleCommands.GET_RPM]: 1000,
    [BatteryCommands.GET_VOLTAGE]: 1000,
    [BatteryCommands.GET_CURRENT]: 1000,
    [BatteryCommands.GET_TEMP]: 1000,
    [BatteryCommands.GET_CHARGE]: 1000,
    [BatteryCommands.GET_POWER]: 1000,
};

let analyticsEnabled = false;
const lastSentTimestamps: Record<string, number> = {};

export function setAnalyticsBackendUrl(url: string): void {
    analyticsBackendUrl = url;
}

export function getAnalyticsBackendUrl(): string {
    return analyticsBackendUrl;
}

export async function checkAnalyticsConnection(url: string): Promise<boolean> {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        const response = await fetch(url, {
            method: 'GET',
            signal: controller.signal,
        });
        clearTimeout(timeout);
        return response.ok;
    } catch {
        return false;
    }
}

export function toggleAnalytics(enabled: boolean): boolean {
    analyticsEnabled = enabled;
    return analyticsEnabled;
}

export function isAnalyticsEnabled(): boolean {
    return analyticsEnabled;
}

export function processAnalytics(message: string): void {
    if (!analyticsEnabled) {
        log.debug("Analytics is disabled, skipping processing.");
        return;
    }

    const parsedMessage: IncomingPacket = JSON.parse(message);

    let sensorData: SensorData;

    switch(parsedMessage.command) {
        case ThrottleCommands.GET_THROTTLE:
            sensorData = {
                name: "rawThrottle",
                value: Number(Array.isArray(parsedMessage.value) ? parsedMessage.value[0] : parsedMessage.value),
                unit: "%",
                timestamp: new Date().toISOString()
            };
            break;
        case ThrottleCommands.GET_RPM:
            sensorData = {
                name: "rpm",
                value: Number(parsedMessage.value),
                unit: "RPM",
                timestamp: new Date().toISOString()
            };
            break;
        case BatteryCommands.GET_VOLTAGE:
            sensorData = {
                name: "batteryVoltage",
                value: Number(parsedMessage.value),
                unit: "V",
                timestamp: new Date().toISOString()
            };
            break;
        case BatteryCommands.GET_CURRENT:
            sensorData = {
                name: "batteryCurrent",
                value: Number(parsedMessage.value),
                unit: "A",
                timestamp: new Date().toISOString()
            };
            break;
        case BatteryCommands.GET_TEMP:
            sensorData = {
                name: "batteryTemp",
                value: Number(parsedMessage.value),
                unit: "°C",
                timestamp: new Date().toISOString()
            };
            break;
        case BatteryCommands.GET_CHARGE:
            sensorData = {
                name: "batteryCharge",
                value: Number(parsedMessage.value),
                unit: "%",
                timestamp: new Date().toISOString()
            };
            break;
        case BatteryCommands.GET_POWER:
            sensorData = {
                name: "batteryPower",
                value: Number(parsedMessage.value),
                unit: "W",
                timestamp: new Date().toISOString()
            };
            break;
        default:
            return;
    }

    if (isNaN(sensorData.value)) {
        log.error(`Invalid numeric value for ${sensorData.name}:`, parsedMessage.value);
        return;
    }

    const now = Date.now();
    const rateLimit = COMMAND_RATE_LIMITS[parsedMessage.command] ?? 1000;
    if(now - (lastSentTimestamps[parsedMessage.command] ?? 0) < rateLimit) {
        // console.log(`Rate limit exceeded for command: ${parsedMessage.command}. Need to wait another ${rateLimit - (now - (lastSentTimestamps[parsedMessage.command] ?? 0))}ms`);
        return;
    }

    lastSentTimestamps[parsedMessage.command] = now;

    // Send POST request to analytics backend
    fetch(`${analyticsBackendUrl}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(sensorData)
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        // Detect if the POST was misrouted to the GET handler
        if (Array.isArray(data?.data)) {
            log.error("Analytics POST was handled as GET — data was NOT written. Check if you switched http with https and remove trailing slashes from the URL in settings.");
        } else {
            // console.log("Analytics data sent successfully:", data);
        }
    })
    .catch(error => {
        log.error("Error sending analytics data:", error);
    });
}

