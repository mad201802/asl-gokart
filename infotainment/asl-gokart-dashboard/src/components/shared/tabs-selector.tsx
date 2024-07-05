import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { TabsSelectorProps } from "@/data/models";
import { useState } from "react";


const TabsSelector = (props: TabsSelectorProps) => {


    let handleTabChange = (value: string) => {
      // Set drive mode in context
      props.onValueChange(value);
    }

    return (
      <div className="flex flex-row gap-2 items-center justify-center">
        <Label className="text-base ">{props.label}</Label>
        <Tabs onValueChange={(v) => handleTabChange(v)} defaultValue={props.defaultValue} className="w-[400px]">
        <TabsList>
            {
          props.options.map((option) => (
            <TabsTrigger       
              key={option.value} 
              value={option.value}>{option.label}
            </TabsTrigger>
          ))
            }
{/*             <TabsTrigger value="eco">Eco</TabsTrigger>
            <TabsTrigger value="confort">Comfort</TabsTrigger>
            <TabsTrigger value="race">Race</TabsTrigger> */}
        </TabsList>

        </Tabs>         
      </div>
    );
  };
  
  export default TabsSelector;