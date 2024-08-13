import { StateCreator } from 'zustand'
import { SystemSlice } from './systemSlice'
import { MotorSlice } from './motorSlice'

export interface SharedSlice {
    setAdminMode: (adminMode: boolean) => void
    setMaxSettableSpeed: (maxSettableSpeed: number) => void
}

export const createSharedSlice: StateCreator<
    SystemSlice & MotorSlice,
    [],
    [],
    SharedSlice
> = (set, get) => ({
    setAdminMode: (adminMode: boolean) => set(() => {
        // If admin mode is activated, 
        // the max settable speed is set to 120 km/h
        return { 
            adminMode: adminMode,
            // This is currently not used because the maxSettableSpeed can be set in the AdminSettingsDialog
            // maxSettableSpeed: adminMode ? 120 : 35,
         }
    }),
    setMaxSettableSpeed: (maxSettableSpeed: number) => set(() => {
        const speedLimit = get().speedLimit;
        return { 
            maxSettableSpeed: maxSettableSpeed,
            speedLimit: maxSettableSpeed < speedLimit ? maxSettableSpeed : speedLimit,
         }
    }),
})