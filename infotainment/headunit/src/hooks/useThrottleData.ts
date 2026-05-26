import { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { ThrottleCommands } from "@/data/zonecontrollers/zonecontrollers";
import { Gears } from "@/data/controlling_models/drivetrain";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";

export function useThrottleData() {
    const setRpm = useStore((state) => state.setRpm);
    const setRawThrottle = useStore((state) => state.setRawThrottle);
    const setThrottle = useStore((state) => state.setThrottle);
    const setGear = useStore((state) => state.setGear);

    useEffect(() => {
        const cleanup = window.websocket.onThrottleMessage((incomingPacket: string) => {
            log.debug("Received incoming throttle message");
            const parsed: IncomingPacket = JSON.parse(incomingPacket);
            switch (parsed.command) {
                case ThrottleCommands.GET_THROTTLE:
                    setRawThrottle(parsed.value[0]);
                    setThrottle(parsed.value[1]);
                    break;
                case ThrottleCommands.GET_RPM:
                    setRpm(parsed.value);
                    break;
                case ThrottleCommands.GET_REVERSE:
                    setGear(parsed.value === 1 ? Gears.r : Gears.d);
                    break;
                default:
                    log.error("Invalid command (data type) received in throttle message!");
            }
        });
        return cleanup;
    }, []);
}
