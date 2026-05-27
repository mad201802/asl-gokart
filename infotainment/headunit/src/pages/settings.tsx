import LabeledSwitch from "@/components/shared/labeled-switch";
import TabsSelector from "@/components/shared/tabs-selector";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import { DriveModes, tabsSelectorStates } from "@/data/controlling_models/drivetrain";
import { HeaderBar } from "@/components/shared/header-bar";
import { toast } from "sonner";
import AdvancedSettingsDialog from "@/components/shared/advanced-settings/advanced-settings-dialog";
import AdminSettingsDialog from "@/components/admin-mode/admin-settings-dialog";
import React, { useEffect } from "react";
import PowerMenu from "@/components/power-menu/power-menu";
import log, { setRendererLogLevel, type LogLevel } from "@/lib/logger";
import { AnalyticsBackendDialog } from "@/components/settings/analytics-backend-dialog";
import { AdminAuthDialog } from "@/components/admin-mode/admin-auth-dialog";
import { NetworkInterfaceDialog } from "@/components/settings/network-interface-dialog";

const SettingsPage = () => {

  const { driveMode, speedLimit, minSettableSpeed, maxSettableSpeed, appVersion, analyticsEnabled, logLevel, setDriveMode, setSpeedLimit, setAppVersion, setAnalyticsEnabled, setLogLevel } = useStore(
    useShallow((state) => ({
      driveMode: state.driveMode,
      speedLimit: state.speedLimit,
      minSettableSpeed: state.minSettableSpeed,
      maxSettableSpeed: state.maxSettableSpeed,
      appVersion: state.appVersion,
      analyticsEnabled: state.analyticsEnabled,
      logLevel: state.logLevel,
      setDriveMode: state.setDriveMode,
      setSpeedLimit: state.setSpeedLimit,
      setAppVersion: state.setAppVersion,
      setAnalyticsEnabled: state.setAnalyticsEnabled,
      setLogLevel: state.setLogLevel,
    }))
  );

  useEffect(() => {
    const fetchAppVersion = async () => {
      try {
        const version = await window.app.getVersion();
        setAppVersion(version);
      } catch (e) {
      log.error(e);
      }
    };
    const fetchLogLevel = async () => {
      try {
        const level = await window.app.getLogLevel() as LogLevel;
        setLogLevel(level);
        setRendererLogLevel(level);
      } catch (e) {
        log.error(e);
      }
    };
    fetchAppVersion();
    fetchLogLevel();
  }, [setAppVersion, setLogLevel]);

  const handleToggleAnalytics = (enabled: boolean) => {
    window.app.toggleAnalytics(enabled)
      .then((result) => {
        setAnalyticsEnabled(result);
        toast(`Cloud Analytics ${result ? "enabled" : "disabled"}!`);
      });
  }

  const handleLogLevelChange = async (level: LogLevel) => {
    setLogLevel(level);
    setRendererLogLevel(level);
    await window.app.setLogLevel(level);
    toast(`Log level set to ${level}`);
    log.info(`Log level changed to: ${level}`);
  }



  return (
    <div className="w-full h-full flex flex-col">
      <HeaderBar />

      {/* ### "Tabelle" mit Rows ### */}
      <div className="flex flex-row justify-between items-start px-2 py-1 pt-10">
        {/* ### 1. Einstellungsblock ### */}
        <div className="flex flex-col items-left justify-center gap-y-2 pl-7">
          <LabeledSwitch 
            id="analytics-enabled" 
            label="Cloud Analytics" 
            defaultValue={analyticsEnabled} 
            onChange={(v) => handleToggleAnalytics(v)}
            />
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="analytics-backend" className="text-base mr-5">Analytics Backend</Label>
              <AnalyticsBackendDialog
                trigger={<Button variant="outline">Configure</Button>}
              />
          </div>
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="network-interface" className="text-base mr-5">Network Interface</Label>
              <NetworkInterfaceDialog
                trigger={<Button variant="outline">Configure</Button>}
              />
          </div>
          <div className="flex flex-row justify-between items-center space-x-4">
            <Label htmlFor="log-level" className="text-base mr-5">Log Level</Label>
            <Tabs value={logLevel} onValueChange={(v) => handleLogLevelChange(v as LogLevel)}>
              <TabsList>
                <TabsTrigger value="error">Error</TabsTrigger>
                <TabsTrigger value="warn">Warn</TabsTrigger>
                <TabsTrigger value="info">Info</TabsTrigger>
                <TabsTrigger value="debug">Debug</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
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
              <AdvancedSettingsDialog />
          </div>
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="admin-mode" className="text-base mr-5">Admin Mode</Label>
              <AdminAuthDialog 
                trigger={<Button>Authenticate</Button>}
              />
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

      <div className="flex flex-row mt-auto justify-center items-start px-2 py-1 pt-10">
        Release {appVersion}
      </div>

    </div>
  );
};

export default SettingsPage;
