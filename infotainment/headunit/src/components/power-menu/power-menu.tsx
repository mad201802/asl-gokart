import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Button } from "../ui/button";
import { Power, X, Minimize, Maximize } from "lucide-react";
  

const PowerMenu = () => {

    return (
        <Dialog>
        <DialogTrigger>
            <Button>
                <Power size={24} className="mr-3" />
                Power Menu
            </Button>
        </DialogTrigger>
        <DialogContent>
            <DialogHeader>
            <DialogTitle className="flex justify-center">Power Menu</DialogTitle>
            <DialogDescription className="flex justify-center">

            </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center w-full">
                <div className="flex flex-row justify-evenly w-full">
                    <Button onClick={() => window.electronWindow.minimize()}>
                        <Minimize size={24} className="mr-3" />
                        Minimize
                    </Button>
                    <Button onClick={() => window.electronWindow.maximize()}>
                        <Maximize size={24} className="mr-3" />
                        Maximize
                    </Button>
                    <Button onClick={() => window.electronWindow.close()}>
                        <X size={24} className="mr-3" />
                        Close
                    </Button>
                </div>
            </div>
        </DialogContent>
        </Dialog>
    );

}

export default PowerMenu;