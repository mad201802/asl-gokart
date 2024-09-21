import { BatteryIndicatorProps } from "@/data/models";
import { BatteryFull, BatteryLow, BatteryMedium } from "lucide-react";
import React from "react";

const BatteryIndicator = (props: BatteryIndicatorProps) => {
  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      <p>{props.batteryLevel.toFixed(0)}%</p>
      {props.batteryLevel > 85 && <BatteryFull />}
      {props.batteryLevel <= 85 && <BatteryMedium />}
      {props.batteryLevel <= 25 && <BatteryLow />}
    </div>
  );
};

export default BatteryIndicator;
