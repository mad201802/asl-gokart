import { Gears, DriveModes } from '@/data/enums'
import { StateCreator } from 'zustand'

export interface MotorSlice {
    gear: Gears
    driveMode: DriveModes
    throttle: number
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
    setGear: (gear: Gears) => set(() => ({ gear: gear })),
    setDriveMode: (driveMode: DriveModes) => set(() => ({ driveMode: driveMode })),
    setThrottle: (throttle: number) => set(() => ({ throttle: throttle }))
  })