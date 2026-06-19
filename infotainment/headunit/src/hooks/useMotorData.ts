import { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { MotorCommands } from "@/data/zonecontrollers/zonecontrollers";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";

export function useMotorData() {
    const setRpm = useStore((state) => state.setRpm);
    const setLeftMotorData = useStore((state) => state.setLeftMotorData);
    const setRightMotorData = useStore((state) => state.setRightMotorData);

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
                default:
                    log.error("Invalid command (data type) received in motor message!");
            }
        });
        return cleanup;
    }, []);
}
