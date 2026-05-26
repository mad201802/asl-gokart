import { StateCreator } from "zustand"
import type { LogLevel } from "@/lib/logger"

export interface SystemSlice {
    screenBrightness: number
    adminPin: string,
    adminMode: boolean,
    appVersion: string,
    analyticsEnabled: boolean,
    analyticsBackendUrl: string,
    showParticleEffects: boolean,
    logLevel: LogLevel,
    setScreenBrightness: (screenBrightness: number) => void,
    setAdminPin: (adminPin: string) => void,
    setAppVersion: (appVersion: string) => void,
    setAnalyticsEnabled: (analyticsEnabled: boolean) => void,
    setAnalyticsBackendUrl: (url: string) => void,
    setShowParticleEffects: (showParticleEffects: boolean) => void,
    setLogLevel: (logLevel: LogLevel) => void,
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
    logLevel: "info",
    setScreenBrightness: (screenBrightness: number) => set({ screenBrightness }),
    setAdminPin: (adminPin: string) => set({ adminPin }),
    setAppVersion: (appVersion: string) => set({ appVersion }),
    setAnalyticsEnabled: (analyticsEnabled: boolean) => set({ analyticsEnabled }),
    setAnalyticsBackendUrl: (analyticsBackendUrl: string) => set({ analyticsBackendUrl }),
    setShowParticleEffects: (showParticleEffects: boolean) => set({ showParticleEffects }),
    setLogLevel: (logLevel: LogLevel) => set({ logLevel }),
})