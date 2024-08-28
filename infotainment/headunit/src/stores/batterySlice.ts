import { StateCreator } from 'zustand'

export interface BatterySlice {
    batteryTemps: number[],
    avgBatteryTemp: number,
    minTemp: number,
    maxTemp: number,
    batteryPercentage: number,
    voltage: number,
    setBatteryTemps: (temps: number[]) => void,
    setBatteryVoltage: (voltage: number) => void
  }
  
export const createBatterySlice: StateCreator<
    BatterySlice,
    [],
    [],
    BatterySlice
  > = (set) => ({
    batteryTemps: [30, 35, 20, 25, 20, 20],
    avgBatteryTemp: 0,
    minTemp: 0,
    maxTemp: 0,
    batteryPercentage: 0.33,
    voltage: 67.2,
    setBatteryTemps: (temps: number[]) => set(() => {
      const avgBatteryTemp = temps.reduce((a, b) => a + b, 0) / temps.length;
      const minTemp = Math.min(...temps);
      const maxTemp = Math.max(...temps);
      return {
        batteryTemps: temps,
        avgBatteryTemp,
        minTemp,
        maxTemp
      };
    }),
    setBatteryVoltage: (voltage: number) => set(() => {
      const minVoltage = 53;
      const maxVoltage = 67.2;
      const batteryPercentage = (voltage - minVoltage) / (maxVoltage - minVoltage);
      return { 
        voltage: voltage,
        batteryPercentage: batteryPercentage };
    }),
  })