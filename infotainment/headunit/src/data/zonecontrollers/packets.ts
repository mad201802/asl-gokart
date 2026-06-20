import { BatteryCommands, ButtonsCommands, LightsCommands, MotorCommands, ThrottleCommands, Zones } from "./zonecontrollers"

export interface OutgoingPacket {
    zone: Zones,
    command: BatteryCommands | ThrottleCommands | LightsCommands | MotorCommands,
    value?: string | number | number[] | boolean | boolean[]
}

export interface IncomingPacket {
    zone: Zones,
    identifier?: string,
    command: BatteryCommands | ThrottleCommands | ButtonsCommands | LightsCommands | MotorCommands,
    value: any 
}

export interface RegisterPacket {
    zone: Zones
}