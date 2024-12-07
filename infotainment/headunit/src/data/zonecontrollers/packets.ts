import { BatteryCommands, ButtonsCommands, LightsCommands, ThrottleCommands, Zones } from "./zonecontrollers"

export interface OutgoingPacket {
    zone: Zones,
    command: BatteryCommands | ThrottleCommands | LightsCommands,
    value?: string | number | number[] | boolean | boolean[]
}

export interface IncomingPacket {
    zone: Zones,
    command: BatteryCommands | ThrottleCommands | ButtonsCommands | LightsCommands,
    value: any 
}

export interface RegisterPacket {
    zone: Zones
}