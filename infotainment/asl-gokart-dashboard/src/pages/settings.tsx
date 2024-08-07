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
import { DriveModes, tabsSelectorStates } from "@/data/controlling_models/drivetrain";
import { CodeInput } from "@/components/admin-mode/code-input";
import { CodeNumberpad } from "@/components/admin-mode/code-numberpad";

const SettingsPage = () => {

  const [showBrightnessWarning, setShowBrightnessWarning] = useState(false);

  const { screenBrightness, setScreenBrightness, driveMode, setDriveMode, adminMode, setAdminMode, setAdminPin } = useStore();

  let handleSliderChange = (value: number) => {
    setScreenBrightness(value);
    if(value < 25) {
      setShowBrightnessWarning(true);
    } else {
      setShowBrightnessWarning(false);
    }
  }

  let logout = () => {
    setAdminMode(false);
    setAdminPin("");
  }



  return (
    <div className="w-full flex flex-col">
      <div className="flex flex-row items-center justify-between px-2 py-1">
        <div className="min-w-28">
          <DigitalClock />
        </div>
        <DriveModeIndicator />
        <div className="flex min-w-28 justify-end">
          <BatteryIndicator />
        </div>
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
            onValueChange={(v) => setDriveMode(v as DriveModes)}
              />
          <div className="flex flex-row justify-between items-center space-x-4">
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
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="admin-mode" className="text-base mr-5">Admin Mode</Label>
              <Dialog>
                <DialogTrigger asChild>
                  <Button>Authenticate</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Admin Mode</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    {!adminMode && <p>Enter your Pin to unlock the administrator features</p>}
                    {adminMode && <p className="text-green-700">Admin Mode activated!</p>}
                    <Separator className="mt-3"/>
                  </DialogDescription>
                  
                  { !adminMode && <div className="flex flex-row justify-center">
                    <CodeInput />
                  </div> }
                  
                  { !adminMode && <CodeNumberpad /> }
                  
                  { adminMode && <div className="flex flex-row justify-center">
                    <Button onClick={() => logout()}>Logout</Button>
                  </div> }
 
                </DialogContent>
              </Dialog>
          </div>
        </div>       

      </div>

    </div>
  );
};

export default SettingsPage;
