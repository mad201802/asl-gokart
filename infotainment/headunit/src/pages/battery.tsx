import BatteryHeatmap from "@/components/shared/battery-temp-map/battery-heatmap";
import { HeaderBar } from "@/components/shared/header-bar";
import { Button } from "@/components/ui/button";
import { BatteryCommands, ThrottleCommands, Zones } from "@/data/zonecontrollers/zonecontrollers";
import { IncomingPacket, OutgoingPacket } from "@/data/zonecontrollers/packets";
import { useStore } from "@/stores/useStore";
import React, { useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ValueCard from "@/components/shared/value-card";
import { Label } from "@/components/ui/label";


const BatteryPage = () => {

    const { batteryTemps, avgBatteryTemp, minTemp, maxTemp, voltage, batteryCurrent } = useStore();
    const { setBatteryTemps, setBatteryVoltage, setBatteryCurrent } = useStore();

    useEffect(() => {
        window.websocket.onBatteryMessage((incomingPacket: string) => {
          console.log("Received incoming battery message in battery.tsx");
          const parsed: IncomingPacket = JSON.parse(incomingPacket);
          switch(parsed.command) {
            case BatteryCommands.GET_TEMP:
                setBatteryTemps(parsed.value);
                break;
            case BatteryCommands.GET_VOLTAGE:
                setBatteryVoltage(parsed.value);
                break;
            case BatteryCommands.GET_CURRENT:
                setBatteryCurrent(parsed.value);
                break;
            default:
                console.error("Invalid command (data type) received in battery message!");
          }
        });
    // Cleanup listener on component unmount
    return () => {
        window.websocket.onBatteryMessage(() => {});
      };
  }, []);

    // Generate 6 random battery temperatures from 10 to 40
    const randomBatteryTemps = () => {
        const temps = [];
        for (let i = 0; i < 6; i++) {
            temps.push(Math.random() * 30 + 10);
        }
        return temps;
    }


    return (
        <div>
            <HeaderBar />

            <Tabs defaultValue="general">
                <div className="flex flex-col items-center mt-4">

                    <TabsList>
                        <TabsTrigger value="general">General</TabsTrigger>
                        <TabsTrigger value="temperature">Temperature</TabsTrigger>
                        <TabsTrigger value="flow">Flow</TabsTrigger>
                    </TabsList>
                    <TabsContent value="general" className="w-full">
                        <div className="flex flex-col mt-2">
                            <div className="flex flex-row justify-evenly">
                                <ValueCard label="Voltage" value={voltage.toFixed(1)} unit="V"/>
                                <ValueCard label="Current" value={batteryCurrent.toFixed(0)} unit="A"/>
                                <ValueCard label="Power" value={(batteryCurrent * voltage).toFixed(0)} unit="W"/>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="temperature">
                        <BatteryHeatmap 
                            tempValues={batteryTemps} 
                            width={300} 
                            height={300} 
                            minTemp={12.5} 
                            maxTemp={40}
                        />
                        <div className="flex flex-col mt-2 w-72">
                            <div className="flex flex-row justify-between">
                                <div className="text-sm">Avg. Temperature</div>
                                <div className="text-sm">{avgBatteryTemp.toFixed(1)} °C</div>
                            </div>
                            <div className="flex flex-row justify-between">
                                <div className="text-sm">Min/Max Temperature</div>
                                <div className="text-sm">{minTemp.toFixed(1)} / {maxTemp.toFixed(1)} °C</div>
                            </div>
                            <div className="flex flex-row justify-between">
                                <div className="text-sm">Voltage</div>
                                <div className="text-sm">{voltage.toFixed(1)} V</div>
                            </div>
                        </div>
                        <div className="flex flex-row justify-center mt-4">
                            <Button onClick={() => setBatteryTemps(randomBatteryTemps())}>Randomize Temps</Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="flow">
                        <div className="flex flex-col items-center gap-2 mt-2 w-72">
                            <div className="text-3xl mb-10">
                                <>
                                {/* 
                                    If battery current is greater than 3, display "discharging".
                                    If battery current is less than -3, display "charging".
                                    Otherwise, display "idle".
                                */}
                                {batteryCurrent > 3 ? "Discharging" : batteryCurrent < -3 ? "Charging" : "Idle"}
                                </>
                            </div>
                        </div>
                    </TabsContent>
                </div>
            </Tabs>

        </div>
    );
}

export default BatteryPage;