import React, { useEffect, useRef, useState } from "react";
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
import { Progress } from "@/components/ui/progress";
import {
    AlertTriangle,
    CheckCircle2,
    ChevronLeft,
    Download,
    Loader2,
    RefreshCw,
    RotateCcw,
    XCircle,
} from "lucide-react";
import { toast } from "sonner";
import log from "@/lib/logger";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/checkbox";
import { type AppRelease, UpdatePhase } from "@/data/updater/updater-types";

interface DownloadProgress {
    percent: number;
    bytesDownloaded: number;
    totalBytes: number;
}

const formatBytes = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatDate = (iso: string): string =>
    new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });

const semverCompare = (a: string, b: string): number => {
    const parse = (v: string) => v.replace(/^v/, "").split(".").map(Number);
    const [aMaj, aMin, aPat] = parse(a);
    const [bMaj, bMin, bPat] = parse(b);
    return aMaj !== bMaj ? aMaj - bMaj : aMin !== bMin ? aMin - bMin : aPat - bPat;
};

interface AppUpdateDialogProps {
    trigger: React.ReactNode;
}

export const AppUpdateDialog = ({ trigger }: AppUpdateDialogProps) => {
    const [open, setOpen] = useState(false);

    const [currentVersion, setCurrentVersion] = useState<string | null>(null);
    const [releases, setReleases] = useState<AppRelease[] | null>(null);
    const [releasesError, setReleasesError] = useState<string | null>(null);
    const [selectedRelease, setSelectedRelease] = useState<AppRelease | null>(null);

    const [phase, setPhase] = useState<UpdatePhase>(UpdatePhase.Idle);
    const [installError, setInstallError] = useState<string | null>(null);
    const [progress, setProgress] = useState<DownloadProgress | null>(null);
    const [sudoConfirmed, setSudoConfirmed] = useState(false);

    const progressCleanupRef = useRef<(() => void) | null>(null);

    const isBusy = phase === UpdatePhase.Downloading || phase === UpdatePhase.Installing;

    // Load releases + current version when dialog opens
    useEffect(() => {
        if (!open) return;

        setReleases(null);
        setReleasesError(null);
        setSelectedRelease(null);
        setPhase(UpdatePhase.Idle);
        setInstallError(null);
        setProgress(null);
        setSudoConfirmed(false);

        const load = async () => {
            try {
                const [version, fetchedReleases] = await Promise.all([
                    window.app.getVersion(),
                    window.updater.getReleases(),
                ]);
                setCurrentVersion(version);
                setReleases(fetchedReleases);
            } catch (err) {
                const msg = err instanceof Error ? err.message : "Failed to fetch releases";
                log.error("[AppUpdateDialog] Failed to load:", err);
                setReleasesError(msg);
            }
        };

        load();

        return () => {
            progressCleanupRef.current?.();
            progressCleanupRef.current = null;
        };
    }, [open]);

    const handleConfirm = () => {
        if (!selectedRelease) return;
        setPhase(UpdatePhase.Confirming);
    };

    const handleInstall = async () => {
        if (!selectedRelease) return;

        setInstallError(null);
        setProgress(null);
        setPhase(UpdatePhase.Downloading);

        // Register progress listener
        progressCleanupRef.current?.();
        progressCleanupRef.current = window.updater.onProgress((p) => {
            setProgress(p);
        });

        try {
            await window.updater.install(
                selectedRelease.tag,
                selectedRelease.downloadUrl,
                selectedRelease.assetName,
            );

            progressCleanupRef.current?.();
            progressCleanupRef.current = null;

            setPhase(UpdatePhase.Installing);

            // Slight delay so "Installing…" is visible before dpkg completes
            await new Promise((r) => setTimeout(r, 600));

            setPhase(UpdatePhase.Success);
            toast.success(`Headunit updated to ${selectedRelease.tag}`);
        } catch (err) {
            progressCleanupRef.current?.();
            progressCleanupRef.current = null;

            const msg = err instanceof Error ? err.message : "Update failed";
            log.error("[AppUpdateDialog] Install failed:", err);
            setInstallError(msg);
            setPhase(UpdatePhase.Error);
            toast.error(`Update failed: ${msg}`);
        }
    };

    const handleRelaunch = () => {
        window.updater.relaunch();
    };

    const handleRetry = () => {
        setPhase(UpdatePhase.Idle);
        setInstallError(null);
        setProgress(null);
        setSudoConfirmed(false);
    };

    const getVersionBadge = (tag: string) => {
        if (!currentVersion) return null;
        const tagVersion = tag.startsWith("v") ? tag.slice(1) : tag;
        const diff = semverCompare(tagVersion, currentVersion);
        if (diff === 0) return <Badge variant="secondary" className="text-xs px-1.5 py-0">current</Badge>;
        if (diff > 0) return <Badge variant="outline" className="text-xs px-1.5 py-0 text-green-600 border-green-500">upgrade</Badge>;
        return <Badge variant="outline" className="text-xs px-1.5 py-0 text-orange-500 border-orange-400">downgrade</Badge>;
    };

    const renderBody = () => {
        // ── Confirming ─────────────────────────────────────────────────────────
        if (phase === UpdatePhase.Confirming && selectedRelease) {
            return (
                <div className="flex flex-col gap-4">
                    <div className="flex items-start gap-3 rounded-md border border-yellow-500/40 bg-yellow-500/10 px-4 py-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
                        <div className="text-sm">
                            <p className="font-semibold text-foreground">Confirm installation</p>
                            <p className="mt-1 text-muted-foreground">
                                You are about to install{" "}
                                <span className="font-mono font-medium text-foreground">
                                    {selectedRelease.tag}
                                </span>
                                . The app will restart automatically after installation. Do not
                                power off the kart during this process.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground space-y-1">
                        <div className="flex justify-between">
                            <span>Version</span>
                            <span className="font-mono font-medium text-foreground">{selectedRelease.tag}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Asset</span>
                            <span className="font-mono">{selectedRelease.assetName}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Size</span>
                            <span>{formatBytes(selectedRelease.assetSize)}</span>
                        </div>
                        <div className="flex justify-between">
                            <span>Published</span>
                            <span>{formatDate(selectedRelease.publishedAt)}</span>
                        </div>
                    </div>

                    <label className="flex items-start gap-3 rounded-md border border-muted px-4 py-3 cursor-pointer select-none hover:bg-muted/40 transition-colors">
                        <Checkbox
                            id="sudo-confirm"
                            checked={sudoConfirmed}
                            onCheckedChange={(v) => setSudoConfirmed(v === true)}
                            className="mt-0.5 shrink-0"
                        />
                        <span className="text-sm text-muted-foreground leading-snug">
                            I confirm that{" "}
                            <span className="font-mono font-medium text-foreground">sudo</span>{" "}
                            can be run without a password on this system, <em>or</em> the app was
                            launched from a terminal (e.g.{" "}
                            <span className="font-mono font-medium text-foreground">headunit</span>)
                            so a password prompt can appear. Without this, the{" "}
                            <span className="font-mono">dpkg</span> install step will silently fail.
                        </span>
                    </label>
                </div>
            );
        }

        // ── Downloading ────────────────────────────────────────────────────────
        if (phase === UpdatePhase.Downloading && selectedRelease) {
            const pct = progress?.percent ?? -1;
            const isIndeterminate = pct < 0;
            return (
                <div className="flex flex-col gap-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                        <span>
                            Downloading{" "}
                            <span className="font-mono font-medium text-foreground">
                                {selectedRelease.tag}
                            </span>
                            …
                        </span>
                    </div>
                    <Progress
                        value={isIndeterminate ? undefined : pct}
                        className={cn("h-2", isIndeterminate && "animate-pulse")}
                    />
                    {progress && !isIndeterminate && (
                        <p className="text-xs text-muted-foreground text-right tabular-nums">
                            {pct}% &mdash; {formatBytes(progress.bytesDownloaded)} /{" "}
                            {formatBytes(progress.totalBytes)}
                        </p>
                    )}
                </div>
            );
        }

        // ── Installing ─────────────────────────────────────────────────────────
        if (phase === UpdatePhase.Installing) {
            return (
                <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    <span>Installing package with dpkg…</span>
                </div>
            );
        }

        // ── Success ────────────────────────────────────────────────────────────
        if (phase === UpdatePhase.Success && selectedRelease) {
            return (
                <div className="flex items-start gap-3 rounded-md border border-green-500/40 bg-green-500/10 px-4 py-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-green-500" />
                    <div className="text-sm">
                        <p className="font-semibold text-foreground">Installation complete</p>
                        <p className="mt-1 text-muted-foreground">
                            Version{" "}
                            <span className="font-mono font-medium text-foreground">
                                {selectedRelease.tag}
                            </span>{" "}
                            was installed successfully. Restart the app to run the new version.
                        </p>
                    </div>
                </div>
            );
        }

        // ── Error ──────────────────────────────────────────────────────────────
        if (phase === UpdatePhase.Error) {
            return (
                <div className="flex items-start gap-3 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3">
                    <XCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" />
                    <div className="text-sm">
                        <p className="font-semibold text-foreground">Installation failed</p>
                        {installError && (
                            <p className="mt-1 font-mono text-xs text-destructive break-all">
                                {installError}
                            </p>
                        )}
                    </div>
                </div>
            );
        }

        // ── Idle — release list ────────────────────────────────────────────────
        return (
            <div className="flex flex-col gap-2 flex-1 min-h-0">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Available Releases
                </p>

                {!releases && !releasesError && (
                    <div className="flex items-center justify-center py-8 text-muted-foreground">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        <span className="text-sm">Fetching releases…</span>
                    </div>
                )}

                {releasesError && (
                    <div className="rounded-md border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                        {releasesError}
                    </div>
                )}

                {releases && releases.length === 0 && (
                    <p className="py-4 text-center text-sm text-muted-foreground">
                        No releases found for this architecture.
                    </p>
                )}

                {releases && releases.length > 0 && (
                    <div className="overflow-y-auto max-h-64 rounded-md border divide-y">
                        {releases.map((release) => {
                            const isSelected = selectedRelease?.tag === release.tag;
                            return (
                                <button
                                    key={release.tag}
                                    className={cn(
                                        "w-full text-left px-3 py-2.5 flex items-center justify-between gap-2 transition-colors hover:bg-muted/50",
                                        isSelected && "bg-muted"
                                    )}
                                    onClick={() => setSelectedRelease(release)}
                                >
                                    <div className="flex flex-col gap-0.5 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-sm font-medium">
                                                {release.tag}
                                            </span>
                                            {getVersionBadge(release.tag)}
                                            {release.isPrerelease && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-yellow-600 border-yellow-500 text-xs px-1.5 py-0"
                                                >
                                                    pre-release
                                                </Badge>
                                            )}
                                        </div>
                                        <span className="text-xs text-muted-foreground">
                                            {formatDate(release.publishedAt)} &bull;{" "}
                                            {formatBytes(release.assetSize)}
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </div>
        );
    };

    const renderFooter = () => {
        if (phase === UpdatePhase.Confirming) {
            return (
                <div className="flex justify-between">
                    <Button variant="ghost" onClick={() => { setPhase(UpdatePhase.Idle); setSudoConfirmed(false); }}>
                        <ChevronLeft className="mr-1 h-4 w-4" />
                        Back
                    </Button>
                    <Button onClick={handleInstall} variant="default" disabled={!sudoConfirmed}>
                        <Download className="mr-2 h-4 w-4" />
                        Confirm &amp; Install
                    </Button>
                </div>
            );
        }

        if (phase === UpdatePhase.Downloading || phase === UpdatePhase.Installing) {
            return (
                <div className="flex justify-end">
                    <Button disabled variant="default">
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {phase === UpdatePhase.Downloading ? "Downloading…" : "Installing…"}
                    </Button>
                </div>
            );
        }

        if (phase === UpdatePhase.Success) {
            return (
                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setOpen(false)}>
                        Close
                    </Button>
                    <Button onClick={handleRelaunch}>
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Restart Now
                    </Button>
                </div>
            );
        }

        if (phase === UpdatePhase.Error) {
            return (
                <div className="flex justify-end">
                    <Button variant="destructive" onClick={handleRetry}>
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Retry
                    </Button>
                </div>
            );
        }

        // Idle
        return (
            <div className="flex justify-end">
                <Button
                    disabled={!selectedRelease || !releases}
                    onClick={handleConfirm}
                >
                    <Download className="mr-2 h-4 w-4" />
                    {selectedRelease ? `Install ${selectedRelease.tag}` : "Select a version"}
                </Button>
            </div>
        );
    };

    return (
        <Dialog
            open={open}
            onOpenChange={(v) => {
                if (!isBusy) setOpen(v);
            }}
        >
            <DialogTrigger asChild>{trigger}</DialogTrigger>

            <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>App Update</DialogTitle>
                    <DialogDescription>
                        {currentVersion ? (
                            <>
                                Current version:{" "}
                                <span className="font-mono font-medium text-foreground">
                                    v{currentVersion}
                                </span>
                                . Select a release to install.
                            </>
                        ) : (
                            "Select a release from GitHub to install on this device."
                        )}
                    </DialogDescription>
                </DialogHeader>

                <Separator />

                <div className="flex-1 min-h-0 flex flex-col gap-3">{renderBody()}</div>

                <Separator />

                {renderFooter()}
            </DialogContent>
        </Dialog>
    );
};
