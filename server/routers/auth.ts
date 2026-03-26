/**
 * Plakr! — Router de Autenticação
 * [T1] Modularizado a partir de server/routers.ts
 */
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { publicProcedure, router } from "../_core/trpc";
import { getUserPlanTier } from "../db";

export const authRouter = router({
  me: publicProcedure.query(async (opts) => {
    const user = opts.ctx.user;
    if (!user) return null;
    const planTier = await getUserPlanTier(user.id);
    return { ...user, planTier };
  }),
  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return { success: true } as const;
  }),
});
