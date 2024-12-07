import { IncomingPacket, OutgoingPacket } from "./packets";
import { DriveModes } from "../controlling_models/drivetrain";
import { WebSocket } from "ws";

export enum Zones {
    BATTERY = "battery",
    MOTOR = "motor",
    THROTTLE = "throttle",
    BUTTONS = "buttons",
    LIGHTS = "lights",
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
    SET_DAILY_DISTANCE = "setDailyDistance",
    GET_REVERSE = "getReverse",
    SET_RECONNECT_UART = "setReconnectUART",
}

export enum ButtonsCommands {
    GET_TURN_SIGNAL_BUTTONS = "getTurnSignalButtons",
}

export enum LightsCommands {
    GET_TURN_SIGNAL_LIGHTS = "getTurnSignalLights",
    SET_TURN_SIGNAL_LIGHTS = "setTurnSignalLights",
    SET_TOGGLE_TURN_SIGNAL_LEFT = "setToggleTurnSignalLeft",
    SET_TOGGLE_TURN_SIGNAL_RIGHT = "setToggleTurnSignalRight",
    SET_TOGGLE_HAZARD_LIGHTS = "setToggleHazardLights",
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