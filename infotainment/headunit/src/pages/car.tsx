import { HeaderBar } from "@/components/shared/header-bar";
import TemperatureBox from "@/components/shared/temperature-scale/temperature-box";

const CarPage = () => {
    return (
        <div>
            
            <HeaderBar />

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