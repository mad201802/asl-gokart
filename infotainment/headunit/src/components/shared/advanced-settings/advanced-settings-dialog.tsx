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
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useStore } from "@/stores/useStore";
import React from "react";
import LabeledSwitch from "../labeled-switch";
import { OutgoingPacket } from "@/data/zonecontrollers/packets";
import { ThrottleCommands, Zones } from "@/data/zonecontrollers/zonecontrollers";


const AvancedSettingsDialog = () => {

    const [showBrightnessWarning, setShowBrightnessWarning] = useState(false);

    const { screenBrightness, showRawThrottle } = useStore();
    const { setScreenBrightness, setShowRawThrottle } = useStore();

    let handleSliderChange = (value: number) => {
        setScreenBrightness(value);
        if(value < 25) {
          setShowBrightnessWarning(true);
        } else {
          setShowBrightnessWarning(false);
        }
      }

    return (
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
            <div className="flex flex-col gap-4">

              <div className="flex flex-row">
                  <Label htmlFor="slider" className="text-base mr-5">Screen Brightness</Label>
                  <Slider onValueChange={(v) => handleSliderChange(Number(v))}  defaultValue={[screenBrightness]} max={100} step={1} />                    
              </div>
              {showBrightnessWarning && <p className="text-red-500">Brightness might be too low for driving in bright daylight!</p>}

              <LabeledSwitch id={""} label={"Show raw throttle"} onChange={(v) => setShowRawThrottle(v)} defaultValue={showRawThrottle} />

              <Button
                onClick={() => {
                  const newPacket: OutgoingPacket = {
                    zone: Zones.THROTTLE,
                    command: ThrottleCommands.SET_RECONNECT_UART
                  };
                  console.log(JSON.stringify(newPacket));
                  window.websocket.send(newPacket, Zones.THROTTLE);
                }}
              >
                Reconnect Controller UART
              </Button>
            </div>
            </DialogDescription>
            <DialogFooter>
            <DialogClose asChild>
                <Button>Close</Button>
            </DialogClose>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    )
} 

export default AvancedSettingsDialog;