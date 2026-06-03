import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { db } from "@/server/db";


export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
    trustedOrigins: ["http://localhost:3000"],
    database: prismaAdapter(db, {
        provider: "sqlite",
    }),
    socialProviders: {
        github: {
            clientId: process.env.GITHUB_CLIENT_ID || "",
            clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        }
    }
});

export const getSession = async () => {
    const { headers } = await import("next/headers");
    return auth.api.getSession({
        headers: await headers()
    });
};

export const handlers = auth.handler;
export const signIn = auth.api.signInSocial;
export const signOut = auth.api.signOut;
