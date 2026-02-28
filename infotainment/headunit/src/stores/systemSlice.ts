import { StateCreator } from "zustand"

export interface SystemSlice {
    screenBrightness: number
    adminPin: string,
    adminMode: boolean,
    appVersion: string,
    analyticsEnabled: boolean,
    analyticsBackendUrl: string,
    showParticleEffects: boolean,
    setScreenBrightness: (screenBrightness: number) => void,
    setAdminPin: (adminPin: string) => void,
    setAppVersion: (appVersion: string) => void,
    setAnalyticsEnabled: (analyticsEnabled: boolean) => void,
    setAnalyticsBackendUrl: (url: string) => void,
    setShowParticleEffects: (showParticleEffects: boolean) => void,
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
    analyticsBackendUrl: "http://localhost:3000/api/gokart",
    showParticleEffects: true,
    setScreenBrightness: (screenBrightness: number) => set(() => ({ screenBrightness: screenBrightness })),
    setAdminPin: (adminPin: string) => set(() => ({ adminPin: adminPin })),
    setAppVersion: (appVersion: string) => set(() => ({ appVersion: appVersion })),
    setAnalyticsEnabled: (analyticsEnabled: boolean) => set(() => ({ analyticsEnabled: analyticsEnabled })),
    setAnalyticsBackendUrl: (analyticsBackendUrl: string) => set(() => ({ analyticsBackendUrl: analyticsBackendUrl })),
    setShowParticleEffects: (showParticleEffects: boolean) => set(() => ({ showParticleEffects: showParticleEffects })),
})