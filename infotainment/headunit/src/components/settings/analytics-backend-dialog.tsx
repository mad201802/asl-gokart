import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription } from "../ui/dialog";
import { Separator } from "../ui/separator";
import { Check, X, Loader2 } from "lucide-react";
import { Button } from "../ui/button";
import { DialogHeader } from "../ui/dialog";
import { Input } from "../ui/input";
import React, { useEffect } from "react";
import { useStore } from "@/stores/useStore";
import log from "@/lib/logger";
import { toast } from "sonner";

type AnalyticsBackendDialogProps = {
    trigger: React.ReactNode,
    open: boolean,
    onOpenChange: (open: boolean) => void,
};

enum ConnectionStatus {
    Idle = "idle",
    Checking = "checking",
    Success = "success",
    Error = "error",
};

export const AnalyticsBackendDialog = ({ trigger, open, onOpenChange }: AnalyticsBackendDialogProps) => {

    const { analyticsBackendUrl, setAnalyticsBackendUrl } = useStore();

    const [urlInput, setUrlInput] = React.useState(analyticsBackendUrl);
    const [connectionStatus, setConnectionStatus] = React.useState<ConnectionStatus>(ConnectionStatus.Idle);
    
    useEffect(() => {
        const fetchAnalyticsUrl = async () => {
        try {
            const url = await window.app.getAnalyticsUrl();
            setAnalyticsBackendUrl(url);
            setUrlInput(url);
        } catch (e) {
            log.error(e);
        }
        };
        fetchAnalyticsUrl();
    }, []);

    let handleCheckConnection = async () => {
        setConnectionStatus(ConnectionStatus.Checking);
        try {
            // backend URL stripped of any API path, for connection testing (universal stripping, not just /api/gokart)
            const urlToTest = urlInput.replace(/\/api\/.*$/, "");
            const ok = await window.app.checkAnalyticsConnection(urlToTest);
            setConnectionStatus(ok ? ConnectionStatus.Success : ConnectionStatus.Error);
        } catch {
            setConnectionStatus(ConnectionStatus.Error);
        }
    };

    let handleSaveAnalyticsUrl = async () => {
        const savedUrl = await window.app.setAnalyticsUrl(urlInput);
        setAnalyticsBackendUrl(savedUrl);
        toast("Analytics Backend URL updated!");
    };
    
    return (
        <div>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogTrigger asChild>
                    {trigger}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Analytics Backend URL</DialogTitle>
                  </DialogHeader>
                  <DialogDescription>
                    Set the URL of the analytics backend. Connection must be verified before saving.
                    <Separator className="mt-3" />
                  </DialogDescription>
                  <div className="flex flex-col gap-y-4">
                    <div className="flex flex-row items-center gap-x-2">
                      <Input
                        placeholder="http://localhost:3000/api/gokart"
                        value={urlInput}
                        onChange={(e) => {
                          setUrlInput(e.target.value);
                          setConnectionStatus(ConnectionStatus.Idle);
                        }}
                      />
                      {connectionStatus === ConnectionStatus.Success && <Check className="text-green-500 shrink-0" size={20} />}
                      {connectionStatus === ConnectionStatus.Error && <X className="text-red-500 shrink-0" size={20} />}
                      {connectionStatus === ConnectionStatus.Checking && <Loader2 className="animate-spin text-muted-foreground shrink-0" size={20} />}
                    </div>
                    {connectionStatus === ConnectionStatus.Error && (
                      <p className="text-sm text-red-500">Connection failed. Please check the URL and try again.</p>
                    )}
                    <div className="flex flex-row justify-end gap-x-2">
                      <Button variant="outline" onClick={handleCheckConnection} disabled={connectionStatus === ConnectionStatus.Checking || !urlInput}>
                        {connectionStatus === ConnectionStatus.Checking ? "Checking..." : "Check Connection"}
                      </Button>
                      <Button onClick={handleSaveAnalyticsUrl} disabled={connectionStatus !== ConnectionStatus.Success}>
                        Save
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
        </div>
    )
}