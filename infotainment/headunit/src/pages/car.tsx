import { HeaderBar } from "@/components/shared/header-bar";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React from "react";
import { ColorPicker } from "@/components/color-picker";
import { CirclePicker } from "react-color";
import { PRESET_COLORS } from "@/data/lighting/color-definitions";
import { Toggle } from "@/components/ui/toggle";
import { Switch } from "@/components/ui/switch";

const presetColors = PRESET_COLORS.map(color => color.hex);

const CarPage = () => {
    const { 
        underglowColor, 
        setUnderglowColor, 
        welcomeLightColor, 
        setWelcomeLightColor 
    } = useStore(useShallow((state) => ({
        underglowColor: state.underglowColor,
        setUnderglowColor: state.setUnderglowColor,
        welcomeLightColor: state.welcomeLightColor,
        setWelcomeLightColor: state.setWelcomeLightColor
    })));

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <HeaderBar />
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-5xl">
                    
                    {/* Underglow Control Card */}
                    <div className="flex flex-col gap-4 w-full md:w-1/2 max-w-sm p-6 rounded-3xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-medium text-foreground">Underglow</span>
                            <Switch />
                        </div>
                        <ColorPicker 
                            color={underglowColor} 
                            onChange={(color: any) => setUnderglowColor(color.hex)}
                        />
                        <CirclePicker 
                            color={underglowColor} 
                            onChange={(color: any) => setUnderglowColor(color.hex)} 
                            circleSize={28} 
                            circleSpacing={14} 
                            colors={presetColors}
                        />
                    </div>

                    {/* Welcome Light Control Card */}
                    <div className="flex flex-col gap-4 w-full md:w-1/2 max-w-sm p-6 rounded-3xl border border-border bg-card shadow-sm">
                        <div className="flex items-center justify-between">
                            <span className="text-lg font-medium text-foreground">Welcome Light</span>
                            <Switch />
                        </div>
                        <ColorPicker 
                            color={welcomeLightColor} 
                            onChange={(color: any) => setWelcomeLightColor(color.hex)}
                        />
                        <CirclePicker 
                            color={welcomeLightColor} 
                            onChange={(color: any) => setWelcomeLightColor(color.hex)} 
                            circleSize={28} 
                            circleSpacing={14} 
                            colors={presetColors}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CarPage;