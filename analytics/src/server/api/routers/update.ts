import { z } from 'zod';

import {
    createTRPCRouter,
    protectedProcedure,
    publicProcedure,
} from '@/server/api/trpc';

export const updateRouter = createTRPCRouter({
    updateNickname: protectedProcedure
        .input(z.object({ nickname: z.string().min(1) }))
        .mutation(async ({ ctx, input }) => {
            const user = await ctx.db.user.update({
                where: { id: ctx.session.user.id },
                data: { nickname: input.nickname },
            });

            return user;
        }),
})