import React from "react";
import { auth } from "@/server/auth";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import NicknameInput from "@/components/custom/inputs/NicknameInput";

export default async function UserCard() {

    const session = await auth();

    return (
        <Card>
            <CardHeader>
                <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent>
                <p>Welcome to the settings page, <span className="font-semibold">{session?.user.name}</span></p>
                <div className="mt-6 grid w-full max-w-sm items-center gap-3">
                    <Label htmlFor="email">Email</Label>
                    <Tooltip>
                    <TooltipTrigger>
                        <Input type="email" id="email" placeholder="Email" value={session?.user.email || ""} disabled />
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>The Email is fetched from your GitHub account. You can't change this here.</p>
                    </TooltipContent>
                    </Tooltip>
                </div>
                <NicknameInput />
            </CardContent>
        </Card>
    )
}