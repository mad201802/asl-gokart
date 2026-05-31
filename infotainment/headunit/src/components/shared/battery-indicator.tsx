import { BatteryIndicatorProps } from "@/data/models";
import { BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";
import React from "react";

const BatteryIndicator = (props: BatteryIndicatorProps) => {
  return (
    <div className="flex flex-row gap-2 items-center justify-center font-bold text-3xl">
      <p>{props.batteryLevel.toFixed(0)}%</p>
      {props.batteryLevel > 85 && <BatteryFull className="w-[1em] h-[1em]" />}
      {props.batteryLevel <= 85 && props.batteryLevel > 25 && <BatteryMedium className="w-[1em] h-[1em]" />}
      {props.batteryLevel <= 25 && <BatteryLow className="w-[1em] h-[1em]" />}
    </div>
  );
};

export default BatteryIndicator;
