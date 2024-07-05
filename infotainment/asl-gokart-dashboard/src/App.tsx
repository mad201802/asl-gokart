import { Routes, Route } from "react-router-dom";
import { Battery, Gauge, LifeBuoy, Settings } from "lucide-react";
import { NavBarItemData } from "./data/models";
import NavBar from "./components/navbar/navbar";
import DriveNormalPage from "./pages/drive-normal";
import SettingsPage from "./pages/settings";
import { DriveModeProvider } from "./contexts/drive-mode-context";
import { AdvancedSettingsProvider } from "./contexts/advanced-settings-context";

function App() {

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
        <DriveModeProvider>
          <AdvancedSettingsProvider>
            <>
              <Routes>
                <Route path="/" element={<DriveNormalPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Routes>
            </>
          </AdvancedSettingsProvider>
        </DriveModeProvider>
      </div>
      {<div className="w-[80px] border-l-2">
        <NavBar items={navBarItems} />
      </div>}
    </div>
  );
}

export default App;
