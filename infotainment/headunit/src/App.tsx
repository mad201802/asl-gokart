import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";
import { syncThemeWithLocal } from "./helpers/theme_helpers";
import { useTranslation } from "react-i18next";
import "./localization/i18n";
import { updateAppLanguage } from "./helpers/language_helpers";
import { Routes, Route, BrowserRouter } from "react-router-dom";
import { Battery, Car, Gauge, LifeBuoy, Settings } from "lucide-react";
import { NavBarItemData } from "./data/models";
import NavBar from "./components/navbar/navbar";
import DriveNormalPage from "./pages/drive-normal";
import SettingsPage from "./pages/settings";
import CarPage from "./pages/car";
import BatteryPage from "./pages/battery";
import { Toaster } from "@/components/ui/sonner"

export default function App() {
    const { i18n } = useTranslation();

    useEffect(() => {
        syncThemeWithLocal();
        updateAppLanguage(i18n);
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
                            <Route path="/" element={<DriveNormalPage />} />
                            <Route path="/car" element={<CarPage />} />
                            <Route path="/settings" element={<SettingsPage />} />
                            <Route path="/battery" element={<BatteryPage />} />
                        </Routes>
                    </>
                </div>
                {<div className="w-[80px] border-l-2">
                    <NavBar items={navBarItems} />
                </div>}
                <Toaster />
            </div>
    );
}

const root = createRoot(document.getElementById("root")!);
root.render(
    <BrowserRouter>
        <App />
    </BrowserRouter>
);
