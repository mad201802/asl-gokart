import { StateCreator } from "zustand"

export interface SystemSlice {
    screenBrightness: number
    adminPin: string,
    adminMode: boolean,
    setScreenBrightness: (screenBrightness: number) => void,
    setAdminPin: (adminPin: string) => void,
  }

export const createSystemSlice: StateCreator<
    SystemSlice,
    [],
    [],
    SystemSlice
    > = (set) => ({
    screenBrightness: 33,
    adminPin: "",
    adminMode: false,
    setScreenBrightness: (screenBrightness: number) => set(() => ({ screenBrightness: screenBrightness })),
    setAdminPin: (adminPin: string) => set(() => ({ adminPin: adminPin })),
})