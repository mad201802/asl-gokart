import { Battery, Gauge, LifeBuoy, Settings } from "lucide-react";
import { NavBarItemData } from "./data/models";
import NavBar from "./components/navbar/navbar";
import DriveNormalPage from "./pages/drive-normal";
import SettingsPage from "./pages/settings";
import { DriveModeContext, DriveModeProvider } from "./contexts/drive-mode-context";
import { AdvancedSettingsProvider } from "./contexts/advanced-settings-context";

function App() {

  const navBarItems: NavBarItemData[] = [
    {
      Icon: Gauge,
      label: "Drive",
    },
    {
      Icon: LifeBuoy,
      label: "Motor",
    },
    {
      Icon: Battery,
      label: "Battery",
    },
    {
      Icon: Settings,
      label: "Settings",
    },
  ];

  return (
    <div className="flex flex-row w-full h-full">
      <div className="flex-1">
        <DriveModeProvider>
          <AdvancedSettingsProvider>
            {/* <DriveNormalPage /> */}
            <SettingsPage />
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
