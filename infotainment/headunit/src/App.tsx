import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme-helpers";
import { useTranslation } from "react-i18next";
import "./localization/i18n";
import { updateAppLanguage } from "./helpers/language-helpers";
import { Routes, Route, HashRouter } from "react-router-dom";
import { Battery, Car, Gauge, LifeBuoy, Settings } from "lucide-react";
import { NavBarItemData } from "./data/models";
import NavBar from "./components/navbar/navbar";
import DriveNormalPage from "./pages/drive-normal";
import SettingsPage from "./pages/settings";
import CarPage from "./pages/car";
import BatteryPage from "./pages/battery";
import EcuManagerPage from "./pages/ecu-manager";
import { Toaster } from "@/components/ui/sonner"
import MotorPage from "./pages/motor";
import { ErrorBoundary } from "@/components/shared/error-boundary";
import { useMotorData } from "./hooks/useMotorData";
import { useThrottleData } from "./hooks/useThrottleData";
import { useBatteryData } from "./hooks/useBatteryData";
import { useLightsData } from "./hooks/useLightsData";
import { useConnectionData } from "./hooks/useConnectionData";
import { initHardwareCommandSubscriber } from "./services/hardware-command-subscriber";

export default function App() {
    const { i18n } = useTranslation();

    useMotorData();
    useThrottleData();
    useBatteryData();
    useLightsData();
    useConnectionData();

    useEffect(() => {
        syncThemeWithLocal();
        updateAppLanguage(i18n);
        const unsubHardwareCommands = initHardwareCommandSubscriber();
        return unsubHardwareCommands;
    }, []);

    const navBarItems: NavBarItemData[] = [
        {
            Icon: Gauge,
            label: "Drive",
            linkTo: "/",
        },
        {
            Icon: LifeBuoy,
            label: "Motor",
            linkTo: "/motor",
        },
        {
            Icon: Car,
            label: "Car",
            linkTo: "/car",
        },
        {
            Icon: Battery,
            label: "Battery",
            linkTo: "/battery",
        },
        {
            Icon: Settings,
            label: "Settings",
            linkTo: "/settings",
        },
    ];

    return (
            <div className="flex flex-row w-full h-full">
                <div className="flex-1">
                    <>
                        <Routes>
                            <Route path="/" element={<ErrorBoundary><DriveNormalPage /></ErrorBoundary>} />
                            <Route path="/motor" element={<ErrorBoundary><MotorPage /></ErrorBoundary>} />
                            <Route path="/car" element={<ErrorBoundary><CarPage /></ErrorBoundary>} />
                            <Route path="/settings" element={<ErrorBoundary><SettingsPage /></ErrorBoundary>} />
                            <Route path="/battery" element={<ErrorBoundary><BatteryPage /></ErrorBoundary>} />
                            <Route path="/ecu-manager" element={<ErrorBoundary><EcuManagerPage /></ErrorBoundary>} />
                        </Routes>
                    </>
                </div>
                {<div className="w-20 border-l-2">
                    <NavBar items={navBarItems} />
                </div>}
                <Toaster />
            </div>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(
    <HashRouter>
        <App />
    </HashRouter>
);
