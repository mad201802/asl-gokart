import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React, { useState } from "react";
import { toast } from "sonner";

type AdminSettingsDialogProps = {
    trigger?: React.ReactNode;
};

const AdminSettingsDialog = ({ trigger }: AdminSettingsDialogProps = {}) => {

    const { 
        adminMode, 
        maxSettableSpeed, 
        minSettableSpeed, 
        pipeThroughRawThrottle, 
        pedalMultiplier, 
        autoStart,
        fullscreenOnStartup,
        devToolsEnabled,
        setMaxSettableSpeed, 
        setMinSettableSpeed, 
        setPipeThroughRawThrottle, 
        setPedalMultiplier,
        setAutoStart,
        setFullscreenOnStartup,
        setDevToolsEnabled,
    } = useStore(
        useShallow((state) => ({
            adminMode: state.adminMode,
            maxSettableSpeed: state.maxSettableSpeed,
            minSettableSpeed: state.minSettableSpeed,
            pipeThroughRawThrottle: state.pipeThroughRawThrottle,
            pedalMultiplier: state.pedalMultiplier,
            autoStart: state.autoStart,
            fullscreenOnStartup: state.fullscreenOnStartup,
            devToolsEnabled: state.devToolsEnabled,
            setMaxSettableSpeed: state.setMaxSettableSpeed,
            setMinSettableSpeed: state.setMinSettableSpeed,
            setPipeThroughRawThrottle: state.setPipeThroughRawThrottle,
            setPedalMultiplier: state.setPedalMultiplier,
            setAutoStart: state.setAutoStart,
            setFullscreenOnStartup: state.setFullscreenOnStartup,
            setDevToolsEnabled: state.setDevToolsEnabled,
        }))
    );

    const [liveMaxSpeed, setLiveMaxSpeed] = useState(maxSettableSpeed);
    const [liveMinSpeed, setLiveMinSpeed] = useState(minSettableSpeed);
    const [livePedalMultiplier, setLivePedalMultiplier] = useState(pedalMultiplier);

    const handleToggleAutoStart = (enabled: boolean) => {
        window.app.setAutoStart(enabled).then((result) => {
            setAutoStart(result);
            toast(`Auto-start ${result ? "enabled" : "disabled"}!`);
        }).catch((e) => {
            console.error(e);
            toast.error("Failed to change Auto-start settings!");
        });
    };

    const handleToggleFullscreenOnStartup = (enabled: boolean) => {
        window.app.setFullscreenOnStartup(enabled).then((result) => {
            setFullscreenOnStartup(result);
            toast(`Start in Fullscreen ${result ? "enabled" : "disabled"}!`);
        }).catch((e) => {
            console.error(e);
            toast.error("Failed to change Fullscreen settings!");
        });
    };

    const handleToggleDevTools = (enabled: boolean) => {
        window.app.setDevToolsEnabled(enabled).then((result) => {
            setDevToolsEnabled(result);
            toast(`Developer Tools ${result ? "enabled" : "disabled"}!`);
        }).catch((e) => {
            console.error(e);
            toast.error("Failed to change Developer Tools settings!");
        });
    };

    return (
        <Dialog onOpenChange={(open) => {
            if (open) {
                setLiveMaxSpeed(maxSettableSpeed);
                setLiveMinSpeed(minSettableSpeed);
                setLivePedalMultiplier(pedalMultiplier);
            }
        }}>
            <DialogTrigger asChild>
                {trigger ?? <Button variant="outline" disabled={!adminMode}>Configure</Button>}
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Admin Settings</DialogTitle>
                </DialogHeader>

                <Separator />

                <div className="flex flex-col gap-6 py-2">

                    {/* Max settable speed */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Max. settable speed</Label>
                            <span className="text-2xl font-mono font-semibold tabular-nums">
                                {liveMaxSpeed} <span className="text-sm font-sans font-normal text-muted-foreground">km/h</span>
                            </span>
                        </div>
                        <Slider
                            value={[liveMaxSpeed]}
                            onValueChange={(v) => setLiveMaxSpeed(v[0])}
                            onValueCommit={(v) => setMaxSettableSpeed(Number(v))}
                            min={0} max={120} step={5}
                        />
                        {liveMaxSpeed === 0 && (
                            <p className="text-sm text-destructive">The GoKart won't drive in this configuration!</p>
                        )}
                    </div>

                    <Separator />

                    {/* Min settable speed */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Min. settable speed</Label>
                            <span className="text-2xl font-mono font-semibold tabular-nums">
                                {liveMinSpeed} <span className="text-sm font-sans font-normal text-muted-foreground">km/h</span>
                            </span>
                        </div>
                        <Slider
                            value={[liveMinSpeed]}
                            onValueChange={(v) => setLiveMinSpeed(v[0])}
                            onValueCommit={(v) => setMinSettableSpeed(Number(v))}
                            min={0} max={120} step={5}
                        />
                    </div>

                    <Separator />

                    {/* Pedal Multiplier */}
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Pedal Multiplier</Label>
                            <span className="text-2xl font-mono font-semibold tabular-nums">
                                {livePedalMultiplier} <span className="text-sm font-sans font-normal text-muted-foreground">%</span>
                            </span>
                        </div>
                        <Slider
                            value={[livePedalMultiplier]}
                            onValueChange={(v) => setLivePedalMultiplier(v[0])}
                            onValueCommit={(v) => setPedalMultiplier(Number(v))}
                            min={0} max={100} step={5}
                        />
                    </div>

                    <Separator />

                    {/* Pipe through raw throttle */}
                    <div className="flex items-center justify-between">
                        <Label className="text-base">Pipe through raw throttle</Label>
                        <Switch
                            checked={pipeThroughRawThrottle}
                            onCheckedChange={setPipeThroughRawThrottle}
                        />
                    </div>

                    <Separator />

                    {/* Auto-start on Boot */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="auto-start" className="text-base">Auto-start on Boot</Label>
                        <Switch
                            id="auto-start"
                            checked={autoStart}
                            onCheckedChange={handleToggleAutoStart}
                        />
                    </div>

                    <Separator />

                    {/* Start in Fullscreen */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="fullscreen-on-startup" className="text-base">Start in Fullscreen</Label>
                        <Switch
                            id="fullscreen-on-startup"
                            checked={fullscreenOnStartup}
                            onCheckedChange={handleToggleFullscreenOnStartup}
                        />
                    </div>

                    <Separator />

                    {/* Developer Tools */}
                    <div className="flex items-center justify-between">
                        <Label htmlFor="devtools-enabled" className="text-base">Enable Developer Tools</Label>
                        <Switch
                            id="devtools-enabled"
                            checked={devToolsEnabled}
                            onCheckedChange={handleToggleDevTools}
                        />
                    </div>

                </div>

                <DialogFooter>
                    <DialogClose asChild>
                        <Button variant="outline">Close</Button>
                    </DialogClose>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AdminSettingsDialog;