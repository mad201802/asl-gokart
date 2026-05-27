import BatteryHeatmap from "@/components/shared/battery-temp-map/battery-heatmap";
import { HeaderBar } from "@/components/shared/header-bar";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React from "react";
import {
    CircularProgressbarWithChildren,
    buildStyles,
} from "react-circular-progressbar";
import "react-circular-progressbar/dist/styles.css";
import { SOC_BOUNDARIES, SOC_SEGMENTS, HEATMAP_MIN_TEMP, HEATMAP_MAX_TEMP } from "@/data/battery-config";
import { FLOW_STATE_DISPLAY } from "@/data/controlling_models/battery";
import { interpolateColor } from "@/lib/utils/gauge-utils";

const BatteryPage = () => {

    const { batteryTemps, avgBatteryTemp, minTemp, maxTemp, voltage, batteryCurrent, batteryPercentage, flowState } = useStore(
        useShallow((state) => ({
            batteryTemps: state.batteryTemps,
            avgBatteryTemp: state.avgBatteryTemp,
            minTemp: state.minTemp,
            maxTemp: state.maxTemp,
            voltage: state.voltage,
            batteryCurrent: state.batteryCurrent,
            batteryPercentage: state.batteryPercentage,
            flowState: state.flowState,
        }))
    );

    const power = batteryCurrent * voltage;
    const socPct = batteryPercentage * 100;

    const socColor = interpolateColor(socPct, SOC_BOUNDARIES[0], SOC_BOUNDARIES[1], SOC_SEGMENTS);
    const { label: flowLabel, color: flowColor } = FLOW_STATE_DISPLAY[flowState];

    return (
        <div className="flex flex-col w-full h-screen">
            <HeaderBar />

            <div className="flex flex-row flex-1 items-center gap-4 p-4 pt-2">

                {/* Left column: State of Charge + flow state */}
                <div className="flex flex-col items-center justify-center gap-4 w-[40%]">
                    <div className="w-48">
                        <CircularProgressbarWithChildren
                            value={socPct}
                            styles={buildStyles({
                                pathColor: socColor,
                                trailColor: "#374151",
                                strokeLinecap: "round",
                            })}
                        >
                            <div className="flex flex-col items-center">
                                <span className="text-4xl font-bold">{socPct.toFixed(0)}%</span>
                                <span className="text-xs text-muted-foreground">State of Charge</span>
                            </div>
                        </CircularProgressbarWithChildren>
                    </div>
                    <span style={{ color: flowColor }} className="text-2xl font-semibold">{flowLabel}</span>
                </div>

                {/* Right column: Electrical values + temperature */}
                <div className="flex flex-col flex-1 gap-3">

                    {/* Electrical values row */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-3 px-2">
                            <span className="text-3xl font-bold">{voltage.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground mt-1">Voltage (V)</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-3 px-2">
                            <span className="text-3xl font-bold">{Math.abs(batteryCurrent).toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground mt-1">Current (A)</span>
                        </div>
                        <div className="flex flex-col items-center justify-center rounded-xl border bg-card py-3 px-2">
                            <span className="text-3xl font-bold">
                                {power >= 1000 ? (power / 1000).toFixed(2) : power.toFixed(0)}
                            </span>
                            <span className="text-xs text-muted-foreground mt-1">
                                Power ({power >= 1000 ? "kW" : "W"})
                            </span>
                        </div>
                    </div>

                    {/* Temperature section */}
                    <div className="flex flex-row flex-1 gap-4 rounded-xl border bg-card p-3">
                        <BatteryHeatmap
                            tempValues={batteryTemps}
                            width={180}
                            height={180}
                            minTemp={HEATMAP_MIN_TEMP}
                            maxTemp={HEATMAP_MAX_TEMP}
                        />
                        <div className="flex flex-col justify-evenly flex-1">
                            <div className="flex flex-row justify-between items-center">
                                <span className="text-sm text-muted-foreground">Average</span>
                                <span className="text-xl font-semibold">{avgBatteryTemp.toFixed(1)} °C</span>
                            </div>
                            <div className="flex flex-row justify-between items-center">
                                <span className="text-sm text-muted-foreground">Min</span>
                                <span className="text-xl font-semibold">{minTemp.toFixed(1)} °C</span>
                            </div>
                            <div className="flex flex-row justify-between items-center">
                                <span className="text-sm text-muted-foreground">Max</span>
                                <span className="text-xl font-semibold">{maxTemp.toFixed(1)} °C</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

export default BatteryPage;