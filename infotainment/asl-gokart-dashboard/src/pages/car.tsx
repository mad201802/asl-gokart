import BatteryIndicator from "@/components/shared/battery-indicator";
import DigitalClock from "@/components/shared/clock";
import DriveModeIndicator from "@/components/shared/drive-mode-indicator";
import TemperatureBox from "@/components/shared/temperature-scale/temperature-box";

const CarPage = () => {
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

            <div className="flex flex-col gap-y-4">
            <TemperatureBox label="Battery" currentTemp={50} minTemp={0} maxTemp={100}></TemperatureBox>
            <TemperatureBox label="Motor" currentTemp={33} minTemp={0} maxTemp={100}></TemperatureBox>
            <TemperatureBox label="Controller 1" currentTemp={21} minTemp={0} maxTemp={100}></TemperatureBox>
            <TemperatureBox label="Controller 2" currentTemp={24} minTemp={0} maxTemp={100}></TemperatureBox>
            </div>



        </div>

    );
}

export default CarPage;