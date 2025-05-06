import { StateCreator } from 'zustand'

export interface ButtonSlice {
    buttonMappings: ZCButtonStates,
    setButtonMappings: (buttonMappings: ZCButtonStates) => void
}

/**
 *  This is not used atm because the button mappings are happening in the backend and only the button testing should be
 *  in the frontend
 */
export const createButtonSlice: StateCreator<
    ButtonSlice,
    [],
    [],
    ButtonSlice
> = (set) => ({
    buttonMappings: exampleButtonMappings,
    setButtonMappings: (buttonMappings: ZCButtonStates) => set(() => ({ buttonMappings: buttonMappings }))
})