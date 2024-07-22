import { Gears, DriveModes } from '@/data/controlling_models/drivetrain'
import { StateCreator } from 'zustand'

export interface MotorSlice {
    gear: Gears
    driveMode: DriveModes
    throttle: number
    rpm: number
    rpmBoundaries: [number, number]
    speed: number
    setGear: (gear: Gears) => void
    setDriveMode: (driveMode: DriveModes) => void
    setThrottle: (throttle: number) => void
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
    setGear: (gear: Gears) => set(() => ({ gear: gear })),
    setDriveMode: (driveMode: DriveModes) => set(() => ({ driveMode: driveMode })),
    setThrottle: (throttle: number) => set(() => ({ throttle: throttle }))
  })