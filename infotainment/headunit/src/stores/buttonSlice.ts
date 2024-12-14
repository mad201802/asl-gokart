import { StateCreator } from 'zustand'
import { ButtonMappings } from '@/data/models'

const exampleButtonMappings: ButtonMappings = new Map<string, [(number | boolean), (string | undefined)][]>()
exampleButtonMappings.set("tony", [[false, "turnSignalLeft"], [false, "turnSignalRight"], [true, "hazardLights"]])
exampleButtonMappings.set("anna", [[99, "brightnessFront"], [255, "brightnessRear"]])
exampleButtonMappings.set("felicitas", [[true, "underglowActive"], [255, undefined]])

export interface ButtonSlice {
    buttonMappings: ButtonMappings,
    setButtonMappings: (buttonMappings: ButtonMappings) => void
}

export const createButtonSlice: StateCreator<
    ButtonSlice,
    [],
    [],
    ButtonSlice
> = (set) => ({
    buttonMappings: exampleButtonMappings,
    setButtonMappings: (buttonMappings: ButtonMappings) => set(() => ({ buttonMappings: buttonMappings }))
})