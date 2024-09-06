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
import { useStore } from "@/stores/useStore";
import React from "react";


const AdminSettingsDialog = () => {

    const { adminMode, maxSettableSpeed, minSettableSpeed } = useStore();
    const { setMaxSettableSpeed, setMinSettableSpeed } = useStore();

    return (
    <Dialog>
        <DialogTrigger asChild>
            <Button disabled={!adminMode}>Configure</Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Admin Settings</DialogTitle>
            </DialogHeader>
            <DialogDescription>
            <p>Here you can configure core values of the system</p>
            <Separator className="mt-3"/>
            <div className="flex flex-row">
                <Label htmlFor="slider" className="text-base mr-5">Max. settable speed</Label>
                <Label htmlFor="max-speed-value" className="flex items-center justify-center font-light mr-5 w-36">{maxSettableSpeed} km/h</Label>
                <Slider 
                    onValueChange={(v) => setMaxSettableSpeed(Number(v))}  
                    defaultValue={[maxSettableSpeed]}
                    value={[maxSettableSpeed]} 
                    min={0} max={120} step={5} />                    
            </div>
            {(maxSettableSpeed === 0) && <p className="text-red-500">The GoKart won't drive in this configuration!</p>}
            <div className="flex flex-row">
                <Label htmlFor="slider" className="text-base mr-5">Min. settable speed</Label>
                <Label htmlFor="max-speed-value" className="flex items-center justify-center font-light mr-5 w-36">{minSettableSpeed} km/h</Label>
                <Slider 
                    onValueChange={(v) => setMinSettableSpeed(Number(v))} 
                    defaultValue={[minSettableSpeed]} 
                    value={[minSettableSpeed]}
                    min={0} max={120} step={5} />                    
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

export default AdminSettingsDialog;