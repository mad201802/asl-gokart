import { create } from 'zustand'
import { MotorSlice, createMotorSlice } from './motorSlice'
import { SystemSlice, createSystemSlice } from './systemSlice'
import { BatterySlice, createBatterySlice } from './batterySlice'
import { SharedSlice, createSharedSlice } from './sharedSlice'
import { createLightsSlice, LightsSlice } from './lightSlice'

export const useStore = create<MotorSlice & SystemSlice & BatterySlice & SharedSlice & LightsSlice>()((...a) => ({
  ...createMotorSlice(...a),
  ...createSystemSlice(...a),
  ...createBatterySlice(...a),
  ...createSharedSlice(...a),
  ...createLightsSlice(...a),
}))