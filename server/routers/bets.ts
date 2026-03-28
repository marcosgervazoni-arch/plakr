/**
 * Plakr! — Router de Palpites (Bets)
 * [T1] Modularizado a partir de server/routers.ts
 * [T3] myBets com paginação cursor-based
 */
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import {
  getGameById,
  getPoolById,
  getPoolMember,
  getPoolScoringRules,
  upsertBet,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr, TournamentErr, UserErr } from "../errors";

export const betsRouter = router({
  // [T3] paginação cursor-based adicionada
  myBets: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      limit: z.number().min(1).max(100).default(50),
      cursor: z.number().optional(), // ID do último bet retornado
    }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member) throw Err.forbidden();

      const db = await (await import("../db")).getDb();
      if (!db) return { items: [], nextCursor: undefined, hasMore: false };

      const { bets: betsT } = await import("../../drizzle/schema");
      const { eq, and, lt, desc } = await import("drizzle-orm");

      const conditions = [
        eq(betsT.poolId, input.poolId),
        eq(betsT.userId, ctx.user.id),
      ];
      if (input.cursor) {
        conditions.push(lt(betsT.id, input.cursor));
      }

      const rows = await db
        .select()
        .from(betsT)
        .where(and(...conditions))
        .orderBy(desc(betsT.id))
        .limit(input.limit + 1);

      const hasMore = rows.length > input.limit;
      const items = hasMore ? rows.slice(0, input.limit) : rows;
      const nextCursor = hasMore ? items[items.length - 1]?.id : undefined;

      return { items, nextCursor, hasMore };
    }),

  placeBet: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      gameId: z.number(),
      predictedScoreA: z.number().min(0).max(99),
      predictedScoreB: z.number().min(0).max(99),
    }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || member.isBlocked) throw Err.forbidden();

      const game = await getGameById(input.gameId);
      if (!game) throw Err.notFound("Recurso");
      // [S9] Validar que o jogo pertence ao torneio do bolão
      const pool = await getPoolById(input.poolId);
      if (!pool || game.tournamentId !== pool.tournamentId) {
        throw PoolErr.gameNotInPool();
      }
      if (game.status === "finished" || game.status === "live") {
        throw PoolErr.gameStarted();
      }

      // Verificar prazo
      const rules = await getPoolScoringRules(input.poolId);
      const deadlineMinutes = rules?.bettingDeadlineMinutes ?? 60;
      const deadline = new Date(game.matchDate.getTime() - deadlineMinutes * 60 * 1000);
      if (new Date() > deadline) {
        throw Err.badRequest("Prazo para palpites encerrado.");
      }

      await upsertBet({
        poolId: input.poolId,
        userId: ctx.user.id,
        gameId: input.gameId,
        predictedScoreA: input.predictedScoreA,
        predictedScoreB: input.predictedScoreB,
      });

      return { success: true };
    }),
});
