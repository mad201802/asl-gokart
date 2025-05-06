import { Gears, DriveModes } from '@/data/controlling_models/drivetrain'
import { OutgoingPacket } from '@/data/zonecontrollers/packets'
import { Zones, ThrottleCommands } from '@/data/zonecontrollers/zonecontrollers'
import { StateCreator } from 'zustand'

export interface MotorSlice {
    gear: Gears
    driveMode: DriveModes
    rawThrottle: number
    throttle: number
    showRawThrottle: boolean
    pipeThroughRawThrottle: boolean
    rpm: number
    rpmBoundaries: [number, number]
    wheelCircumference: number
    speed: number
    dailyDistance: number
    speedLimit: number
    maxSettableSpeed: number
    minSettableSpeed: number
    pedalMultiplier: number
    setGear: (gear: Gears) => void
    setDriveMode: (driveMode: DriveModes) => void
    setRawThrottle: (rawThrottle: number) => void
    setThrottle: (throttle: number) => void
    setShowRawThrottle: (showRawThrottle: boolean) => void
    setPipeThroughRawThrottle: (pipeThroughRawThrottle: boolean) => void
    setRpm: (rpm: number) => void
    setWheelCircumference: (wheelCircumference: number) => void
    setSpeed: (speed: number) => void
    setDailyDistance: (dailyDistance: number) => void
    setSpeedLimit: (speedLimit: number) => void
    setMaxSettableSpeed: (maxSettableSpeed: number) => void
    setMinSettableSpeed: (minSettableSpeed: number) => void
    setPedalMultiplier: (pedalMultiplier: number) => void
  }

const sendThrottleLimitPacket = (limit: number, wheelCircumference: number) => {
    // Formula to calculate speed from RPM: (rpm / 60) * wheelCircumference * 3.6
    // Map the limit to an RPM value using rearranged formula: rpm = (limit / 3.6) / wheelCircumference * 60
    const rpm = (limit / 3.6) / wheelCircumference * 60;

    const newPacket: OutgoingPacket = {
      zone: Zones.THROTTLE,
      command: ThrottleCommands.SET_LIMIT,
      value: Math.round(rpm)
    };
    console.log(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
  }

const sendPedalMultiplierPacket = (multiplier: number) => {
    const newPacket: OutgoingPacket = {
      zone: Zones.THROTTLE,
      command: ThrottleCommands.SET_PEDAL_MULTIPLIER,
      value: Math.round(multiplier)
    };
    console.log(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
  }
  
const sendPipeThroughRawThrottlePacket = (pipeThroughRawThrottle: boolean) => {
    const newPacket: OutgoingPacket = {
      zone: Zones.THROTTLE,
      command: ThrottleCommands.SET_PIPE_THROUGH_RAW_THROTTLE,
      value: pipeThroughRawThrottle
    };
    console.log(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
  }

const sendResetDailyDistancePacket = () => {
    const newPacket: OutgoingPacket = {
      zone: Zones.THROTTLE,
      command: ThrottleCommands.SET_DAILY_DISTANCE,
      value: 0
    };
    console.log(JSON.stringify(newPacket));
    window.websocket.send(newPacket, Zones.THROTTLE);
  }

export const createMotorSlice: StateCreator<
  MotorSlice,
  [],
  [],
  MotorSlice
  > = (set, get) => ({
  gear: Gears.d,
  driveMode: DriveModes.ludicrous,
  rawThrottle: 0.45,
  throttle: 0.75,
  showRawThrottle: true,
  pipeThroughRawThrottle: false,
  rpm: 1250,
  rpmBoundaries: [0, 1500],
  wheelCircumference: 1.415,
  speed: 14,
  dailyDistance: 1234.5,
  speedLimit: 35,
  maxSettableSpeed: 35,
  minSettableSpeed: 7,
  pedalMultiplier: 100,
  setGear: (gear: Gears) => set(() => ({ gear: gear })),
  setDriveMode: (driveMode: DriveModes) => set(() => ({ driveMode: driveMode })),
  setRawThrottle: (rawThrottle: number) => set(() => ({ rawThrottle: rawThrottle })),
  setThrottle: (throttle: number) => set(() => ({ throttle: throttle })),
  setShowRawThrottle: (showRawThrottle: boolean) => set(() => ({ showRawThrottle: showRawThrottle })),
  setPipeThroughRawThrottle: (pipeThroughRawThrottle: boolean) => {
    set(() => ({ pipeThroughRawThrottle: pipeThroughRawThrottle }));
    sendPipeThroughRawThrottlePacket(pipeThroughRawThrottle);
  },
  setRpm: (rpm: number) => {
    const wheelCircumference = get().wheelCircumference;
    set(() => ({ 
      rpm: rpm,
      speed: (rpm / 60) * wheelCircumference * 3.6 
    }));
  },
  setWheelCircumference: (wheelCircumference: number) => set(() => ({ wheelCircumference: wheelCircumference })),
  setSpeed: (speed: number) => set(() => ({ speed: speed })),
  setDailyDistance: (dailyDistance: number) => set(() => ({ dailyDistance: dailyDistance })),
  setSpeedLimit: (speedLimit: number) => {
    set(() => ({ speedLimit: speedLimit }));
    sendThrottleLimitPacket(speedLimit, get().wheelCircumference);
  },
  setMaxSettableSpeed: (maxSettableSpeed: number) => set(() => ({ maxSettableSpeed: maxSettableSpeed })),
  setMinSettableSpeed: (minSettableSpeed: number) => set(() => ({ minSettableSpeed: minSettableSpeed })),
  setPedalMultiplier: (pedalMultiplier: number) => {
    set(() => ({ pedalMultiplier: pedalMultiplier }));
    sendPedalMultiplierPacket(pedalMultiplier);
  },
  })