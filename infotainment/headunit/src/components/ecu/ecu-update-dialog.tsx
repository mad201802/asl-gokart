import React, { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, XCircle, Download, Zap, HardDrive } from "lucide-react";
import { toast } from "sonner";
import log from "@/lib/logger";
import { EcuDefinition, FirmwareRelease, OtaPhase } from "@/data/ecu/ecu-types";
import { cn } from "@/lib/utils";

interface EcuUpdateDialogProps {
    definition: EcuDefinition;
    trigger: React.ReactNode;
}

const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

export const EcuUpdateDialog = ({ definition, trigger }: EcuUpdateDialogProps) => {
    const [open, setOpen] = useState(false);

    const [releases, setReleases] = useState<FirmwareRelease[] | null>(null);
    const [releasesError, setReleasesError] = useState<string | null>(null);
    const [selectedRelease, setSelectedRelease] = useState<FirmwareRelease | null>(null);
    const [cachedVersions, setCachedVersions] = useState<string[]>([]);

    const [phase, setPhase] = useState<OtaPhase>(OtaPhase.Idle);
    const [otaError, setOtaError] = useState<string | null>(null);

    const isFlashing = phase === OtaPhase.Downloading || phase === OtaPhase.Flashing;

    useEffect(() => {
        if (!open) return;

        setReleases(null);
        setReleasesError(null);
        setSelectedRelease(null);
        setPhase(OtaPhase.Idle);
        setOtaError(null);

        const load = async () => {
            try {
                const [fetchedReleases, allCached] = await Promise.all([
                    window.firmware.getReleases(definition.githubAssetName),
                    window.firmware.getCachedVersions(),
                ]);
                setReleases(fetchedReleases);
                setCachedVersions(allCached[definition.id] ?? []);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to fetch releases";
                log.error("[EcuUpdateDialog] Failed to load:", err);
                setReleasesError(msg);
            }
        };

        load();
    }, [open, definition.githubAssetName, definition.id]);

    const handleFlash = async () => {
        if (!selectedRelease) return;

        const isCached = cachedVersions.includes(selectedRelease.tag);
        setOtaError(null);

        try {
            if (!isCached) {
                setPhase(OtaPhase.Downloading);
                await window.firmware.downloadFirmware(
                    definition.id,
                    selectedRelease.tag,
                    selectedRelease.downloadUrl
                );
                setCachedVersions((prev) => [...prev, selectedRelease.tag]);
            }

            setPhase(OtaPhase.Flashing);
            const result = await window.firmware.triggerOta(definition.id, selectedRelease.tag);

            if (result.success) {
                setPhase(OtaPhase.Success);
                toast.success(`OTA triggered for ${definition.displayName} (${selectedRelease.tag})`);
            } else {
                throw new Error("OTA trigger returned failure");
            }
        } catch (err) {
            const msg = err instanceof Error ? err.message : "OTA failed";
            log.error("[EcuUpdateDialog] OTA failed:", err);
            setOtaError(msg);
            setPhase(OtaPhase.Error);
            toast.error(`OTA failed: ${msg}`);
        }
    };

    const getButtonLabel = () => {
        if (phase === OtaPhase.Downloading) return "Downloading...";
        if (phase === OtaPhase.Flashing) return "Flashing...";
        if (phase === OtaPhase.Success) return "Done";
        if (phase === OtaPhase.Error) return "Retry";
        if (!selectedRelease) return "Select a version";
        if (cachedVersions.includes(selectedRelease.tag)) return "Flash";
        return "Download & Flash";
    };

    const getButtonIcon = () => {
        if (isFlashing) return <Loader2 className="mr-2 h-4 w-4 animate-spin" />;
        if (phase === OtaPhase.Success) return <CheckCircle2 className="mr-2 h-4 w-4" />;
        if (phase === OtaPhase.Error) return <XCircle className="mr-2 h-4 w-4" />;
        if (selectedRelease && cachedVersions.includes(selectedRelease.tag))
            return <Zap className="mr-2 h-4 w-4" />;
        return <Download className="mr-2 h-4 w-4" />;
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!isFlashing) setOpen(v);
            }}
        >
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>

            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Flash Firmware: {definition.displayName}</DialogTitle>
                    <DialogDescription>
                        Select a release from GitHub to flash over LAN. The headunit will host the
                        binary and send the URL to the ECU.
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                {/* Release list */}
                <div className="flex-1 min-h-0 flex flex-col gap-2">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                        Available Releases
                    </p>

                    {!releases && !releasesError && (
                        <div className="flex items-center justify-center py-8 text-muted-foreground">
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            <span className="text-sm">Fetching releases...</span>
                        </div>
                    )}

                    {releasesError && (
                        <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                            {releasesError}
                        </div>
                    )}

                    {releases && releases.length === 0 && (
                        <p className="py-4 text-center text-sm text-muted-foreground">
                            No releases found for {definition.githubAssetName}
                        </p>
                    )}

                    {releases && releases.length > 0 && (
                        <div className="overflow-y-auto max-h-56 rounded-md border divide-y">
                            {releases.map((release) => {
                                const isCached = cachedVersions.includes(release.tag);
                                const isSelected = selectedRelease?.tag === release.tag;
                                return (
                                    <button
                                        key={release.tag}
                                        className={cn(
                                            "w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors hover:bg-muted/50",
                                            isSelected && "bg-muted"
                                        )}
                                        onClick={() => {
                                            if (!isFlashing) {
                                                setSelectedRelease(release);
                                                setPhase(OtaPhase.Idle);
                                                setOtaError(null);
                                            }
                                        }}
                                        disabled={isFlashing}
                                    >
                                        <div className="flex flex-col gap-0.5 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-medium">
                                                    {release.tag}
                                                </span>
                                                {release.isPrerelease && (
                                                    <Badge variant="outline" className="text-yellow-600 border-yellow-500 text-xs px-1.5 py-0">
                                                        pre-release
                                                    </Badge>
                                                )}
                                            </div>
                                            <span className="text-xs text-muted-foreground">
                                                {formatDate(release.publishedAt)}
                                            </span>
                                        </div>
                                        {isCached && (
                                            <HardDrive className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-label="Cached locally" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Selected release detail */}
                {selectedRelease && (
                    <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                        <p className="font-medium text-foreground text-sm">
                            Selected: {selectedRelease.tag}
                        </p>
                        <p>Published: {formatDate(selectedRelease.publishedAt)}</p>
                        <p className="font-mono break-all">{selectedRelease.downloadUrl}</p>
                        {cachedVersions.includes(selectedRelease.tag) && (
                            <p className="text-green-600 dark:text-green-400">Cached locally, ready to flash immediately</p>
                        )}
                    </div>
                )}

                {/* Error message */}
                {phase === OtaPhase.Error && otaError && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {otaError}
                    </div>
                )}

                <Separator />

                <div className="flex justify-end">
                    <Button
                        disabled={
                            !selectedRelease ||
                            isFlashing ||
                            phase === OtaPhase.Success
                        }
                        onClick={handleFlash}
                        variant={phase === OtaPhase.Error ? "destructive" : "default"}
                    >
                        {getButtonIcon()}
                        {getButtonLabel()}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
};
