import { StateCreator } from 'zustand'

export interface LightsSlice {
    turnSignalLeft: boolean;
    turnSignalRight: boolean;
    hazardLights: boolean;
    headlights: [boolean, boolean]; // [left, right]
    highBeams: [boolean, boolean];  // [left, right]
    underglowColor: string;
    welcomeLightColor: string;
    underglowBrigthness: number;
    welcomeLightBrightness: number;
    underglowOn: boolean;
    welcomeLightOn: boolean;
    tailLights: boolean;
    setTurnSignalLeft: (value: boolean) => void;
    setTurnSignalRight: (value: boolean) => void;
    setHazardLights: (value: boolean) => void;
    setHeadlights: (value: [boolean, boolean]) => void;
    setHighBeams: (value: [boolean, boolean]) => void;
    setUnderglowColor: (value: string) => void;
    setWelcomeLightColor: (value: string) => void;
    setUnderglowBrightness: (value: number) => void;
    setWelcomeLightBrightness: (value: number) => void;
    setUnderglowOn: (value: boolean) => void;
    setWelcomeLightOn: (value: boolean) => void;
    setTailLights: (value: boolean) => void;
  }
  
export const createLightsSlice: StateCreator<
  LightsSlice,
  [],
  [],
  LightsSlice
  > = (set) => ({
  turnSignalLeft: false,
  turnSignalRight: false,
  hazardLights: false,
  headlights: [false, false],
  highBeams: [false, false],
  underglowColor: '#00f9ff',
  welcomeLightColor: '#ff0055',
  underglowBrigthness: 50,
  welcomeLightBrightness: 50,
  underglowOn: false,
  welcomeLightOn: true,
  tailLights: true,
  setTurnSignalLeft: (value: boolean) => set({ turnSignalLeft: value }),
  setTurnSignalRight: (value: boolean) => set({ turnSignalRight: value }),
  setHazardLights: (value: boolean) => set({ hazardLights: value }),
  setHeadlights: (value: [boolean, boolean]) => set({ headlights: value }),
  setHighBeams: (value: [boolean, boolean]) => set({ highBeams: value }),
  setUnderglowColor: (value: string) => set({ underglowColor: value }),
  setWelcomeLightColor: (value: string) => set({ welcomeLightColor: value }),
  setUnderglowBrightness: (value: number) => set({ underglowBrigthness: value }),
  setWelcomeLightBrightness: (value: number) => set({ welcomeLightBrightness: value }),
  setUnderglowOn: (value: boolean) => set({ underglowOn: value }),
  setWelcomeLightOn: (value: boolean) => set({ welcomeLightOn: value }),
  setTailLights: (value: boolean) => set({ tailLights: value }),
  })