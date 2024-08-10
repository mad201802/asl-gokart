import BatteryHeatmap from "@/components/shared/battery-temp-map/battery-heatmap";
import { HeaderBar } from "@/components/shared/header-bar";
import { Button } from "@/components/ui/button";
import { useStore } from "@/stores/useStore";

const BatteryPage = () => {

    const { batteryTemps, avgBatteryTemp, minTemp, maxTemp, voltage } = useStore();
    const { setBatteryTemps } = useStore();

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
            <HeaderBar />

            <div className="flex flex-col items-center mt-4">
                <BatteryHeatmap 
                    tempValues={batteryTemps} 
                    width={300} 
                    height={300} 
                    minTemp={12.5} 
                    maxTemp={40}
                />
                <div className="flex flex-col mt-2 w-72">
                    <div className="flex flex-row justify-between">
                        <div className="text-black text-sm">Avg. Temperature</div>
                        <div className="text-black text-sm">{avgBatteryTemp.toFixed(1)} °C</div>
                    </div>
                    <div className="flex flex-row justify-between">
                        <div className="text-black text-sm">Min/Max Temperature</div>
                        <div className="text-black text-sm">{minTemp.toFixed(1)} / {maxTemp.toFixed(1)} °C</div>
                    </div>
                    <div className="flex flex-row justify-between">
                        <div className="text-black text-sm">Voltage</div>
                        <div className="text-black text-sm">{voltage.toFixed(1)} V</div>
                    </div>
                </div>

                <Button onClick={() => setBatteryTemps(randomBatteryTemps())}>Randomize Temps</Button>
            </div>

        </div>
    );
}

export default BatteryPage;