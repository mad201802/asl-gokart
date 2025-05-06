import { IncomingPacket } from "@/data/zonecontrollers/packets";

export enum ZCButtons {
    Tony = "tony",
    Anna = "anna",
    Felicitas = "felicitas"
}
export type ButtonValue = boolean | number;
export type ButtonMapping = Map<number, (newValue: ButtonValue) => void>;
export type ButtonMappings = Map<ZCButtons, ButtonMapping>;
export type ButtonEvent = {
    identifier: ZCButtons;
    button: number;
    newValue: ButtonValue;
}

export class ButtonHandler {

    private mapping: ButtonMappings; 

    constructor(mapping: ButtonMappings) {
        console.log("ButtonHandler created");
        this.mapping = mapping;
    }

    public handleIncomingButtonMessage(message: IncomingPacket) {
        const buttonEvent: ButtonEvent = message.value;
        this.handleButtonEvent(buttonEvent);
    }
    
    private handleButtonEvent(event: ButtonEvent) {
        console.log("Button event received: ", event);

        // Check if the button is mapped
        if (this.mapping.has(event.identifier)) {
            const buttonMapping = this.mapping.get(event.identifier);
            if(!buttonMapping) {
                console.error(`Button mapping for ${event.identifier}[${event.button}] is empty!`);
                return;
            }
            // Check if the button has an action
            const action = buttonMapping.get(event.button)?.bind(this);
            // Execute the action
            if (action) {
                action(event.newValue);
            } else {
                console.error(`Button ${event.identifier}[${event.button}] has no action for value ${event.newValue}`);
            }
        } else {
            console.error(`Button ${event.identifier}[${event.button}] is not mapped!`);
        }
    }
}