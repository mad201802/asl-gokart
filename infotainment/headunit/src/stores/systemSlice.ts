import { StateCreator } from "zustand"

export interface SystemSlice {
    screenBrightness: number
    adminPin: string,
    adminMode: boolean,
    appVersion: string,
    analyticsEnabled: boolean,
    setScreenBrightness: (screenBrightness: number) => void,
    setAdminPin: (adminPin: string) => void,
    setAppVersion: (appVersion: string) => void,
    setAnalyticsEnabled: (analyticsEnabled: boolean) => void,
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
    appVersion: "unknown",
    analyticsEnabled: false,
    setScreenBrightness: (screenBrightness: number) => set(() => ({ screenBrightness: screenBrightness })),
    setAdminPin: (adminPin: string) => set(() => ({ adminPin: adminPin })),
    setAppVersion: (appVersion: string) => set(() => ({ appVersion: appVersion })),
    setAnalyticsEnabled: (analyticsEnabled: boolean) => set(() => ({ analyticsEnabled: analyticsEnabled })),
})