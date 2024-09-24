import { HeaderBar } from "@/components/shared/header-bar";
import TemperatureBox from "@/components/shared/temperature-scale/temperature-box";
import { useStore } from "@/stores/useStore";
import React from "react";

const CarPage = () => {

    const { avgBatteryTemp } = useStore();

    return (
        <div>
            
            <HeaderBar />

            <div className="flex flex-col gap-y-4">
            <TemperatureBox label="Battery" currentTemp={avgBatteryTemp} minTemp={-10} maxTemp={45}></TemperatureBox>
            <TemperatureBox label="Motor" currentTemp={33} minTemp={0} maxTemp={100}></TemperatureBox>
            <TemperatureBox label="Controller 1" currentTemp={21} minTemp={0} maxTemp={100}></TemperatureBox>
            <TemperatureBox label="Controller 2" currentTemp={24} minTemp={0} maxTemp={100}></TemperatureBox>
            </div>



        </div>

    );
}

export default CarPage;