import { Gears } from '@/data/enums'
import { StateCreator } from 'zustand'

export interface MotorSlice {
    gear: Gears
    throttle: number
    setGear: (gear: Gears) => void
    setThrottle: (throttle: number) => void
  }
  
export const createMotorSlice: StateCreator<
    MotorSlice,
    [],
    [],
    MotorSlice
  > = (set) => ({
    gear: Gears.p,
    throttle: 0.47,
    setGear: (gear: Gears) => set(() => ({ gear: gear })),
    setThrottle: (throttle: number) => set(() => ({ throttle: throttle }))
  })