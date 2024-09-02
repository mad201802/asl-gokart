import { BatteryCommands, ThrottleCommands } from "./zonecontrollers"

export interface OutgoingPacket {
    command: BatteryCommands | ThrottleCommands,
    value?: string | number | number[] | boolean 
}

export interface IncomingPacket {
    valueType: BatteryCommands | ThrottleCommands,
    value: any 
}