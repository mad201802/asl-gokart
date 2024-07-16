import { StateCreator } from "zustand"

export interface SystemSlice {
    screenBrightness: number
    setScreenBrightness: (screenBrightness: number) => void
  }

export const createSystemSlice: StateCreator<
    SystemSlice,
    [],
    [],
    SystemSlice
    > = (set) => ({
    screenBrightness: 33,
    setScreenBrightness: (screenBrightness: number) => set(() => ({ screenBrightness: screenBrightness }))
})