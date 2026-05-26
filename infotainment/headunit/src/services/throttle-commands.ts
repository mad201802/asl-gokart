import { OutgoingPacket } from "@/data/zonecontrollers/packets";
import { Zones, ThrottleCommands } from "@/data/zonecontrollers/zonecontrollers";
import log from "@/lib/logger";

export function sendThrottleLimit(limit: number, wheelCircumference: number) {
    // Formula to calculate speed from RPM: (rpm / 60) * wheelCircumference * 3.6
    // Map the limit to an RPM value using rearranged formula: rpm = (limit / 3.6) / wheelCircumference * 60
    const rpm = (limit / 3.6) / wheelCircumference * 60;
    const newPacket: OutgoingPacket = {
        zone: Zones.THROTTLE,
        command: ThrottleCommands.SET_LIMIT,
        value: Math.round(rpm),
    };
    log.info(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
}

export function sendPedalMultiplier(multiplier: number) {
    const newPacket: OutgoingPacket = {
        zone: Zones.THROTTLE,
        command: ThrottleCommands.SET_PEDAL_MULTIPLIER,
        value: Math.round(multiplier),
    };
    log.info(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
}

export function sendPipeThroughRawThrottle(pipeThroughRawThrottle: boolean) {
    const newPacket: OutgoingPacket = {
        zone: Zones.THROTTLE,
        command: ThrottleCommands.SET_PIPE_THROUGH_RAW_THROTTLE,
        value: pipeThroughRawThrottle,
    };
    log.info(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
}

export function sendResetDailyDistance() {
    const newPacket: OutgoingPacket = {
        zone: Zones.THROTTLE,
        command: ThrottleCommands.SET_DAILY_DISTANCE,
        value: 0,
    };
    log.info(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
}
