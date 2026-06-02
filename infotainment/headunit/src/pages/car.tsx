import { HeaderBar } from "@/components/shared/header-bar";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import React from "react";
import { ColorPicker } from "@/components/color-picker";
import { CirclePicker } from "react-color";
import { PRESET_COLORS } from "@/data/lighting/color-definitions";
import { Switch } from "@/components/ui/switch";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";

const presetColors = PRESET_COLORS.map(color => color.hex);

const CarPage = () => {
    const { 
        underglowColor, 
        setUnderglowColor, 
        welcomeLightColor, 
        setWelcomeLightColor,
        underglowBrigthness,
        setUnderglowBrightness,
        welcomeLightBrightness,
        setWelcomeLightBrightness,
        underglowOn,
        setUnderglowOn,
        welcomeLightOn,
        setWelcomeLightOn
    } = useStore(useShallow((state) => ({
        underglowColor: state.underglowColor,
        setUnderglowColor: state.setUnderglowColor,
        welcomeLightColor: state.welcomeLightColor,
        setWelcomeLightColor: state.setWelcomeLightColor,
        underglowBrigthness: state.underglowBrigthness,
        welcomeLightBrightness: state.welcomeLightBrightness,
        setUnderglowBrightness: state.setUnderglowBrightness,
        setWelcomeLightBrightness: state.setWelcomeLightBrightness,
        underglowOn: state.underglowOn,
        setUnderglowOn: state.setUnderglowOn,
        welcomeLightOn: state.welcomeLightOn,
        setWelcomeLightOn: state.setWelcomeLightOn,
    })));

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-background">
            <HeaderBar />
            <div className="flex-1 flex flex-col items-center justify-center p-8 overflow-y-auto">
                <div className="flex flex-col md:flex-row items-center justify-center gap-12 w-full max-w-5xl">
                    
                    {/* Underglow Control Card */}
                    <Card className="w-1/2">
                        <CardHeader>
                            <CardTitle>
                                <div className="flex items-center justify-between">
                                    Underglow
                                    {/*
                                        TODO: Replace with Sero call to zc_lights to toggle welcome light 
                                        TODO: Value is only updated when the Sero call returns with E_OK.
                                    */}
                                    <Switch 
                                        className="ml-4" 
                                        checked={underglowOn}
                                        onCheckedChange={setUnderglowOn}
                                    />
                                </div>
                            </CardTitle>
                            <CardDescription>Illuminate the tarmac!</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                    {/*
                                        TODO: Replace with Sero call to zc_lights to toggle welcome light 
                                        TODO: Value is only updated when the Sero call returns with E_OK.
                                    */}
                                <Slider 
                                    defaultValue={[underglowBrigthness]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={(value) => setUnderglowBrightness(value[0])}
                                />
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
                        </CardContent>
                    </Card>

                    {/* Welcome Light Control Card */}
                    <Card className="w-1/2">
                        <CardHeader>
                            <CardTitle>
                                <div className="flex items-center justify-between">
                                    Welcome Light
                                    {/*
                                        TODO: Replace with Sero call to zc_lights to toggle welcome light 
                                        TODO: Value is only updated when the Sero call returns with E_OK.
                                    */}
                                    <Switch 
                                        className="ml-4" 
                                        checked={welcomeLightOn}
                                        onCheckedChange={setWelcomeLightOn}
                                    />
                                </div>
                            </CardTitle>
                            <CardDescription>Front eyebrows glow color on startup</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex flex-col gap-4">
                                {/*
                                    TODO: Replace with Sero call to zc_lights to toggle welcome light 
                                    TODO: Value is only updated when the Sero call returns with E_OK.
                                */}
                                <Slider 
                                    defaultValue={[welcomeLightBrightness]}
                                    min={0}
                                    max={100}
                                    step={1}
                                    onValueChange={(value) => setWelcomeLightBrightness(value[0])}
                                />
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
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

export default CarPage;