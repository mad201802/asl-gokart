import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { TabsSelectorProps } from "@/data/models";
import { useState } from "react";
import './tabs-selector.css'


const TabsSelector = (props: TabsSelectorProps) => {


    let handleTabChange = (value: string) => {
      // Set drive mode in context
      props.onValueChange(value);
    }

    return (
      <div className="flex flex-row gap-2 items-center justify-center">
        <Label className="text-base ">{props.label}</Label>
        <Tabs onValueChange={(v) => handleTabChange(v)} defaultValue={props.defaultValue} className="">
        <TabsList>
            {
          props.options.map((option) => (
            <TabsTrigger
              className={props.readOnly ? 'read-only' : ''}
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