import BatteryHeatmap from "@/components/shared/battery-temp-map/battery-heatmap";
import { HeaderBar } from "@/components/shared/header-bar";
import { Button } from "@/components/ui/button";
import { BatteryCommands, ThrottleCommands, Zones } from "@/data/zonecontrollers/zonecontrollers";
import { IncomingPacket, OutgoingPacket } from "@/data/zonecontrollers/packets";
import { useStore } from "@/stores/useStore";
import React, { useEffect } from "react";

const BatteryPage = () => {

    const { batteryTemps, avgBatteryTemp, minTemp, maxTemp, voltage } = useStore();
    const { setBatteryTemps, setBatteryVoltage } = useStore();

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

            <div className="flex flex-col items-center mt-4">
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

                <Button onClick={() => setBatteryTemps(randomBatteryTemps())}>Randomize Temps</Button>
                <Button 
                    onClick={function() {
                        const newPacket: OutgoingPacket = {
                            zone: Zones.THROTTLE,
                            command: ThrottleCommands.SET_LIMIT,
                            value: 1000
                        };
                        window.websocket.send(newPacket, Zones.THROTTLE);
                        }
                    } 
                >[throttle ZC] set limit 1000</Button>
            <Button 
                    onClick={function() {
                        const newPacket: OutgoingPacket = {
                            zone: Zones.THROTTLE,
                            command: ThrottleCommands.SET_LIMIT,
                            value: 20000
                        };
                        window.websocket.send(newPacket, Zones.THROTTLE);
                        }
                    } 
                >[throttle ZC] set limit 20000</Button>

            </div>

        </div>
    );
}

export default BatteryPage;