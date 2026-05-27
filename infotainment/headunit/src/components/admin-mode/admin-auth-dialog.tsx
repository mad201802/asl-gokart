import React from "react";
import { useStore } from "@/stores/useStore";
import { useShallow } from "zustand/react/shallow";
import { toast } from "sonner";
import { CodeInput } from "./code-input";
import { CodeNumberpad } from "./code-numberpad";
import { Button } from "../ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "../ui/dialog";
import { Separator } from "../ui/separator";

type AdminAuthDialogProps = {
    trigger: React.ReactNode,
};

export const AdminAuthDialog = ({ trigger }: AdminAuthDialogProps) => {

    const { adminMode, setAdminMode, setAdminPin } = useStore(
        useShallow((state) => ({
            adminMode: state.adminMode,
            setAdminMode: state.setAdminMode,
            setAdminPin: state.setAdminPin,
        }))
    );

    const handleLogout = () => {
        setAdminMode(false);
        setAdminPin("");
        toast("Admin mode disabled!");
    }

    return (
        <Dialog>
            <DialogTrigger asChild>
                {trigger}
            </DialogTrigger>
            <DialogContent className="max-w-sm">
                <DialogHeader>
                    <DialogTitle>Admin Mode</DialogTitle>
                </DialogHeader>
                <DialogDescription>
                    {!adminMode && <p>Enter your PIN to unlock administrator features</p>}
                    {adminMode && <p className="text-green-600">Admin mode is active</p>}
                    <Separator className="mt-3" />
                </DialogDescription>

                {!adminMode && (
                    <>
                        <div className="flex flex-row justify-center pt-1">
                            <CodeInput />
                        </div>
                        <CodeNumberpad />
                    </>
                )}

                {adminMode && (
                    <div className="flex flex-col items-center gap-3 py-2">
                        <Button
                            variant="destructive"
                            className="h-14 w-full text-base"
                            onClick={handleLogout}
                        >
                            Lock Admin Mode
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}