import React from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button";
import ButtonMapperTable from "./button-mapper-table";
import { DialogOverlay, DialogPortal } from "@radix-ui/react-dialog";
  

const ButtonMapperDialog = () => {
    return (
        <div>
            <Dialog>
            <DialogTrigger>
                <Button>
                    Change Button Mapping
                </Button>
            </DialogTrigger>
            <DialogPortal>
                <DialogOverlay>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                        <DialogTitle>Configure Physical Buttons</DialogTitle>
                        <DialogDescription>
                            <div className="mb-4">
                                Here you can configure the physical buttons on your device.
                            </div>
                            <ButtonMapperTable />
                        </DialogDescription>
                        </DialogHeader>
                    </DialogContent>            
                </DialogOverlay>
            </DialogPortal>

            </Dialog>
        </div>
    );
}

export default ButtonMapperDialog;