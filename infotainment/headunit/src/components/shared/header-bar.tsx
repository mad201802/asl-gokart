import { Lock, Unlock, CloudCheck, CloudAlert, CloudOff, EthernetPort, Unplug } from "lucide-react";
import DigitalClock from "./clock";
import DriveModeIndicator from "./drive-mode-indicator";
import BatteryIndicator from "./battery-indicator";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React, { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { BatteryCommands } from "@/data/zonecontrollers/zonecontrollers";
import log from "@/lib/logger";

export const HeaderBar = () => {

    const { adminMode, batteryPercentage, setBatteryVoltage, analyticsEnabled, analyticsConnected, gokartLanConnected } = useStore(
        useShallow((state) => ({
            adminMode: state.adminMode,
            batteryPercentage: state.batteryPercentage,
            setBatteryVoltage: state.setBatteryVoltage,
            analyticsEnabled: state.analyticsEnabled,
            analyticsConnected: state.analyticsConnected,
            gokartLanConnected: state.gokartLanConnected,
        }))
    );

    useEffect(() => {
        const cleanup = window.sero.onBatteryMessage((incomingPacket: string) => {
          log.debug("Received incoming battery message header-bar.tsx");
          const parsed: IncomingPacket = JSON.parse(incomingPacket);
          switch(parsed.command) {
            case BatteryCommands.GET_VOLTAGE:
                setBatteryVoltage(parsed.value);
                break;
          }
        });
        return cleanup;
    }, []);

    return (
        <div className="flex flex-row items-center justify-between px-2 py-1">
            <div className="flex flex-row items-center gap-4 min-w-28">
                <DriveModeIndicator />
                <div className="flex flex-row items-center gap-2 text-muted-foreground">
                    {gokartLanConnected ? <EthernetPort className="w-6 h-6 text-green-500" /> : <Unplug className="w-6 h-6 text-red-500" />}
                    {analyticsEnabled ? (
                        analyticsConnected ? <CloudCheck className="w-6 h-6 text-green-500" /> : <CloudAlert className="w-6 h-6 text-yellow-500" />
                    ) : (
                        <CloudOff className="w-6 h-6" />
                    )}
                </div>
            </div>
            <DigitalClock />
            <div className="flex min-w-28 justify-end items-center">
            { adminMode ? <Unlock className="w-6 h-6 mr-3 text-red" /> : <Lock className="w-6 h-6 mr-3" /> }
            <BatteryIndicator batteryLevel={batteryPercentage*100} />
            </div>
        </div>
    );
}