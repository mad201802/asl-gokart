import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Cpu } from "lucide-react";
import { EcuDefinition } from "@/data/ecu/ecu-types";
import { EcuUpdateDialog } from "./ecu-update-dialog";

interface EcuCardProps {
    definition: EcuDefinition;
}

export const EcuCard = ({ definition }: EcuCardProps) => {
    const cardTrigger = (
        <Card className="flex flex-col cursor-pointer transition-colors hover:bg-muted/40">
            <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                        <Cpu className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <CardTitle className="text-sm truncate">{definition.displayName}</CardTitle>
                    </div>
                    <Badge
                        variant="outline"
                        className={
                            definition.mockOnline
                                ? "shrink-0 text-green-600 border-green-600"
                                : "shrink-0 text-muted-foreground"
                        }
                    >
                        {definition.mockOnline ? "Online" : "Offline"}
                    </Badge>
                </div>
            </CardHeader>

            <CardContent className="px-4 pb-4 pt-1">
                <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Version</span>
                    <Badge variant="secondary" className="font-mono text-xs">
                        {definition.mockCurrentVersion}
                    </Badge>
                </div>
            </CardContent>
        </Card>
    );

    return <EcuUpdateDialog definition={definition} trigger={cardTrigger} />;
};
