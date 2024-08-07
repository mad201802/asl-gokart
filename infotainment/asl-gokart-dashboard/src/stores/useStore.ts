import { create } from 'zustand'
import { MotorSlice, createMotorSlice } from './motorSlice'
import { SystemSlice, createSystemSlice } from './systemSlice'
import { BatterySlice, createBatterySlice } from './batterySlice'

export const useStore = create<MotorSlice & SystemSlice & BatterySlice>()((...a) => ({
  ...createMotorSlice(...a),
  ...createSystemSlice(...a),
  ...createBatterySlice(...a)
}))