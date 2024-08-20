import { BatteryFull } from "lucide-react";

const BatteryIndicator = () => {
  return (
    <div className="flex flex-row gap-2 items-center justify-center">
      <p>100%</p>
      <BatteryFull />
    </div>
  );
};

export default BatteryIndicator;
