import { create } from 'zustand'
import { MotorSlice, createMotorSlice } from './motorSlice'
import { SystemSlice, createSystemSlice } from './systemSlice'
import { BatterySlice, createBatterySlice } from './batterySlice'
import { SharedSlice, createSharedSlice } from './sharedSlice'

export const useStore = create<MotorSlice & SystemSlice & BatterySlice & SharedSlice>()((...a) => ({
  ...createMotorSlice(...a),
  ...createSystemSlice(...a),
  ...createBatterySlice(...a),
  ...createSharedSlice(...a),
}))