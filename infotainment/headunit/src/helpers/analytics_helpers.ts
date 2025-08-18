import { SensorData } from "@/data/analytics/sensor-data";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { Zones } from "@/data/zonecontrollers/zonecontrollers";


const ANALYTICS_BACKEND_URL = "http://localhost:3000/api/gokart"; // Replace with actual URL

let analyticsEnabled = false;
let lastAnalyticsSent = 0;

export function toggleAnalytics(enabled: boolean): boolean {
    analyticsEnabled = enabled;
    return analyticsEnabled;
}

export function isAnalyticsEnabled(): boolean {
    return analyticsEnabled;
}

export function processAnalytics(message: string): void {
    if (!analyticsEnabled) {
        console.log("Analytics is disabled, skipping processing.");
        return;
    }

    const now = Date.now();
    console.log(`Time since last analytics sent: ${now - lastAnalyticsSent} ms`);
    if (now - lastAnalyticsSent < 2000) {
        console.log("Skipping analytics processing to prevent flooding.");
        return; // Prevent flooding the analytics backend
    }
    lastAnalyticsSent = now;

    const parsedMessage: IncomingPacket = JSON.parse(message);

    if (parsedMessage.zone === Zones.BATTERY) {
        const batteryData: SensorData = {
            name: "batteryVoltage",
            value: parsedMessage.value,
            unit: "V",
            timestamp: new Date().toISOString()
        };
        // Process battery data for analytics
        console.log("Processing battery data for analytics:", batteryData);

        // Send POST request to analytics backend
        fetch(`${ANALYTICS_BACKEND_URL}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(batteryData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("Analytics data sent successfully:", data);
        })
        .catch(error => {
            console.error("Error sending analytics data:", error);
        });
    } else {
        console.log(`Skipping analytics processing for zone: ${parsedMessage.zone}`);
    }
}

