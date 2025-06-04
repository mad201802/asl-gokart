import { z } from "zod";

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from "@/server/api/trpc";

export const getRouter = createTRPCRouter({
    factOfTheDay: publicProcedure.query(() => {
        return "Did you know that the ASL gokart can reach speeds of up to 80 km/h?";
    }),

})