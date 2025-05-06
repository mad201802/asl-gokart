import { StateCreator } from 'zustand'

export interface ButtonSlice {
    buttonMappings: ZCButtonStates,
    setButtonMappings: (buttonMappings: ZCButtonStates) => void
}

export const createButtonSlice: StateCreator<
    ButtonSlice,
    [],
    [],
    ButtonSlice
> = (set) => ({
    buttonMappings: exampleButtonMappings,
    setButtonMappings: (buttonMappings: ZCButtonStates) => set(() => ({ buttonMappings: buttonMappings }))
})