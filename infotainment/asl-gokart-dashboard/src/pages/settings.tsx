import BatteryIndicator from "@/components/shared/battery-indicator";
import DigitalClock from "@/components/shared/clock";
import LabeledSwitch from "@/components/shared/labeled-switch";
import TabsSelector from "@/components/shared/tabs-selector";

const SettingsPage = () => {
  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <DigitalClock />
        <BatteryIndicator />
      </div>


      <div className="flex flex-row items-center justify-between px-2 py-1">
        {/* ### 1. Einstellungsblock ### */}
        <div className="flex flex-col items-left justify-center gap-y-2 pt-10 pl-7">
          <LabeledSwitch id="advanced-logging" label="Advanced Logging" defaultValue={false} />
          <LabeledSwitch id="airplane-mode" label="Airplane Mode" defaultValue={false} />
          <LabeledSwitch id="on-by-default" label="On by Default" defaultValue={true} />
        </div>

        {/* ### 2. Einstellungsblock ### */}
        <div className="flex flex-col items-left justify-center gap-y-2 pt-10 pl-7">
          <TabsSelector 
            label="Drive Mode" 
            options={[
              {value: "eco", label: "Eco"}, 
              {value: "comfort", label: "Comfort"}, 
              {value: "sport", label: "Sport"}]} 
            defaultValue="eco"  
              />
        </div>       

      </div>

    </div>
  );
};

export default SettingsPage;
