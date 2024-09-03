import { Gears, DriveModes } from '@/data/controlling_models/drivetrain'
import { OutgoingPacket } from '@/data/zonecontrollers/packets'
import { Zones, ThrottleCommands } from '@/data/zonecontrollers/zonecontrollers'
import { StateCreator } from 'zustand'

export interface MotorSlice {
    gear: Gears
    driveMode: DriveModes
    throttle: number
    rpm: number
    rpmBoundaries: [number, number]
    speed: number
    dailyDistance: number
    speedLimit: number
    maxSettableSpeed: number
    minSettableSpeed: number
    setGear: (gear: Gears) => void
    setDriveMode: (driveMode: DriveModes) => void
    setThrottle: (throttle: number) => void
    setRpm: (rpm: number) => void
    setDailyDistance: (dailyDistance: number) => void
    setSpeedLimit: (speedLimit: number) => void
    setMaxSettableSpeed: (maxSettableSpeed: number) => void
    setMinSettableSpeed: (minSettableSpeed: number) => void
  }

const sendThrottleLimitPacket = (limit: number) => {
    // Map the limit to an RPM value: 0-100 km/h maps to 500-6000 RPM
    const rpm = (limit / 100) * 5500 + 500;
    const newPacket: OutgoingPacket = {
        zone: Zones.THROTTLE,
        command: ThrottleCommands.SET_LIMIT,
        value: rpm
    };
    console.log(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
  }
  
export const createMotorSlice: StateCreator<
  MotorSlice,
  [],
  [],
  MotorSlice
  > = (set) => ({
  gear: Gears.p,
  driveMode: DriveModes.eco,
  throttle: 0.75,
  rpm: 6000,
  rpmBoundaries: [0, 10000],
  speed: 0,
  dailyDistance: 1234.5,
  speedLimit: 35,
  maxSettableSpeed: 35,
  minSettableSpeed: 7,
  setGear: (gear: Gears) => set(() => ({ gear: gear })),
  setDriveMode: (driveMode: DriveModes) => set(() => ({ driveMode: driveMode })),
  setThrottle: (throttle: number) => set(() => ({ throttle: throttle })),
  setRpm: (rpm: number) => set(() => ({ rpm: rpm })),
  setDailyDistance: (dailyDistance: number) => set(() => ({ dailyDistance: dailyDistance })),
  setSpeedLimit: (speedLimit: number) => {
    set(() => ({ speedLimit: speedLimit }));
    sendThrottleLimitPacket(speedLimit);
  },
  setMaxSettableSpeed: (maxSettableSpeed: number) => set(() => ({ maxSettableSpeed: maxSettableSpeed })),
  setMinSettableSpeed: (minSettableSpeed: number) => set(() => ({ minSettableSpeed: minSettableSpeed })),
  })