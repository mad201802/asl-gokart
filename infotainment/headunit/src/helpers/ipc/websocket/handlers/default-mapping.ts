import { ButtonMappings, ZCButtons } from "./button-handler";

export const defaultButtonMappings: ButtonMappings = new Map([
    [ZCButtons.Tony, 
        new Map(
            [
                [0, (value: boolean | number) => console.log(`Tony button 0 set to ${value}`)],
                [1, (value: boolean | number) => console.log(`Tony button 1 set to ${value}`)],
                [2, (value: boolean | number) => console.log(`Tony button 2 set to ${value}`)]
            ]
        )
    ],
    [ZCButtons.Anna, 
        new Map(
            [
                [0, (value: boolean | number) => console.log(`Anna button 0 set to ${value}`)]
            ]
        )
    ],
    [ZCButtons.Felicitas, 
            new Map(
            [
                [0, (value: boolean | number) => console.log(`Felicitas button 0 set to ${value}`)]
            ]
        )
    ]
]);