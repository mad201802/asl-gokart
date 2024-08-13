import { Lock, Unlock } from "lucide-react";
import DigitalClock from "./clock";
import DriveModeIndicator from "./drive-mode-indicator";
import BatteryIndicator from "./battery-indicator";
import { useStore } from "@/stores/useStore";

export const HeaderBar = () => {

    const { adminMode } = useStore();

    return (
        <div className="flex flex-row items-center justify-between px-2 py-1">
            <div className="min-w-28">
            <DigitalClock />
            </div>
            <DriveModeIndicator />
            <div className="flex min-w-28 justify-end">
            { adminMode ? <Unlock className="w-6 h-6 mr-3 text-red" /> : <Lock className="w-6 h-6 mr-3" /> }
            <BatteryIndicator />
            </div>
        </div>
    );
}