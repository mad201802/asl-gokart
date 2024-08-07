import BatteryIndicator from "@/components/shared/battery-indicator";
import BatteryHeatmap from "@/components/shared/battery-temp-map/battery-heatmap";
import DigitalClock from "@/components/shared/clock";
import DriveModeIndicator from "@/components/shared/drive-mode-indicator";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores/useStore";

const BatteryPage = () => {

    const { batteryTemps, avgBatteryTemp, setBatteryTemps } = useStore();

    // Generate 6 random battery temperatures from 10 to 40
    const randomBatteryTemps = () => {
        const temps = [];
        for (let i = 0; i < 6; i++) {
            temps.push(Math.random() * 30 + 10);
        }
        return temps;
    }

    return (
        <div>
            <div className="flex flex-row items-center justify-between px-2 py-1">
                <div className="min-w-28">
                <DigitalClock />
                </div>
                <DriveModeIndicator />
                <div className="flex min-w-28 justify-end">
                <BatteryIndicator />
                </div>
            </div>

            <div className="flex flex-col items-center mt-4">
                <BatteryHeatmap 
                    tempValues={batteryTemps} 
                    width={300} 
                    height={300} 
                    minTemp={12.5} 
                    maxTemp={40}
                />
                <div className="text-black text-xl mt-4">Battery Temperature</div>
                <div className="text-black text-xl">{avgBatteryTemp.toFixed(1)}</div>
                <Button onClick={() => setBatteryTemps(randomBatteryTemps())}>Randomize Temps</Button>
            </div>

        </div>
    );
}

export default BatteryPage;