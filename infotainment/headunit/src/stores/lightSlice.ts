import { StateCreator } from 'zustand'

export interface LightsSlice {
    turnSignalLeft: boolean;
    turnSignalRight: boolean;
    hazardLights: boolean;
    setTurnSignalLeft: (value: boolean) => void;
    setTurnSignalRight: (value: boolean) => void;
    setHazardLights: (value: boolean) => void;
  }
  
export const createLightsSlice: StateCreator<
  LightsSlice,
  [],
  [],
  LightsSlice
  > = (set, get) => ({
  turnSignalLeft: false,
  turnSignalRight: false,
  hazardLights: false,
  setTurnSignalLeft: (value: boolean) => set(() => ({ turnSignalLeft: value })),
  setTurnSignalRight: (value: boolean) => set(() => ({ turnSignalRight: value })),
  setHazardLights: (value: boolean) => set(() => ({
    hazardLights: value,
    turnSignalLeft: value ? true : get().turnSignalLeft,
    turnSignalRight: value ? true : get().turnSignalRight
  })),
  })