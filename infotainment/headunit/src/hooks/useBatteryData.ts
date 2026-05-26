import { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { BatteryCommands } from "@/data/zonecontrollers/zonecontrollers";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";

export function useBatteryData() {
    const setBatteryTemps = useStore((state) => state.setBatteryTemps);
    const setBatteryVoltage = useStore((state) => state.setBatteryVoltage);
    const setBatteryCurrent = useStore((state) => state.setBatteryCurrent);

    useEffect(() => {
        const cleanup = window.sero.onBatteryMessage((incomingPacket: string) => {
            log.debug("Received incoming battery message");
            const parsed: IncomingPacket = JSON.parse(incomingPacket);
            switch (parsed.command) {
                case BatteryCommands.GET_TEMP:
                    setBatteryTemps(parsed.value);
                    break;
                case BatteryCommands.GET_VOLTAGE:
                    setBatteryVoltage(parsed.value);
                    break;
                case BatteryCommands.GET_CURRENT:
                    setBatteryCurrent(parsed.value);
                    break;
                default:
                    log.error("Invalid command (data type) received in battery message!");
            }
        });
        return cleanup;
    }, []);
}
