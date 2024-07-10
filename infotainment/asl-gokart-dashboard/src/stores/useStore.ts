import { create } from 'zustand'
import { MotorSlice, createMotorSlice } from './motorSlice'

export const useStore = create<MotorSlice>()((...a) => ({
  ...createMotorSlice(...a)
}))