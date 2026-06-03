"use client";

import { authClient } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import React from "react";

export function SignInButton({ className, children }: { className?: string, children?: React.ReactNode }) {
    return (
        <button
            onClick={async () => {
                await authClient.signIn.social({ provider: "github", callbackURL: "/dashboard" });
            }}
            className={className}
        >
            {children || "Sign in"}
        </button>
    );
}

export function SignOutButton({ className, children }: { className?: string, children?: React.ReactNode }) {
    const router = useRouter();
    return (
        <button
            onClick={async () => {
                await authClient.signOut({
                    fetchOptions: {
                        onSuccess: () => {
                            router.push("/");
                            router.refresh();
                        }
                    }
                });
            }}
            className={className}
        >
            {children || "Sign out"}
        </button>
    );
}
