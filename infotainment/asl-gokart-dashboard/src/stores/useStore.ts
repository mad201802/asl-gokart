import { create } from 'zustand'
import { MotorSlice, createMotorSlice } from './motorSlice'
import { SystemSlice, createSystemSlice } from './systemSlice'

export const useStore = create<MotorSlice & SystemSlice>()((...a) => ({
  ...createMotorSlice(...a),
  ...createSystemSlice(...a)
}))