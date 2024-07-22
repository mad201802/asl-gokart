import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import { DriveModes, Gears } from "@/data/controlling_models/drivetrain";

export interface TabsSelectorOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface TabsSelectorProps {
  label: string;
  value?: string;
  options: TabsSelectorOption[];
  defaultValue: string;
  onValueChange?: (value: Gears | DriveModes) => void;
  readOnly?: boolean;
}

const handleTabChange = (value: string, onValueChange?: (value: Gears | DriveModes) => void) => {
  if(onValueChange) {
    onValueChange(value as Gears | DriveModes);
  }
}

const TabsSelector = (props: TabsSelectorProps) => {

    return (
      <div className="flex flex-row gap-2 items-center justify-center">
        <Label className="text-base ">{props.label}</Label>
        <Tabs onValueChange={(v: string) => handleTabChange(v, props.onValueChange)} value={props.value} defaultValue={props.defaultValue} className="">
        <TabsList>
            {
          props.options.map((option) => (
            <TabsTrigger
              className={props.readOnly ? cn('pointer-events-none cursor-default') : ''}
              key={option.value} 
              value={option.value}
              disabled={option.disabled}>
                {option.label}
            </TabsTrigger>
          ))
            }
        </TabsList>

        </Tabs>         
      </div>
    );
  };
  
  export default TabsSelector;