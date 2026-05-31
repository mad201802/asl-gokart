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

type AdminSettingsDialogProps = {
    trigger?: React.ReactNode;
};

const AdminSettingsDialog = ({ trigger }: AdminSettingsDialogProps = {}) => {

    const { adminMode, maxSettableSpeed, minSettableSpeed, pipeThroughRawThrottle, pedalMultiplier, setMaxSettableSpeed, setMinSettableSpeed, setPipeThroughRawThrottle, setPedalMultiplier } = useStore(
        useShallow((state) => ({
            adminMode: state.adminMode,
            maxSettableSpeed: state.maxSettableSpeed,
            minSettableSpeed: state.minSettableSpeed,
            pipeThroughRawThrottle: state.pipeThroughRawThrottle,
            pedalMultiplier: state.pedalMultiplier,
            setMaxSettableSpeed: state.setMaxSettableSpeed,
            setMinSettableSpeed: state.setMinSettableSpeed,
            setPipeThroughRawThrottle: state.setPipeThroughRawThrottle,
            setPedalMultiplier: state.setPedalMultiplier,
        }))
    );

    const [liveMaxSpeed, setLiveMaxSpeed] = useState(maxSettableSpeed);
    const [liveMinSpeed, setLiveMinSpeed] = useState(minSettableSpeed);
    const [livePedalMultiplier, setLivePedalMultiplier] = useState(pedalMultiplier);

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