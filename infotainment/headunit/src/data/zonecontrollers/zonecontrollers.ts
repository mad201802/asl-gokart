import { IncomingPacket, OutgoingPacket } from "./packets";
import { DriveModes } from "../controlling_models/drivetrain";
import { WebSocket } from "ws";

export enum Zones {
    BATTERY = "battery",
    MOTOR = "motor",
    THROTTLE = "throttle",
}

export enum BatteryCommands {
    GET_VOLTAGE = "getVoltage",
    GET_CURRENT = "getCurrent",
    GET_TEMP = "getTemp",
    GET_CHARGE = "getCharge",
    GET_DISCHARGE = "getDischarge",
    GET_POWER = "getPower",
    GET_ENERGY = "getEnergy",
    GET_STATUS = "getStatus",
    GET_HEALTH = "getHealth",
}

export enum ThrottleCommands {
    GET_THROTTLE = "getThrottle",
    GET_RPM = "getRpm",
    GET_DRIVEMODE = "getDriveMode",
    SET_DRIVEMODE = "setDriveMode",
    SET_LIMIT = "setLimit",
    SET_PEDAL_MULTIPLIER = "setPedalMultiplier",
    SET_PIPE_THROUGH_RAW_THROTTLE = "setPipeThroughRawThrottle",
    GET_REVERSE = "getReverse",
}

export class ZoneController{
    webSocket: WebSocket;

    constructor(ws: WebSocket) {
        this.webSocket = ws;
    }
}

export class ThrottleController extends ZoneController {

    public getThrottle(): number {
        return 0;
    }

    public getDriveMode() {
        const msg: OutgoingPacket = {
            zone: Zones.THROTTLE,
            command: ThrottleCommands.GET_DRIVEMODE
        }  
        this.webSocket.send(JSON.stringify(msg));
    }

    public setDriveMode(driveMode: DriveModes) {
        const msg: OutgoingPacket = {
            zone: Zones.THROTTLE,
            command: ThrottleCommands.SET_DRIVEMODE,
            value: driveMode
        }
        this.webSocket.send(JSON.stringify(msg))
    }
}

export class BatteryContoller extends ZoneController {
    public getVoltage() {
        const msg: OutgoingPacket = {
            zone: Zones.BATTERY,
            command: BatteryCommands.GET_VOLTAGE
        }
        this.webSocket.send(JSON.stringify(msg));
    }
}