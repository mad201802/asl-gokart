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
  

interface SetFunctionDialog {
        zc_identifier: string,
        buttonIndex: number,
        assignedFunction?: string
}

const SetButtonDialog = (props: SetFunctionDialog) => {
    return (
        <div>
            <Dialog>
            <DialogTrigger>
                { props.assignedFunction ?
                    <Button variant={"outline"}>
                        {props.assignedFunction}
                    </Button> :
                    <Button variant={"outline"} className="text-yellow-500">
                        Assign Function
                    </Button>
                }
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                <DialogTitle>Select function to re-assign your button</DialogTitle>
                <DialogDescription>
                    <div className="mb-4">
                        Select the function you want to assign to {" "}
                        <span className="font-bold underline">{props.zc_identifier}</span>
                         <span className="font-bold"> | Button {props.buttonIndex}</span>
                    </div>
                </DialogDescription>
                </DialogHeader>
            </DialogContent>
            </Dialog>
        </div>
    );
}

export default SetButtonDialog;