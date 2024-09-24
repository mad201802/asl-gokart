import { Lock, Unlock } from "lucide-react";
import DigitalClock from "./clock";
import DriveModeIndicator from "./drive-mode-indicator";
import BatteryIndicator from "./battery-indicator";
import { useStore } from "@/stores/useStore";
import React, { useEffect } from "react";
import { IncomingPacket } from "@/data/zonecontrollers/packets";
import { BatteryCommands } from "@/data/zonecontrollers/zonecontrollers";

export const HeaderBar = () => {

    const { adminMode, batteryPercentage } = useStore();
    const { setBatteryVoltage } = useStore();

    useEffect(() => {
        window.websocket.onBatteryMessage((incomingPacket: string) => {
          // console.log("Received incoming battery message header_bar .tsx");
          const parsed: IncomingPacket = JSON.parse(incomingPacket);
          switch(parsed.command) {
            case BatteryCommands.GET_VOLTAGE:
                setBatteryVoltage(parsed.value);
                break;
          }
        });
    // Cleanup listener on component unmount
    return () => {
        window.websocket.onBatteryMessage(() => {});
      };
    }, []);

    return (
        <div className="flex flex-row items-center justify-between px-2 py-1">
            <div className="min-w-28">
            <DigitalClock />
            </div>
            <DriveModeIndicator />
            <div className="flex min-w-28 justify-end">
            { adminMode ? <Unlock className="w-6 h-6 mr-3 text-red" /> : <Lock className="w-6 h-6 mr-3" /> }
            <BatteryIndicator batteryLevel={batteryPercentage*100} />
            </div>
        </div>
    );
}