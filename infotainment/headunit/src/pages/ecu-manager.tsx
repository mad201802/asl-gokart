import React from "react";
import { HeaderBar } from "@/components/shared/header-bar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ECU_DEFINITIONS } from "@/data/ecu/ecu-definitions";
import { EcuCard } from "@/components/ecu/ecu-card";

const EcuManagerPage = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full h-full flex flex-col">
            <HeaderBar />

            <div className="flex items-center gap-3 px-4 py-3 border-b">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => navigate("/settings")}
                    className="shrink-0"
                >
                    <ChevronLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0">
                    <h1 className="text-base font-semibold leading-tight">ECU Manager</h1>
                    <p className="text-xs text-muted-foreground">
                        Flash firmware to zone controllers over LAN (OTA)
                    </p>
                </div>
            </div>

            <Separator />

            <div className="flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {ECU_DEFINITIONS.map((def) => (
                        <EcuCard key={def.id} definition={def} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EcuManagerPage;
