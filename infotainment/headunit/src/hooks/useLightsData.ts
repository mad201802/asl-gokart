import { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { LightsCommands } from "@/data/zonecontrollers/zonecontrollers";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";

export function useLightsData() {
    const setTurnSignalLeft = useStore((state) => state.setTurnSignalLeft);
    const setTurnSignalRight = useStore((state) => state.setTurnSignalRight);
    const setHazardLights = useStore((state) => state.setHazardLights);
    const setHeadlights = useStore((state) => state.setHeadlights);
    const setHighBeams = useStore((state) => state.setHighBeams);

    useEffect(() => {
        const cleanup = window.sero.onLightsMessage((incomingPacket: string) => {
            log.debug("Received incoming lights message");
            const parsed: IncomingPacket = JSON.parse(incomingPacket);
            switch (parsed.command) {
                case LightsCommands.GET_TURN_SIGNAL_LIGHTS:
                    setTurnSignalLeft(parsed.value[0] === 1);
                    setHazardLights(parsed.value[0] === 1 && parsed.value[1] === 1);
                    setTurnSignalRight(parsed.value[1] === 1);
                    break;
                case LightsCommands.GET_HEADLIGHTS:
                    setHeadlights([parsed.value[0] === 1, parsed.value[1] === 1]);
                    break;
                case LightsCommands.GET_HIGH_BEAMS:
                    setHighBeams([parsed.value[0] === 1, parsed.value[1] === 1]);
                    break;
                default:
                    log.error("Invalid command (data type) received in lights message!");
            }
        });
        return cleanup;
    }, []);
}
