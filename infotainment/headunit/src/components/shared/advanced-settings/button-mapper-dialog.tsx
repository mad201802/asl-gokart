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
import ButtonTesterTable from "./button-tester-table";
import { DialogOverlay, DialogPortal } from "@radix-ui/react-dialog";
  

const ButtonMapperDialog = () => {
    return (
        <div>
            <Dialog>
            <DialogTrigger>
                <Button>
                    Test Buttons
                </Button>
            </DialogTrigger>
            <DialogPortal>
                <DialogOverlay>
                    <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                        <DialogHeader>
                        <DialogTitle>Test Physical Buttons</DialogTitle>
                        <DialogDescription>
                            <div className="mb-4">
                                Here you can test the physical buttons built into the gokart.
                            </div>
                            <ButtonTesterTable />
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