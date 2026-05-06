import React, { useEffect } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogHeader } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import log from "@/lib/logger";
import { NetworkInterface, NetworkInterfaceType, parseNetworkInterfaces } from "@/lib/types";
import { Loader2 } from "lucide-react";

type NetworkInterfaceDialogProps = {
    trigger: React.ReactNode,
    open: boolean,
    onOpenChange: (open: boolean) => void,
};

export const NetworkInterfaceDialog = ({ trigger, open, onOpenChange }: NetworkInterfaceDialogProps) => {

    const [availableInterfaces, setAvailableInterfaces] = React.useState<NetworkInterface[]>([]);

    // Background services interface
    const [currentMac, setCurrentMac] = React.useState<string | null>(null);
    const [selectedMac, setSelectedMac] = React.useState<string | null>(null);

    // Analytics interface
    const [currentAnalyticsMac, setCurrentAnalyticsMac] = React.useState<string | null>(null);
    const [selectedAnalyticsMac, setSelectedAnalyticsMac] = React.useState<string | null>(null);

    const [saving, setSaving] = React.useState(false);

    const ANALYTICS_NONE = "__none__";

    const wiredInterfaces = availableInterfaces.filter(iface => iface.type === NetworkInterfaceType.Wired);
    const wirelessInterfaces = availableInterfaces.filter(iface => iface.type === NetworkInterfaceType.Wireless);

    const currentInterface = availableInterfaces.find(iface => iface.mac === currentMac) ?? null;
    const currentAnalyticsInterface = availableInterfaces.find(iface => iface.mac === currentAnalyticsMac) ?? null;

    const backgroundChanged = selectedMac !== null && selectedMac !== currentMac;
    const analyticsChanged = selectedAnalyticsMac !== currentAnalyticsMac;
    const hasChanged = backgroundChanged || analyticsChanged;

    useEffect(() => {
        if (!open) return;
        const load = async () => {
            const [raw, current, currentAnalytics] = await Promise.all([
                window.hardware.getAvailableNetworkInterfaces(),
                window.hardware.getNetworkInterface(),
                window.app.getAnalyticsInterface(),
            ]);
            const parsed = parseNetworkInterfaces(raw);
            setAvailableInterfaces(parsed);

            const mac = current?.mac ?? null;
            setCurrentMac(mac);
            setSelectedMac(mac);

            const analyticsMac = currentAnalytics?.mac ?? null;
            setCurrentAnalyticsMac(analyticsMac);
            setSelectedAnalyticsMac(analyticsMac);
        };
        load();
    }, [open]);

    const handleSave = async () => {
        if (!backgroundChanged && !analyticsChanged) return;
        setSaving(true);
        try {
            const tasks: Promise<unknown>[] = [];

            if (backgroundChanged && selectedMac) {
                tasks.push(
                    window.hardware.setNetworkInterface(selectedMac).then((result) => {
                        log.info("Background network interface changed:", result);
                        setCurrentMac(result?.mac ?? null);
                        setSelectedMac(result?.mac ?? null);
                    })
                );
            }

            if (analyticsChanged) {
                tasks.push(
                    window.app.setAnalyticsInterface(selectedAnalyticsMac).then((result) => {
                        log.info("Analytics network interface changed:", result);
                        const mac = result?.mac ?? null;
                        setCurrentAnalyticsMac(mac);
                        setSelectedAnalyticsMac(mac);
                    })
                );
            }

            await Promise.all(tasks);
        } catch (err) {
            log.error("Failed to set network interface:", err);
        } finally {
            setSaving(false);
        }
    };

    const interfaceSelectItems = (
        <>
            {wiredInterfaces.length > 0 && (
                <SelectGroup>
                    <SelectLabel>Wired</SelectLabel>
                    {wiredInterfaces.map((iface) => (
                        <SelectItem key={iface.mac} value={iface.mac}>{iface.name} ({iface.family})</SelectItem>
                    ))}
                </SelectGroup>
            )}
            {wirelessInterfaces.length > 0 && (
                <SelectGroup>
                    <SelectLabel>Wireless</SelectLabel>
                    {wirelessInterfaces.map((iface) => (
                        <SelectItem key={iface.mac} value={iface.mac}>{iface.name} ({iface.family})</SelectItem>
                    ))}
                </SelectGroup>
            )}
        </>
    );

    return (
        <div>
            <Dialog 
                open={open} 
                onOpenChange={(v) => {
                    if (!saving) onOpenChange(v);
                }}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Network Interface Configuration</DialogTitle>
                        <DialogDescription>
                            Configure the network interfaces used by all backend services.
                        </DialogDescription>
                    </DialogHeader>

                    <Separator className="my-2" />

                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                        {/* Background services interface */}
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium">Background Services (WS &amp; SERO)</p>
                            <Select
                                value={selectedMac ?? undefined}
                                onValueChange={setSelectedMac}
                                disabled={saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Network Interface" />
                                </SelectTrigger>
                                <SelectContent>
                                    {interfaceSelectItems}
                                </SelectContent>
                            </Select>
                            {currentInterface ? (
                                <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                                    <p className="font-medium text-foreground text-sm">Active Interface</p>
                                    <p>{currentInterface.name} &mdash; {currentInterface.address}</p>
                                    <p className="font-mono">{currentInterface.mac}</p>
                                    <p>{currentInterface.type === NetworkInterfaceType.Wireless ? "Wireless" : "Wired"} &mdash; /{currentInterface.netmask}</p>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No interface selected. Services bind to all interfaces (0.0.0.0).
                                </p>
                            )}
                        </div>

                        {/* Analytics interface */}
                        <div className="flex flex-col gap-2">
                            <p className="text-sm font-medium">Analytics Backend</p>
                            <Select
                                value={selectedAnalyticsMac ?? ANALYTICS_NONE}
                                onValueChange={(v) => setSelectedAnalyticsMac(v === ANALYTICS_NONE ? null : v)}
                                disabled={saving}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Analytics Interface" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectGroup>
                                        <SelectItem value={ANALYTICS_NONE}>None (system default routing)</SelectItem>
                                    </SelectGroup>
                                    {interfaceSelectItems}
                                </SelectContent>
                            </Select>
                            {currentAnalyticsInterface ? (
                                <div className="rounded-md border px-3 py-2 text-xs text-muted-foreground space-y-0.5">
                                    <p className="font-medium text-foreground text-sm">Active Interface</p>
                                    <p>{currentAnalyticsInterface.name} &mdash; {currentAnalyticsInterface.address}</p>
                                    <p className="font-mono">{currentAnalyticsInterface.mac}</p>
                                    <p>{currentAnalyticsInterface.type === NetworkInterfaceType.Wireless ? "Wireless" : "Wired"} &mdash; /{currentAnalyticsInterface.netmask}</p>
                                </div>
                            ) : (
                                <p className="text-xs text-muted-foreground">
                                    No interface selected. Analytics traffic follows the OS default route.
                                </p>
                            )}
                        </div>
                    </div>

                    <Separator className="my-2" />

                    <Button
                        disabled={!hasChanged || saving}
                        onClick={handleSave}
                        className="self-end"
                    >
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {saving ? (backgroundChanged ? "Restarting..." : "Saving...") : "Save"}
                    </Button>
                </DialogContent>
            </Dialog>
        </div>
    )
}