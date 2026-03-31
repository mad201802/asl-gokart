import { StateCreator } from 'zustand'

export interface LightsSlice {
    turnSignalLeft: boolean;
    turnSignalRight: boolean;
    hazardLights: boolean;
    headlights: [boolean, boolean]; // [left, right]
    highBeams: [boolean, boolean];  // [left, right]
    setTurnSignalLeft: (value: boolean) => void;
    setTurnSignalRight: (value: boolean) => void;
    setHazardLights: (value: boolean) => void;
    setHeadlights: (value: [boolean, boolean]) => void;
    setHighBeams: (value: [boolean, boolean]) => void;
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
  headlights: [false, false],
  highBeams: [false, false],
  setTurnSignalLeft: (value: boolean) => set(() => ({ turnSignalLeft: value })),
  setTurnSignalRight: (value: boolean) => set(() => ({ turnSignalRight: value })),
  setHazardLights: (value: boolean) => set(() => ({ hazardLights: value })),
  setHeadlights: (value: [boolean, boolean]) => set(() => ({ headlights: value })),
  setHighBeams: (value: [boolean, boolean]) => set(() => ({ highBeams: value })),
  })