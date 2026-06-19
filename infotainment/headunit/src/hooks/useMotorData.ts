import { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { MotorCommands } from "@/data/zonecontrollers/zonecontrollers";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";

export function useMotorData() {
    const setRpm = useStore((state) => state.setRpm);

    useEffect(() => {
        const cleanup = window.sero.onMotorMessage((incomingPacket: string) => {
            log.debug("Received incoming motor message");
            const parsed: IncomingPacket = JSON.parse(incomingPacket);
            switch (parsed.command) {
                case MotorCommands.GET_RPM:
                    setRpm(parsed.value);
                    break;
                default:
                    log.error("Invalid command (data type) received in motor message!");
            }
        });
        return cleanup;
    }, []);
}
