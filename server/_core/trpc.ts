import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { logger } from "../logger";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

// [O2] Middleware de logging de erros tRPC — registra latência e erros inesperados
const errorLogger = t.middleware(async ({ path, type, next }) => {
  const start = Date.now();
  const result = await next();
  const durationMs = Date.now() - start;
  if (!result.ok) {
    const err = result.error;
    const isClientError =
      err.code === "BAD_REQUEST" ||
      err.code === "UNAUTHORIZED" ||
      err.code === "FORBIDDEN" ||
      err.code === "NOT_FOUND";
    if (isClientError) {
      logger.warn({ path, type, code: err.code, durationMs }, `[tRPC] ${path} → ${err.code}`);
    } else {
      logger.error({ path, type, code: err.code, durationMs, err }, `[tRPC] ${path} → ${err.code}`);
    }
  } else {
    logger.debug({ path, type, durationMs }, `[tRPC] ${path} OK (${durationMs}ms)`);
  }
  return result;
});

export const router = t.router;
export const mergeRouters = t.mergeRouters;
export const publicProcedure = t.procedure.use(errorLogger);

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(errorLogger).use(requireUser);

export const adminProcedure = t.procedure.use(errorLogger).use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
