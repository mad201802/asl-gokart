import { HeaderBar } from "@/components/shared/header-bar";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React from "react";
import { ColorPicker } from "@/components/color-picker";

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
                    <div className="flex flex-col items-center gap-4 w-full md:w-1/2 max-w-sm">
                        <ColorPicker 
                            color={underglowColor} 
                            onChange={(color: any) => setUnderglowColor(color.hex)}
                            label="Underglow Color"
                        />
                    </div>
                    <div className="flex flex-col items-center gap-4 w-full md:w-1/2 max-w-sm">
                        <ColorPicker 
                            color={welcomeLightColor} 
                            onChange={(color: any) => setWelcomeLightColor(color.hex)}
                            label="Welcome Light Color"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

export default CarPage;