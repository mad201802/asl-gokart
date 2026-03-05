import LabeledSwitch from "@/components/shared/labeled-switch";
import TabsSelector from "@/components/shared/tabs-selector";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useStore } from "@/stores/useStore";
import { DriveModes, tabsSelectorStates } from "@/data/controlling_models/drivetrain";
import { CodeInput } from "@/components/admin-mode/code-input";
import { CodeNumberpad } from "@/components/admin-mode/code-numberpad";
import { HeaderBar } from "@/components/shared/header-bar";
import { toast } from "sonner";
import AvancedSettingsDialog from "@/components/shared/advanced-settings/advanced-settings-dialog";
import AdminSettingsDialog from "@/components/admin-mode/admin-settings-dialog";
import React, { useEffect } from "react";
import { Loader2, Check, X } from "lucide-react";
import PowerMenu from "@/components/power-menu/power-menu";
import log, { setRendererLogLevel, type LogLevel } from "@/lib/logger";

const SettingsPage = () => {

  const { driveMode, adminMode, speedLimit, minSettableSpeed, maxSettableSpeed, appVersion, analyticsEnabled, analyticsBackendUrl, logLevel } = useStore();
  const { setDriveMode, setAdminMode, setAdminPin, setSpeedLimit, setAppVersion, setAnalyticsEnabled, setAnalyticsBackendUrl, setLogLevel } = useStore();

  const [urlInput, setUrlInput] = React.useState(analyticsBackendUrl);
  const [connectionStatus, setConnectionStatus] = React.useState<"idle" | "checking" | "success" | "error">("idle");
  const [analyticsDialogOpen, setAnalyticsDialogOpen] = React.useState(false);

//  const [speedLimitUiLabel, setSpeedLimitUiLabel] = React.useState(speedLimit);

  let handleLogout = () => {
    setAdminMode(false);
    setAdminPin("");
    toast("Admin mode disabled!");
  }

  useEffect(() => {
    const fetchAppVersion = async () => {
      try {
        const version = await window.app.getVersion();
        setAppVersion(version);
      } catch (e) {
      log.error(e);
      }
    };
    const fetchAnalyticsUrl = async () => {
      try {
        const url = await window.app.getAnalyticsUrl();
        setAnalyticsBackendUrl(url);
        setUrlInput(url);
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
    fetchAnalyticsUrl();
    fetchLogLevel();
  }, []);

  let handleToggleAnalytics = (enabled: boolean) => {
    window.app.toggleAnalytics(enabled)
      .then((result) => {
        setAnalyticsEnabled(result);
        toast(`Cloud Analytics ${result ? "enabled" : "disabled"}!`);
      });
  }

  let handleCheckConnection = async () => {
    setConnectionStatus("checking");
    try {
      // backend URL stripped of any API path, for connection testing (universal stripping, not just /api/gokart)
      const urlToTest = urlInput.replace(/\/api\/.*$/, "");
      const ok = await window.app.checkAnalyticsConnection(urlToTest);
      setConnectionStatus(ok ? "success" : "error");
    } catch {
      setConnectionStatus("error");
    }
  }

  let handleSaveAnalyticsUrl = async () => {
    const savedUrl = await window.app.setAnalyticsUrl(urlInput);
    setAnalyticsBackendUrl(savedUrl);
    setAnalyticsDialogOpen(false);
    toast("Analytics Backend URL updated!");
  }

  let handleAnalyticsDialogOpenChange = (open: boolean) => {
    setAnalyticsDialogOpen(open);
    if (open) {
      setUrlInput(analyticsBackendUrl);
      setConnectionStatus("idle");
    }
  }

  let handleLogLevelChange = async (level: LogLevel) => {
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
          <LabeledSwitch id="airplane-mode" label="Airplane Mode" defaultValue={false} />
          <LabeledSwitch id="on-by-default" label="On by Default" defaultValue={true} />
          <div className="flex flex-row justify-between items-center space-x-4">
              <Label htmlFor="analytics-backend" className="text-base mr-5">Analytics Backend</Label>
              <Dialog open={analyticsDialogOpen} onOpenChange={handleAnalyticsDialogOpenChange}>
                <DialogTrigger asChild>
                  <Button variant="outline">Configure</Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Analytics Backend URL</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    Set the URL of the analytics backend. Connection must be verified before saving.
                    <Separator className="mt-3" />
                  </DialogDescription>
                  <div className="flex flex-col gap-y-4">
                    <div className="flex flex-row items-center gap-x-2">
                      <Input
                        placeholder="http://localhost:3000/api/gokart"
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          setConnectionStatus("idle");
                        }}
                      />
                      {connectionStatus === "success" && <Check className="text-green-500 shrink-0" size={20} />}
                      {connectionStatus === "error" && <X className="text-red-500 shrink-0" size={20} />}
                      {connectionStatus === "checking" && <Loader2 className="animate-spin text-muted-foreground shrink-0" size={20} />}
                    </div>
                    {connectionStatus === "error" && (
                      <p className="text-sm text-red-500">Connection failed. Please check the URL and try again.</p>
                    )}
                    <div className="flex flex-row justify-end gap-x-2">
                      <Button variant="outline" onClick={handleCheckConnection} disabled={connectionStatus === "checking" || !urlInput}>
                        {connectionStatus === "checking" ? "Checking..." : "Check Connection"}
                      </Button>
                      <Button onClick={handleSaveAnalyticsUrl} disabled={connectionStatus !== "success"}>
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
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

      <div className="flex flex-row mt-auto justify-center items-start px-2 py-1 pt-10">
        Release {appVersion}
      </div>

    </div>
  );
};

export default SettingsPage;
