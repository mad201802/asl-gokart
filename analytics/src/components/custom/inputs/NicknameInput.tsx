"use client";

import React from "react";
import { useState } from "react";
import { api } from "@/trpc/react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { set } from "zod";
import { Button } from "@/components/ui/button";
import { SaveIcon } from "lucide-react";


export default function NicknameInput() {

    const utils = api.useUtils();

    const [nickname, setNickname] = useState(api.get.userNickname.useSuspenseQuery()[0] || "");

    const updateNickname = api.update.updateNickname.useMutation({
        onSuccess: async () => {
            // Set the nickname in the local state
            setNickname(nickname);
            console.log("Nickname updated successfully");
        },
        onError: (error) => {
            console.error("Error updating nickname:", error);
            setNickname(""); // Reset nickname on error
        }
    })

    return (
        <div className="flex flex-row">
            <div className="mt-6 grid w-full max-w-sm items-center gap-3">
                <Label htmlFor="nick">Nickname</Label>
                <Tooltip>
                <TooltipTrigger>
                    <Input 
                        type="text" 
                        id="nick" 
                        placeholder="Your Nickname" 
                        value={nickname}
                        onChange={(e) => setNickname(e.target.value)}
                        disabled={updateNickname.isPending}
                    />
                </TooltipTrigger>
                <TooltipContent>
                    <p>Your personal nickname you're using to interact with other users on this platform.</p>
                </TooltipContent>
                </Tooltip>
            </div>
            <Button 
                className="self-end ml-2"
                onClick={() => {updateNickname.mutate({ nickname })}}
                disabled={updateNickname.isPending}
            >
                <SaveIcon />
            </Button>
        </div>
    )
}