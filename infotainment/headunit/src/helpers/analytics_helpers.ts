import http from "http";
import https from "https";
import { SensorData } from "@/data/analytics/sensor-data";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { BatteryCommands, ThrottleCommands, Zones } from "@/data/zonecontrollers/zonecontrollers";
import log from "electron-log/main";
import { getAnalyticsBindAddress, getStoredAnalyticsUrl, setStoredAnalyticsUrl } from "@/helpers/ipc/hardware/network-config";


let analyticsBackendUrl = getStoredAnalyticsUrl() ?? "http://localhost:3000/api/gokart";
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
    setStoredAnalyticsUrl(url);
}

export function getAnalyticsBackendUrl(): string {
    return analyticsBackendUrl;
}

export function checkAnalyticsConnection(url: string): Promise<boolean> {
    return new Promise((resolve) => {
        try {
            const parsed = new URL(url);
            const driver = parsed.protocol === "https:" ? https : http;
            const localAddress = getAnalyticsBindAddress();
            const options: http.RequestOptions = {
                method: "GET",
                hostname: parsed.hostname,
                port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
                path: parsed.pathname + parsed.search,
                timeout: 5000,
                ...(localAddress ? { localAddress } : {}),
            };
            const req = driver.request(options, (res) => {
                resolve((res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 400);
                res.resume();
            });
            req.on("timeout", () => { req.destroy(); resolve(false); });
            req.on("error", () => resolve(false));
            req.end();
        } catch {
            resolve(false);
        }
    });
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
    try {
        const parsed = new URL(analyticsBackendUrl);
        const driver = parsed.protocol === "https:" ? https : http;
        const body = JSON.stringify(sensorData);
        const localAddress = getAnalyticsBindAddress();
        const options: http.RequestOptions = {
            method: "POST",
            hostname: parsed.hostname,
            port: parsed.port || (parsed.protocol === "https:" ? 443 : 80),
            path: parsed.pathname + parsed.search,
            headers: {
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body),
            },
            ...(localAddress ? { localAddress } : {}),
        };
        const req = driver.request(options, (res) => {
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                log.error(`Analytics HTTP error: ${res.statusCode}`);
                res.resume();
                return;
            }
            let raw = "";
            res.on("data", (chunk: Buffer) => { raw += chunk.toString(); });
            res.on("end", () => {
                try {
                    const data = JSON.parse(raw);
                    // Detect if the POST was misrouted to the GET handler
                    if (Array.isArray(data?.data)) {
                        log.error("Analytics POST was handled as GET — data was NOT written. Check if you switched http with https and remove trailing slashes from the URL in settings.");
                    }
                } catch { /* non-JSON response is fine */ }
            });
        });
        req.on("error", (error: Error) => log.error("Error sending analytics data:", error));
        req.write(body);
        req.end();
    } catch (error) {
        log.error("Error sending analytics data:", error);
    }
}

