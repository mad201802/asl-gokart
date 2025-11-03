import { BatteryChartArea } from "@/components/custom/charts/BatteryChart";
import { ChargingCyclesChart } from "@/components/custom/charts/ChargingCyclesChart";
import HeaderBar from "@/components/custom/header/HeaderBar";
import { MainNavigationMenu } from "@/components/custom/header/MainNavigationMenu";
import { Button } from "@/components/ui/button";
import { HydrateClient } from "@/trpc/server";

export default async function Dashboard() {
    return (
        <HydrateClient>
            <HeaderBar />
            <main className="mt-4">
                <div className="p-4">
                    <BatteryChartArea />
                    <div className="max-w-2xl mt-4">
                        <ChargingCyclesChart />
                    </div>
                </div>
            </main>
                                
        </HydrateClient>
    )
}