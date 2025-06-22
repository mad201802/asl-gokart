import { postRouter } from "@/server/api/routers/post";
import { getRouter } from "@/server/api/routers/get";
import { createCallerFactory, createTRPCRouter } from "@/server/api/trpc";
import { updateRouter } from "./routers/update";
import { sensorRouter } from "./routers/sensorData";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  post: postRouter,
  get: getRouter,
  update: updateRouter,
  sensorData: sensorRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
