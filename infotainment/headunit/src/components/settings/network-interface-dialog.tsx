import React, { useEffect } from "react";
import { useStore } from "@/stores/useStore";
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
    const [currentMac, setCurrentMac] = React.useState<string | null>(null);
    const [selectedMac, setSelectedMac] = React.useState<string | null>(null);
    const [saving, setSaving] = React.useState(false);

    const wiredInterfaces = availableInterfaces.filter(iface => iface.type === NetworkInterfaceType.Wired);
    const wirelessInterfaces = availableInterfaces.filter(iface => iface.type === NetworkInterfaceType.Wireless);

    const currentInterface = availableInterfaces.find(iface => iface.mac === currentMac) ?? null;
    const hasChanged = selectedMac !== null && selectedMac !== currentMac;

    useEffect(() => {
        if (!open) return;
        const load = async () => {
            const [raw, current] = await Promise.all([
                window.hardware.getAvailableNetworkInterfaces(),
                window.hardware.getNetworkInterface(),
            ]);
            const parsed = parseNetworkInterfaces(raw);
            setAvailableInterfaces(parsed);
            const mac = current?.mac ?? null;
            setCurrentMac(mac);
            setSelectedMac(mac);
        };
        load();
    }, [open]);

    const handleSave = async () => {
        if (!selectedMac) return;
        setSaving(true);
        try {
            const result = await window.hardware.setNetworkInterface(selectedMac);
            log.info("Network interface changed:", result);
            setCurrentMac(result?.mac ?? null);
            setSelectedMac(result?.mac ?? null);
        } catch (err) {
            log.error("Failed to set network interface:", err);
        } finally {
            setSaving(false);
        }
    };

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
                <DialogContent
                    className="min-h-2/5"
                >
                    <DialogHeader>
                        <DialogTitle>Network Interface Configuration</DialogTitle>
                        <DialogDescription>
                            Configure the network interfaces used by all backend services.
                        </DialogDescription>
                    </DialogHeader>
                    <Separator className="my-4" />
                    <div className="flex flex-row gap-3">
                        <Select
                            value={selectedMac ?? undefined}
                            onValueChange={setSelectedMac}
                            disabled={saving}
                        >
                            <SelectTrigger className="w-75">
                                <SelectValue placeholder="Network Interface" />
                            </SelectTrigger>
                            <SelectContent>
                                {
                                    wiredInterfaces.length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel>Wired</SelectLabel>
                                            {
                                                wiredInterfaces.map((iface) => (
                                                    <SelectItem key={iface.mac} value={iface.mac}>{iface.name} ({iface.family})</SelectItem>
                                                ))
                                            }
                                        </SelectGroup>
                                    )
                                }
                                {
                                    wirelessInterfaces.length > 0 && (
                                        <SelectGroup>
                                            <SelectLabel>Wireless</SelectLabel>
                                            {
                                                wirelessInterfaces.map((iface) => (
                                                    <SelectItem key={iface.mac} value={iface.mac}>{iface.name} ({iface.family})</SelectItem>
                                                ))
                                            }
                                        </SelectGroup>
                                    )
                                }
                            </SelectContent>
                        </Select>
                        <Button
                            disabled={!hasChanged || saving}
                            onClick={handleSave}
                        >
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {saving ? "Restarting..." : "Save"}
                        </Button>
                    </div>
                    {currentInterface && (
                        <div className="mt-4 rounded-md border p-3 text-sm text-muted-foreground space-y-1">
                            <p className="font-medium text-foreground">Active Interface</p>
                            <p>Name: {currentInterface.name}</p>
                            <p>Address: {currentInterface.address}</p>
                            <p>MAC: {currentInterface.mac}</p>
                            <p>Netmask: {currentInterface.netmask}</p>
                            <p>Type: {currentInterface.type === NetworkInterfaceType.Wireless ? "Wireless" : "Wired"}</p>
                        </div>
                    )}
                    {!currentInterface && !saving && (
                        <p className="mt-4 text-sm text-muted-foreground">
                            No interface selected. Services are bound to all interfaces (0.0.0.0).
                        </p>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}