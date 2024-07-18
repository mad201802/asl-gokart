import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

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
  onValueChange: (value: string) => void;
  readOnly?: boolean;
}

const TabsSelector = (props: TabsSelectorProps) => {


    let handleTabChange = (value: string) => {
      // Set drive mode in context
      props.onValueChange(value);    
    }

    return (
      <div className="flex flex-row gap-2 items-center justify-center">
        <Label className="text-base ">{props.label}</Label>
        <Tabs onValueChange={(v: string) => handleTabChange(v)} value={props.value} defaultValue={props.defaultValue} className="">
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