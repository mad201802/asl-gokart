import { LabeledSwitchProps } from "@/data/models";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import React from "react";

const LabeledSwitch = (props: LabeledSwitchProps) => {
    return (
        <div className="flex flex-row justify-between items-center space-x-4">
            <Label htmlFor={props.id} className="text-base">{props.label}</Label>
            <Switch id={props.id} onCheckedChange={props.onChange} defaultChecked={props.defaultValue} />
        </div>
    )}
export default LabeledSwitch;