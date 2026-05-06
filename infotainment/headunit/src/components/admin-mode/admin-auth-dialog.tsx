import React from "react";
import { useStore } from "@/stores/useStore";
import { toast } from "sonner";
import { CodeInput } from "./code-input";
import { CodeNumberpad } from "./code-numberpad";
import { Button } from "../ui/button";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from "../ui/dialog";
import { Separator } from "../ui/separator";

type AdminAuthDialogProps = {
    trigger: React.ReactNode,
};

export const AdminAuthDialog = ({ trigger }: AdminAuthDialogProps) => {

    const { adminMode, setAdminMode, setAdminPin } = useStore();

    let handleLogout = () => {
        setAdminMode(false);
        setAdminPin("");
        toast("Admin mode disabled!");
    }

    return (
        <Dialog>
        <DialogTrigger asChild>
            {trigger}
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Admin Mode</DialogTitle>
            </DialogHeader>
            <DialogDescription>
            {!adminMode && <p>Enter your Pin to unlock the administrator features</p>}
            {adminMode && <p className="text-green-700">Admin Mode activated!</p>}
            <Separator className="mt-3"/>
            </DialogDescription>
            
            { !adminMode && <div className="flex flex-row justify-center">
            <CodeInput />
            </div> }
            
            { !adminMode && <CodeNumberpad /> }
            
            { adminMode && <div className="flex flex-row justify-center">
            <Button onClick={() => handleLogout()}>Logout</Button>
            </div> }
        </DialogContent>
        </Dialog>
    )
}