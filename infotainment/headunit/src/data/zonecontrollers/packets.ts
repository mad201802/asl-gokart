import { BatteryCommands, ThrottleCommands, Zones } from "./zonecontrollers"

export interface OutgoingPacket {
    command: BatteryCommands | ThrottleCommands,
    value?: string | number | number[] | boolean 
}

export interface IncomingPacket {
    valueType: BatteryCommands | ThrottleCommands,
    value: any 
}

export interface RegisterPacket {
    zone: Zones
}