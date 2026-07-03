import { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { MotorCommands } from "@/data/zonecontrollers/zonecontrollers";
import { Gears } from "@/data/controlling_models/drivetrain";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";

export function useMotorData() {
    const setRpm = useStore((state) => state.setRpm);
    const setLeftMotorData = useStore((state) => state.setLeftMotorData);
    const setRightMotorData = useStore((state) => state.setRightMotorData);
    const setRelay1On = useStore((state) => state.setRelay1On);
    const setRelay2On = useStore((state) => state.setRelay2On);
    const setGear = useStore((state) => state.setGear);

    useEffect(() => {
        const cleanup = window.sero.onMotorMessage((incomingPacket: string) => {
            log.debug("Received incoming motor message");
            const parsed: IncomingPacket = JSON.parse(incomingPacket);
            switch (parsed.command) {
                case MotorCommands.GET_RPM:
                    setRpm(parsed.value);
                    break;
                case MotorCommands.GET_LEFT_MOTOR_DATA:
                    setLeftMotorData(parsed.value);
                    break;
                case MotorCommands.GET_RIGHT_MOTOR_DATA:
                    setRightMotorData(parsed.value);
                    break;
                case MotorCommands.GET_RELAY_STATES:
                    setRelay1On(parsed.value[0]);
                    setRelay2On(parsed.value[1]);
                    break;
                case MotorCommands.GET_REVERSE:
                    setGear(parsed.value === 1 ? Gears.r : Gears.d);
                    break;
                default:
                    log.error("Invalid command (data type) received in motor message!");
            }
        });
        return cleanup;
    }, []);
}
