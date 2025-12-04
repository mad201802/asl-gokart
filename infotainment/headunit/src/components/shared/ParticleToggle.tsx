import React from "react";
import { Switch } from "@/components/ui/switch";
import { useStore } from "@/stores/useStore";
import { FlowState } from "@/stores/motorSlice";
import { Sparkles, Zap, Battery, Circle } from "lucide-react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ParticleToggleProps {
    className?: string;
}

const ParticleToggle: React.FC<ParticleToggleProps> = ({ className }) => {
    const showParticleEffects = useStore((state) => state.showParticleEffects);
    const setShowParticleEffects = useStore((state) => state.setShowParticleEffects);
    const debugFlowStateOverride = useStore((state) => state.debugFlowStateOverride);
    const setDebugFlowStateOverride = useStore((state) => state.setDebugFlowStateOverride);

    const handleFlowStateChange = (value: string) => {
        if (value === "" || value === "auto") {
            setDebugFlowStateOverride(null);
        } else {
            setDebugFlowStateOverride(value as FlowState);
        }
    };

    return (
        <div className={`flex items-center gap-3 ${className ?? ""}`}>
            {/* Flow State Debug Selector */}
            <ToggleGroup
                type="single"
                value={debugFlowStateOverride ?? "auto"}
                onValueChange={handleFlowStateChange}
                className="h-8"
            >
                <ToggleGroupItem value="auto" aria-label="Auto" className="h-8 px-2 text-xs">
                    Auto
                </ToggleGroupItem>
                <ToggleGroupItem value={FlowState.POWER} aria-label="Power" className="h-8 px-2">
                    <Zap size={14} className="text-orange-500" />
                </ToggleGroupItem>
                <ToggleGroupItem value={FlowState.REGEN} aria-label="Regen" className="h-8 px-2">
                    <Battery size={14} className="text-cyan-500" />
                </ToggleGroupItem>
                <ToggleGroupItem value={FlowState.IDLE} aria-label="Idle" className="h-8 px-2">
                    <Circle size={14} className="text-gray-500" />
                </ToggleGroupItem>
            </ToggleGroup>

            {/* Particle Effects Toggle */}
            <div className="flex items-center gap-2">
                <Sparkles 
                    size={16} 
                    className={showParticleEffects ? "text-primary" : "text-muted-foreground"} 
                />
                <Switch
                    checked={showParticleEffects}
                    onCheckedChange={setShowParticleEffects}
                    aria-label="Toggle particle effects"
                />
            </div>
        </div>
    );
};

export default ParticleToggle;
