import { ButtonMappings, ZCButtons } from "./button-handler";
import log from "electron-log/main";

export const defaultButtonMappings: ButtonMappings = new Map([
    [ZCButtons.Tony, 
        new Map(
            [
                [0, (value: boolean | number) => log.info(`Tony button 0 set to ${value}`)],
                [1, (value: boolean | number) => log.info(`Tony button 1 set to ${value}`)],
                [2, (value: boolean | number) => log.info(`Tony button 2 set to ${value}`)]
            ]
        )
    ],
    [ZCButtons.Anna, 
        new Map(
            [
                [0, (value: boolean | number) => log.info(`Anna button 0 set to ${value}`)]
            ]
        )
    ],
    [ZCButtons.Felicitas, 
            new Map(
            [
                [0, (value: boolean | number) => log.info(`Felicitas button 0 set to ${value}`)]
            ]
        )
    ]
]);