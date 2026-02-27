import { StateCreator } from 'zustand'
import { MotorSlice, FlowState } from './motorSlice'

// Calculate flow state based on battery current, throttle, and rpm
// Duplicated here to avoid circular dependency - must be kept in sync with motorSlice
const calculateFlowState = (batteryCurrent: number, throttle: number, rpm: number): FlowState => {
    if (Math.abs(batteryCurrent) < 5) {
        return FlowState.IDLE;
    }
    return batteryCurrent > 0 ? FlowState.POWER : FlowState.REGEN;
}

export interface BatterySlice {
    batteryTemps: number[],
    avgBatteryTemp: number,
    minTemp: number,
    maxTemp: number,
    batteryPercentage: number,
    voltage: number,
    batteryCurrent: number,
    setBatteryTemps: (temps: number[]) => void,
    setBatteryVoltage: (voltage: number) => void,
    setBatteryCurrent: (current: number) => void,
  }
  
export const createBatterySlice: StateCreator<
    BatterySlice & MotorSlice,
    [],
    [],
    BatterySlice
  > = (set, get) => ({
    batteryTemps: [30, 35, 20, 25, 20, 20],
    avgBatteryTemp: 0,
    minTemp: 0,
    maxTemp: 0,
    batteryPercentage: 0.33,
    voltage: 67.2,
    batteryCurrent: 95,
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
      const minVoltage = 51.2;
      const maxVoltage = 67.2;
      const batteryPercentage = (voltage - minVoltage) / (maxVoltage - minVoltage);
      return { 
        voltage: voltage,
        batteryPercentage: batteryPercentage };
    }),
    setBatteryCurrent: (current: number) => {
      const throttle = get().throttle;
      const rpm = get().rpm;
      const debugOverride = get().debugFlowStateOverride;
      set(() => ({ 
        batteryCurrent: current,
        flowState: debugOverride ?? calculateFlowState(current, throttle, rpm)
      }));
    }
  })