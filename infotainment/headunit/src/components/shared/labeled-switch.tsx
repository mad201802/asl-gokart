import { LabeledSwitchProps } from "@/data/models";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

const LabeledSwitch = (props: LabeledSwitchProps) => {
    return (
        <div className="flex flex-row justify-between items-center space-x-4">
            <Label htmlFor={props.id} className="text-base">{props.label}</Label>
            <Switch id={props.id} defaultChecked={props.defaultValue} />
        </div>
    )}
export default LabeledSwitch;