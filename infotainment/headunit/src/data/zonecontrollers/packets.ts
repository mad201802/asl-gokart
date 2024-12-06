import { BatteryCommands, ButtonsCommands, ThrottleCommands, Zones } from "./zonecontrollers"

export interface OutgoingPacket {
    zone: Zones,
    command: BatteryCommands | ThrottleCommands,
    value?: string | number | number[] | boolean 
}

export interface IncomingPacket {
    zone: Zones,
    command: BatteryCommands | ThrottleCommands | ButtonsCommands,
    value: any 
}

export interface RegisterPacket {
    zone: Zones
}