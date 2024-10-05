import LabeledSwitch from "@/components/shared/labeled-switch";
import TabsSelector from "@/components/shared/tabs-selector";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores/useStore";
import { DriveModes, tabsSelectorStates } from "@/data/controlling_models/drivetrain";
import { CodeInput } from "@/components/admin-mode/code-input";
import { CodeNumberpad } from "@/components/admin-mode/code-numberpad";
import { HeaderBar } from "@/components/shared/header-bar";
import { toast } from "sonner";
import AvancedSettingsDialog from "@/components/shared/advanced-settings/advanced-settings-dialog";
import AdminSettingsDialog from "@/components/admin-mode/admin-settings-dialog";
import React from "react";
import PowerMenu from "@/components/power-menu/power-menu";

const SettingsPage = () => {

  const { driveMode, adminMode, speedLimit, minSettableSpeed, maxSettableSpeed } = useStore();
  const { setDriveMode, setAdminMode, setAdminPin, setSpeedLimit } = useStore();

//  const [speedLimitUiLabel, setSpeedLimitUiLabel] = React.useState(speedLimit);

  let handleLogout = () => {
    setAdminMode(false);
    setAdminPin("");
    toast("Admin mode disabled!");
  }



  return (
    <div className="w-full flex flex-col">
      <HeaderBar />

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
              <AvancedSettingsDialog />
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
                    <Button onClick={() => handleLogout()}>Logout</Button>
                  </div> }
                </DialogContent>
              </Dialog>
          </div>
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="avanced-settings" className="text-base mr-5">Admin Settings</Label>
              <AdminSettingsDialog />
          </div>
          <div className="flex flex-row justify-between items-center space-x-4">
            <Label htmlFor="max-speed" className="text-base mr-5">Max. Speed</Label>
            <Label htmlFor="max-speed-value" className="text-base text-center font-light mr-5 w-36">
              { speedLimit } km/h
            </Label>
            <Slider 
              // onValueChange={(v) => setSpeedLimit(Number(v))}  
              // onValueChange={(v) => setSpeedLimitUiLabel(Number(v))}
              onValueCommit={(v) => setSpeedLimit(Number(v))}
              defaultValue={[speedLimit]} 
              min={minSettableSpeed} 
              max={maxSettableSpeed} 
              step={1} />                    
          </div> 
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="power-menu" className="text-base mr-5">Power Menu</Label>
              <PowerMenu />
          </div>

        </div>   
   
      </div>

    </div>
  );
};

export default SettingsPage;
