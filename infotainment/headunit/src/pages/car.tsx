import { HeaderBar } from "@/components/shared/header-bar";
import TemperatureBox from "@/components/shared/temperature-scale/temperature-box";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React from "react";

const CarPage = () => {


    return (
        <div>
            <HeaderBar />
        </div>

    );
}

export default CarPage;