import { StateCreator } from 'zustand'

export interface BatterySlice {
    batteryTemps: number[],
    avgBatteryTemp: number,
    batteryPercentage: number,
    setBatteryTemps: (temps: number[]) => void,
    setBatteryPercentage: (percentage: number) => void
  }
  
export const createBatterySlice: StateCreator<
    BatterySlice,
    [],
    [],
    BatterySlice
  > = (set) => ({
    batteryTemps: [30, 35, 20, 25, 20, 20],
    avgBatteryTemp: 0,
    batteryPercentage: 0.33,
    setBatteryTemps: (temps: number[]) => set(() => ({ batteryTemps: temps, avgBatteryTemp: temps.reduce((a, b) => a + b, 0) / temps.length })),
    setBatteryPercentage: (percentage: number) => set(() => ({ batteryPercentage: percentage }))
  })