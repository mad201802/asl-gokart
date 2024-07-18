import BatteryIndicator from "@/components/shared/battery-indicator";
import DigitalClock from "@/components/shared/clock";
import LabeledSwitch from "@/components/shared/labeled-switch";
import DriveModeIndicator from "@/components/shared/drive-mode-indicator";
import TabsSelector from "@/components/shared/tabs-selector";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useStore } from "@/stores/useStore";
import { tabsSelectorStates } from "@/data/enums";

const SettingsPage = () => {

  const [showBrightnessWarning, setShowBrightnessWarning] = useState(false);

  const { screenBrightness, setScreenBrightness, driveMode, setDriveMode } = useStore();

  let handleSliderChange = (value: number) => {
    console.log(value);
    setScreenBrightness(value);
    if(value < 25) {
      setShowBrightnessWarning(true);
    } else {
      setShowBrightnessWarning(false);
    }
  }

  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <DigitalClock />
        <DriveModeIndicator />
        <BatteryIndicator />
      </div>

      {/* ### "Tabelle" mit Rows ### */}
      <div className="flex flex-row justify-between items-start px-2 py-1 pt-10">
        {/* ### 1. Einstellungsblock ### */}
        <div className="flex flex-col items-left justify-center gap-y-2 pl-7">
          <LabeledSwitch id="advanced-logging" label="Advanced Logging" defaultValue={false} />
          <LabeledSwitch id="airplane-mode" label="Airplane Mode" defaultValue={false} />
          <LabeledSwitch id="on-by-default" label="On by Default" defaultValue={true} />
        </div>
        {/* ### 2. Einstellungsblock ### */}
        <div className="flex flex-col items-left justify-center gap-y-2 ms-16">
          <TabsSelector 
            label="Drive Mode" 
            options={tabsSelectorStates().driveModes}
            defaultValue={driveMode}
            onValueChange={setDriveMode}
              />
          <div>
              <Label htmlFor="avanced-settings" className="text-base mr-5">Advanced Settings</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Configure</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Advanced Settings</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    <p>Here you can find advanced settings</p>
                    <Separator className="mt-3"/>
                    <div className="flex flex-row">
                      <Label htmlFor="slider" className="text-base mr-5">Screen Brightness</Label>
                      <Slider onValueChange={(v) => handleSliderChange(Number(v))}  defaultValue={[screenBrightness]} max={100} step={1} />                    
                    </div>
                    {showBrightnessWarning && <p className="text-red-500">Brightness might be too low for driving in bright daylight!</p>}
                  </DialogDescription>
                  <DialogFooter>
                    <DialogClose asChild>
                      <Button>Close</Button>
                    </DialogClose>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
          </div>
        </div>       

      </div>

    </div>
  );
};

export default SettingsPage;
