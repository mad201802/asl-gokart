import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { TabsSelectorProps } from "@/data/models";


const TabsSelector = (props: TabsSelectorProps) => {
    return (
      <div className="flex flex-row gap-2 items-center justify-center">
        <Label>{props.label}</Label>
        <Tabs defaultValue={props.defaultValue} className="w-[400px]">
        <TabsList>
            {
          props.options.map((option) => (
            <TabsTrigger key={option.value} value={option.value}>{option.label}</TabsTrigger>
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