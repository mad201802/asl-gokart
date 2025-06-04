import React from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { auth } from "@/server/auth";
import { Button } from "@/components/ui/button";

export async function UserNavigationMenu() {
  const session = await auth();

  return (
    <Popover>
      <PopoverTrigger>
        <Avatar className="cursor-pointer">
          {/*<AvatarImage src="/icons8-motorcycle-helmet.svg" alt="User Avatar" /> */}
          <AvatarFallback>{session ? `${session.user?.name?.charAt(0)}` : '?'}</AvatarFallback>
        </Avatar>
      </PopoverTrigger>
      <PopoverContent className="w-32">
        <a href="/api/auth/signout">
        <Button variant="destructive">
            Log Out
        </Button>
        </a>
      </PopoverContent>
    </Popover>
  )
}
