/**
 * X1 Router — Duelos e Previsões
 * Feature: "Vem pro X1"
 *
 * Procedures:
 *  - getOptions    → opções de desafio disponíveis para um bolão/adversário
 *  - create        → criar um desafio (score_duel ou prediction)
 *  - accept        → desafiado aceita o convite (com sua resposta para prediction)
 *  - decline       → desafiado recusa o convite
 *  - cancel        → desafiante cancela antes da aceitação
 *  - conclude      → conclui um score_duel calculando pontos (chamado pelo job ou admin)
 *  - getByPool     → listar desafios de um bolão (com filtros)
 *  - getById       → detalhe de um desafio
 *  - getMyStats    → estatísticas do usuário logado em um bolão
 *  - getRivalry    → placar de rivalidade entre dois usuários em um bolão
 *  - expireStale   → expira desafios pendentes vencidos (chamado pelo cron job)
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import logger from "../logger";

// ─── LIMITES POR PLANO ────────────────────────────────────────────────────────
const PLAN_LIMITS = {
  free: { maxActive: 1, maxHistoryPerPool: 3 },
  pro: { maxActive: 5, maxHistoryPerPool: Infinity },
  unlimited: { maxActive: Infinity, maxHistoryPerPool: Infinity },
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getDb() {
  const { getDb: _getDb } = await import("../../server/db");
  const db = await _getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB not available" });
  return db;
}

async function getSchema() {
  return import("../../drizzle/schema");
}

/** Verifica se o usuário é membro ativo do bolão */
async function assertMembership(poolId: number, userId: number) {
  const db = await getDb();
  const { poolMembers } = await getSchema();
  const { eq, and } = await import("drizzle-orm");
  const member = await db
    .select()
    .from(poolMembers)
    .where(and(eq(poolMembers.poolId, poolId), eq(poolMembers.userId, userId)))
    .limit(1);
  if (!member.length) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você não é membro deste bolão." });
  }
  return member[0];
}

/** Retorna os jogos da próxima rodada (roundNumber) de um torneio */
async function getNextRoundGames(tournamentId: number): Promise<number[]> {
  const db = await getDb();
  const { games } = await getSchema();
  const { eq, and, isNotNull, asc } = await import("drizzle-orm");
  const rows = await db
    .select({ id: games.id, roundNumber: games.roundNumber })
    .from(games)
    .where(and(eq(games.tournamentId, tournamentId), isNotNull(games.roundNumber), eq(games.status, "scheduled")))
    .orderBy(asc(games.roundNumber), asc(games.matchDate));
  if (!rows.length) return [];
  // Pega o menor roundNumber disponível
  const minRound = rows[0].roundNumber!;
  return rows.filter((g) => g.roundNumber === minRound).map((g) => g.id);
}

/** Retorna os jogos da próxima fase de um torneio */
async function getNextPhaseGames(tournamentId: number): Promise<{ gameIds: number[]; phase: string }> {
  const db = await getDb();
  const { games } = await getSchema();
  const { eq, and, asc } = await import("drizzle-orm");
  const rows = await db
    .select({ id: games.id, phase: games.phase, status: games.status })
    .from(games)
    .where(and(eq(games.tournamentId, tournamentId), eq(games.status, "scheduled")))
    .orderBy(asc(games.matchDate));
  if (!rows.length) return { gameIds: [], phase: "" };
  // Pega a fase do primeiro jogo scheduled
  const firstPhase = rows[0].phase;
  const phaseGames = rows.filter((g) => g.phase === firstPhase);
  return { gameIds: phaseGames.map((g) => g.id), phase: firstPhase };
}

/** Calcula pontos de um usuário em um conjunto de jogos de um bolão */
async function calcPointsForGames(userId: number, poolId: number, gameIds: number[]): Promise<number> {
  if (!gameIds.length) return 0;
  const db = await getDb();
  const { bets } = await getSchema();
  const { eq, and, inArray } = await import("drizzle-orm");
  const rows = await db
    .select({ points: bets.pointsEarned })
    .from(bets)
    .where(and(eq(bets.userId, userId), eq(bets.poolId, poolId), inArray(bets.gameId, gameIds)));
  return rows.reduce((acc, r) => acc + (r.points ?? 0), 0);
}

/** Envia notificação de forma segura (sem lançar erro) */
async function sendNotification(params: {
  userId: number;
  type: "x1_challenge_received" | "x1_challenge_accepted" | "x1_challenge_concluded";
  title: string;
  message: string;
  actionUrl: string;
  actionLabel: string;
  priority?: "low" | "normal" | "high";
}) {
  try {
    const { createNotification } = await import("../../server/db");
    await createNotification({
      userId: params.userId,
      type: params.type,
      title: params.title,
      message: params.message,
      actionUrl: params.actionUrl,
      actionLabel: params.actionLabel,
      priority: params.priority ?? "normal",
    });
  } catch (e) {
    logger.warn({ err: e }, "[X1] Failed to send notification");
  }
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const x1Router = router({
  // ─── Opções de desafio disponíveis para um par usuário/bolão ─────────────
  getOptions: protectedProcedure
    .input(z.object({ poolId: z.number(), opponentId: z.number() }))
    .query(async ({ ctx, input }) => {
      const { poolId, opponentId } = input;
      if (opponentId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode desafiar a si mesmo." });
      }
      await assertMembership(poolId, ctx.user.id);
      await assertMembership(poolId, opponentId);

      const db = await getDb();
      const { pools, tournaments, games, teams } = await getSchema();
      const { eq, and, asc } = await import("drizzle-orm");

      // Busca o bolão e torneio
      const pool = await db.select().from(pools).where(eq(pools.id, poolId)).limit(1);
      if (!pool.length) throw new TRPCError({ code: "NOT_FOUND", message: "Bolão não encontrado." });
      const tournament = await db
        .select()
        .from(tournaments)
        .where(eq(tournaments.id, pool[0].tournamentId))
        .limit(1);
      if (!tournament.length) throw new TRPCError({ code: "NOT_FOUND", message: "Torneio não encontrado." });

      const t = tournament[0];
      const isLeague = t.format === "league";
      // isGroupsKnockout é determinado DEPOIS de buscar os dados reais.
      // Não depende do formato cadastrado — qualquer torneio com grupos/fases no banco exibe essas opções.
      // A flag será definida abaixo após buscar groups e knockoutPhases.

      // Busca times do torneio para previsões
      const teamList = await db
        .select()
        .from(teams)
        .where(eq(teams.tournamentId, t.id))
        .orderBy(asc(teams.name));

      // Busca próximo jogo scheduled
      const nextGame = await db
        .select()
        .from(games)
        .where(and(eq(games.tournamentId, t.id), eq(games.status, "scheduled")))
        .orderBy(asc(games.matchDate))
        .limit(1);

      // Busca grupos disponíveis
      const groupGames = await db
        .select({ groupName: games.groupName })
        .from(games)
        .where(and(eq(games.tournamentId, t.id)))
        .orderBy(asc(games.groupName));
      const groupSet = new Set<string>();
      for (const g of groupGames) {
        if (g.groupName) groupSet.add(g.groupName);
      }
      const groups = Array.from(groupSet);

      // Busca fases disponíveis com times únicos por fase
      // Isso permite calcular quantos times passam de cada fase (metade dos times da fase)
      const phaseGamesWithTeams = await db
        .select({ phase: games.phase, teamAId: games.teamAId, teamBId: games.teamBId })
        .from(games)
        .where(eq(games.tournamentId, t.id))
        .orderBy(asc(games.matchDate));
      const phaseSet = new Set<string>();
      // Mapa: fase -> set de teamIds únicos
      const phaseTeamMap = new Map<string, Set<number>>();
      for (const g of phaseGamesWithTeams) {
        phaseSet.add(g.phase);
        if (!phaseTeamMap.has(g.phase)) phaseTeamMap.set(g.phase, new Set());
        if (g.teamAId) phaseTeamMap.get(g.phase)!.add(g.teamAId);
        if (g.teamBId) phaseTeamMap.get(g.phase)!.add(g.teamBId);
      }
      const phases = Array.from(phaseSet);

      // Verifica se há rodada disponível (para league)
      const hasRoundNumber = await db
        .select({ roundNumber: games.roundNumber })
        .from(games)
        .where(and(eq(games.tournamentId, t.id), eq(games.status, "scheduled")))
        .limit(1);
      const hasNextRound = isLeague && hasRoundNumber.length > 0 && hasRoundNumber[0].roundNumber != null;

      // Verifica limites do plano do desafiante
      const { getUserPlanTier } = await import("../../server/db");
      const tier = await getUserPlanTier(ctx.user.id);
      const limits = PLAN_LIMITS[tier];
      const { x1Challenges } = await getSchema();
      const { inArray } = await import("drizzle-orm");
      const activeCount = await db
        .select({ id: x1Challenges.id })
        .from(x1Challenges)
        .where(
          and(
            eq(x1Challenges.poolId, poolId),
            inArray(x1Challenges.status, ["pending", "active"]),
            eq(x1Challenges.challengerId, ctx.user.id)
          )
        );
      const canChallenge = activeCount.length < limits.maxActive;
      const planLimit = limits.maxActive === Infinity ? null : limits.maxActive;

      // Detecção 100% baseada nos dados reais do banco:
      // - hasGroups: true se o torneio tem jogos com groupName preenchido
      // - knockoutPhases: fases que não são de grupo (excluindo group_stage, group_a, group_b...)
      // Isso garante que qualquer organizador que crie um bolão com grupos/fases veja as opções corretas,
      // independente do formato cadastrado (league, cup, groups_knockout, custom, etc.)
      const hasGroups = groups.length > 0;
      const knockoutPhases = phases.filter(
        (p) => p && p !== "group_stage" && !p.startsWith("group_")
      );
      const hasKnockoutPhases = knockoutPhases.length > 0;
      // isGroupsKnockout: true se o torneio tem grupos OU fases de mata-mata nos dados reais
      const isGroupsKnockout = hasGroups || hasKnockoutPhases;

      return {
        tournamentFormat: t.format,
        isLeague,
        isGroupsKnockout,
        hasNextRound,
        hasNextPhase: hasKnockoutPhases,
        nextGame: nextGame[0] ?? null,
        teams: teamList,
        groups,
        phases,
        canChallenge,
        planLimit,
        activeCount: activeCount.length,
        scopeOptions: [
          ...(hasNextRound ? [{ type: "next_round" as const, label: "Próxima rodada" }] : []),
          ...(hasKnockoutPhases ? [{ type: "next_phase" as const, label: "Próxima fase" }] : []),
          { type: "next_n_games" as const, label: "Próximos 5 jogos", value: 5 },
          { type: "next_n_games" as const, label: "Próximos 10 jogos", value: 10 },
          { type: "next_n_games" as const, label: "Próximos 20 jogos", value: 20 },
        ],
        predictionOptions: [
          // ── Campão (sempre disponível) ────────────────────────────────────
          { type: "champion" as const, label: "Quem vai ser o campão?", teamsRequired: 1 },
          // ── Classificação em grupo (detectado pelos dados reais) ────────────────────
          ...(hasGroups
            ? groups.map((g) => ({
                type: "group_qualified" as const,
                label: `Quem classifica no Grupo ${g}?`,
                context: { groupName: g },
                // Em campeonatos com fase de grupos, tipicamente 2 times passam por grupo
                teamsRequired: 2,
              }))
            : []),
          // ── Classificação por fase de mata-mata (detectado pelos dados reais) ────────────
          ...(hasKnockoutPhases
            ? knockoutPhases.map((p) => {
                // Times únicos na fase
                const teamsInPhase = phaseTeamMap.get(p)?.size ?? 0;
                // Metade dos times da fase avança (eliminatória simples)
                const teamsRequired = Math.max(1, Math.floor(teamsInPhase / 2));
                return {
                  type: "phase_qualified" as const,
                  label: `Quem passa para ${p}?`,
                  context: { phase: p },
                  teamsRequired,
                };
              })
            : []),
        ],
      };
    }),

  // ─── Criar desafio ────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(
      z.object({
        poolId: z.number(),
        challengedId: z.number(),
        challengeType: z.enum(["score_duel", "prediction"]),
        // score_duel
        scopeType: z.enum(["next_round", "next_phase", "next_n_games"]).optional(),
        scopeValue: z.number().int().min(5).max(20).optional(),
        // prediction
        predictionType: z
          .enum([
            "champion",
            "group_qualified",
            "phase_qualified",
          ])
          .optional(),
        challengerAnswer: z.union([z.string(), z.array(z.string())]).optional(),
        predictionContext: z
          .object({
            phase: z.string().optional(),
            groupName: z.string().optional(),
            gameId: z.number().optional(),
          })
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { poolId, challengedId } = input;
      if (challengedId === ctx.user.id) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Você não pode desafiar a si mesmo." });
      }

      await assertMembership(poolId, ctx.user.id);
      await assertMembership(poolId, challengedId);

      const db = await getDb();
      const { x1Challenges, pools, games } = await getSchema();
      const { eq, and, inArray } = await import("drizzle-orm");
      const { getUserPlanTier } = await import("../../server/db");

      // Verifica limites do plano
      const tier = await getUserPlanTier(ctx.user.id);
      const limits = PLAN_LIMITS[tier];

      // Conta X1s ativos do usuário
      const activeCount = await db
        .select({ id: x1Challenges.id })
        .from(x1Challenges)
        .where(
          and(
            eq(x1Challenges.poolId, poolId),
            inArray(x1Challenges.status, ["pending", "active"]),
            eq(x1Challenges.challengerId, ctx.user.id)
          )
        );
      if (activeCount.length >= limits.maxActive) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: `Você atingiu o limite de ${limits.maxActive} X1${limits.maxActive > 1 ? "s" : ""} simultâneo${limits.maxActive > 1 ? "s" : ""} no seu plano.`,
        });
      }

      // Conta histórico do usuário neste bolão
      if (limits.maxHistoryPerPool !== Infinity) {
        const histCount = await db
          .select({ id: x1Challenges.id })
          .from(x1Challenges)
          .where(and(eq(x1Challenges.poolId, poolId), eq(x1Challenges.challengerId, ctx.user.id)));
        if (histCount.length >= limits.maxHistoryPerPool) {
          throw new TRPCError({
            code: "FORBIDDEN",
            message: `Você atingiu o limite de ${limits.maxHistoryPerPool} X1s neste bolão no seu plano.`,
          });
        }
      }

      // Busca torneio do bolão
      const pool = await db.select().from(pools).where(eq(pools.id, poolId)).limit(1);
      if (!pool.length) throw new TRPCError({ code: "NOT_FOUND", message: "Bolão não encontrado." });
      const tournamentId = pool[0].tournamentId;

      // Resolve gameIds para score_duel
      let gameIds: number[] = [];
      if (input.challengeType === "score_duel") {
        if (!input.scopeType)
          throw new TRPCError({ code: "BAD_REQUEST", message: "scopeType é obrigatório para score_duel." });
        if (input.scopeType === "next_round") {
          gameIds = await getNextRoundGames(tournamentId);
        } else if (input.scopeType === "next_phase") {
          const result = await getNextPhaseGames(tournamentId);
          gameIds = result.gameIds;
        } else if (input.scopeType === "next_n_games") {
          if (!input.scopeValue)
            throw new TRPCError({ code: "BAD_REQUEST", message: "scopeValue é obrigatório para next_n_games." });
          const rows = await db
            .select({ id: games.id })
            .from(games)
            .where(and(eq(games.tournamentId, tournamentId), eq(games.status, "scheduled")))
            .orderBy((await import("drizzle-orm")).asc(games.matchDate))
            .limit(input.scopeValue);
          gameIds = rows.map((r) => r.id);
        }
        if (!gameIds.length) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Não há jogos disponíveis para este escopo." });
        }
      }

      // Validação de prediction
      if (input.challengeType === "prediction") {
        if (!input.predictionType)
          throw new TRPCError({ code: "BAD_REQUEST", message: "predictionType é obrigatório para prediction." });
        if (!input.challengerAnswer)
          throw new TRPCError({ code: "BAD_REQUEST", message: "challengerAnswer é obrigatório para prediction." });
      }

      // Captura ranking atual dos dois jogadores no bolão (para badges "Derrubei Golias" e "Era o Líder?")
      let challengerRankAtStart: number | null = null;
      let opponentRankAtStart: number | null = null;
      try {
        const { poolMemberStats } = await getSchema();
        const { asc: _asc } = await import("drizzle-orm");
        const rankRows = await db
          .select({ userId: poolMemberStats.userId, totalPoints: poolMemberStats.totalPoints })
          .from(poolMemberStats)
          .where(eq(poolMemberStats.poolId, poolId))
          .orderBy(_asc(poolMemberStats.totalPoints));
        // Ordena desc por pontos e atribui posição
        const sorted = [...rankRows].sort((a, b) => (b.totalPoints ?? 0) - (a.totalPoints ?? 0));
        const challengerPos = sorted.findIndex((r) => r.userId === ctx.user.id);
        const opponentPos = sorted.findIndex((r) => r.userId === challengedId);
        if (challengerPos !== -1) challengerRankAtStart = challengerPos + 1;
        if (opponentPos !== -1) opponentRankAtStart = opponentPos + 1;
      } catch (e) {
        logger.warn({ err: e }, "[X1] Failed to capture rank at start");
      }
      // Cria o desafio (expira em 48h)
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      const result = await db.insert(x1Challenges).values({
        poolId,
        challengerId: ctx.user.id,
        challengedId,
        status: "pending",
        challengeType: input.challengeType,
        predictionType: input.predictionType ?? null,
        challengerAnswer: input.challengerAnswer ?? null,
        predictionContext: input.predictionContext ?? null,
        scopeType: input.scopeType ?? null,
        scopeValue: input.scopeValue ?? null,
        gameIds: gameIds.length ? gameIds : null,
        expiresAt,
        challengerRankAtStart,
        opponentRankAtStart,
      });

      const challengeId = Number((result as any).insertId);
      logger.info(
        `[X1] Challenge created: id=${challengeId} challenger=${ctx.user.id} challenged=${challengedId} type=${input.challengeType}`
      );

      // Notificação para o desafiado
      await sendNotification({
        userId: challengedId,
        type: "x1_challenge_received",
        title: "Você recebeu um X1! ⚔️",
        message: `${ctx.user.name ?? "Alguém"} te mandou um desafio. Aceita?`,
        actionUrl: `/x1/${challengeId}`,
        actionLabel: "Ver desafio",
        priority: "high",
      });

      return { challengeId };
    }),

  // ─── Aceitar desafio ──────────────────────────────────────────────────────
  accept: protectedProcedure
    .input(
      z.object({
        challengeId: z.number(),
        challengedAnswer: z.union([z.string(), z.array(z.string())]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { x1Challenges } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      const challenge = await db
        .select()
        .from(x1Challenges)
        .where(and(eq(x1Challenges.id, input.challengeId), eq(x1Challenges.challengedId, ctx.user.id)))
        .limit(1);

      if (!challenge.length) throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado." });
      const c = challenge[0];
      if (c.status !== "pending")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este desafio não está mais pendente." });
      if (c.expiresAt && new Date() > c.expiresAt) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este desafio expirou." });
      }

      // Validação para prediction: resposta obrigatória e diferente da do desafiante
      if (c.challengeType === "prediction") {
        if (!input.challengedAnswer)
          throw new TRPCError({ code: "BAD_REQUEST", message: "Você precisa escolher sua resposta." });

        // Normaliza as respostas para arrays
        const challengerArr: string[] = Array.isArray(c.challengerAnswer)
          ? (c.challengerAnswer as string[])
          : [c.challengerAnswer as string];
        const challengedArr: string[] = Array.isArray(input.challengedAnswer)
          ? input.challengedAnswer
          : [input.challengedAnswer];

        // Valida número correto de times para phase_qualified
        if (c.predictionType === "phase_qualified") {
          // Calcula quantos times a fase tem para determinar o número esperado
          const { games } = await getSchema();
          const { eq: _eq } = await import("drizzle-orm");
          const { pools: _pools } = await getSchema();
          const poolRow = await db.select().from(_pools).where(_eq(_pools.id, c.poolId)).limit(1);
          if (poolRow.length) {
            const phaseKey = (c.predictionContext as { phase?: string } | null)?.phase;
            if (phaseKey) {
              const phaseGames = await db
                .select({ teamAId: games.teamAId, teamBId: games.teamBId })
                .from(games)
                .where(_eq(games.tournamentId, poolRow[0].tournamentId))
              const phaseTeamSet = new Set<number>();
              for (const g of phaseGames) {
                if (g.teamAId) phaseTeamSet.add(g.teamAId);
                if (g.teamBId) phaseTeamSet.add(g.teamBId);
              }
              // Filtra apenas jogos da fase específica
              const phaseSpecificGames = await db
                .select({ teamAId: games.teamAId, teamBId: games.teamBId })
                .from(games)
                .where(
                  (await import("drizzle-orm")).and(
                    _eq(games.tournamentId, poolRow[0].tournamentId),
                    _eq(games.phase, phaseKey)
                  )
                );
              const phaseSpecificTeams = new Set<number>();
              for (const g of phaseSpecificGames) {
                if (g.teamAId) phaseSpecificTeams.add(g.teamAId);
                if (g.teamBId) phaseSpecificTeams.add(g.teamBId);
              }
              const expectedCount = Math.max(1, Math.floor(phaseSpecificTeams.size / 2));
              if (challengedArr.length !== expectedCount) {
                throw new TRPCError({
                  code: "BAD_REQUEST",
                  message: `Você deve selecionar exatamente ${expectedCount} time${expectedCount !== 1 ? "s" : ""} que avançam nesta fase.`,
                });
              }
              // Verifica se o desafiante também enviou a quantidade correta
              if (challengerArr.length !== expectedCount) {
                // Desafiante enviou quantidade errada (legado) — aceita sem validação de quantidade
              } else {
                // Verifica combinação idêntica (mesmos times, mesma ordem ou não)
                const challengerSorted = [...challengerArr].sort();
                const challengedSorted = [...challengedArr].sort();
                if (JSON.stringify(challengerSorted) === JSON.stringify(challengedSorted)) {
                  throw new TRPCError({
                    code: "BAD_REQUEST",
                    message: "Sua combinação de times não pode ser idêntica à do desafiante.",
                  });
                }
              }
            }
          }
        } else if (c.predictionType === "group_qualified") {
          // group_qualified: 2 times, combinação não pode ser idêntica
          if (challengedArr.length !== 2) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Você deve selecionar exatamente 2 times." });
          }
          const challengerSorted = [...challengerArr].sort();
          const challengedSorted = [...challengedArr].sort();
          if (JSON.stringify(challengerSorted) === JSON.stringify(challengedSorted)) {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: "Sua combinação de times não pode ser idêntica à do desafiante.",
            });
          }
        } else {
          // champion e outros: resposta única, não pode ser igual
          const challengerAns = JSON.stringify(challengerArr[0]);
          const challengedAns = JSON.stringify(challengedArr[0]);
          if (challengerAns === challengedAns) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "Sua resposta não pode ser igual à do desafiante." });
          }
        }
      }

      await db
        .update(x1Challenges)
        .set({ status: "active", challengedAnswer: input.challengedAnswer ?? null })
        .where(eq(x1Challenges.id, input.challengeId));

      logger.info(`[X1] Challenge accepted: id=${input.challengeId} by user=${ctx.user.id}`);

      // Notificação para o desafiante
      await sendNotification({
        userId: c.challengerId,
        type: "x1_challenge_accepted",
        title: "Seu X1 foi aceito! ⚔️",
        message: `O duelo está ativo. Que vença o melhor!`,
        actionUrl: `/x1/${input.challengeId}`,
        actionLabel: "Ver duelo",
        priority: "normal",
      });

      return { success: true };
    }),

  // ─── Recusar desafio ──────────────────────────────────────────────────────
  decline: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { x1Challenges } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      const challenge = await db
        .select()
        .from(x1Challenges)
        .where(and(eq(x1Challenges.id, input.challengeId), eq(x1Challenges.challengedId, ctx.user.id)))
        .limit(1);

      if (!challenge.length) throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado." });
      if (challenge[0].status !== "pending")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este desafio não está mais pendente." });

      await db
        .update(x1Challenges)
        .set({ status: "cancelled" })
        .where(eq(x1Challenges.id, input.challengeId));

      logger.info(`[X1] Challenge declined: id=${input.challengeId} by user=${ctx.user.id}`);
      return { success: true };
    }),

  // ─── Cancelar desafio (pelo desafiante) ──────────────────────────────────
  cancel: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { x1Challenges } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      const challenge = await db
        .select()
        .from(x1Challenges)
        .where(and(eq(x1Challenges.id, input.challengeId), eq(x1Challenges.challengerId, ctx.user.id)))
        .limit(1);

      if (!challenge.length) throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado." });
      if (challenge[0].status !== "pending")
        throw new TRPCError({ code: "BAD_REQUEST", message: "Só é possível cancelar desafios pendentes." });

      await db
        .update(x1Challenges)
        .set({ status: "cancelled" })
        .where(eq(x1Challenges.id, input.challengeId));

      logger.info(`[X1] Challenge cancelled: id=${input.challengeId} by challenger=${ctx.user.id}`);
      return { success: true };
    }),

  // ─── Concluir score_duel (calcula pontos e determina vencedor) ────────────
  conclude: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      const { x1Challenges, x1GameScores } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(x1Challenges)
        .where(eq(x1Challenges.id, input.challengeId))
        .limit(1);

      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado." });
      const c = rows[0];

      // Verifica acesso: deve ser participante do duelo
      if (c.challengerId !== ctx.user.id && c.challengedId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Você não participa deste duelo." });
      }
      if (c.challengeType !== "score_duel") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Apenas duelos de palpites podem ser concluídos manualmente." });
      }
      if (c.status !== "active") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este duelo não está ativo." });
      }

      const gameIds = (c.gameIds as number[] | null) ?? [];
      if (!gameIds.length) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Nenhum jogo associado a este duelo." });
      }

      // Verifica se todos os jogos foram finalizados
      const { games } = await getSchema();
      const { inArray } = await import("drizzle-orm");
      const gameRows = await db
        .select({ id: games.id, status: games.status })
        .from(games)
        .where(inArray(games.id, gameIds));
      const allFinished = gameRows.every((g) => g.status === "finished");
      if (!allFinished) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Ainda há jogos em andamento neste duelo." });
      }

      // Calcula pontos
      const challengerPoints = await calcPointsForGames(c.challengerId, c.poolId, gameIds);
      const challengedPoints = await calcPointsForGames(c.challengedId, c.poolId, gameIds);

      // Salva game scores
      await db.delete(x1GameScores).where(eq(x1GameScores.challengeId, input.challengeId));
      for (const gameId of gameIds) {
        const cPts = await calcPointsForGames(c.challengerId, c.poolId, [gameId]);
        const dPts = await calcPointsForGames(c.challengedId, c.poolId, [gameId]);
        await db.insert(x1GameScores).values({
          challengeId: input.challengeId,
          gameId,
          challengerPoints: cPts,
          challengedPoints: dPts,
        });
      }

      // Determina vencedor
      let winnerId: number | null = null;
      if (challengerPoints > challengedPoints) winnerId = c.challengerId;
      else if (challengedPoints > challengerPoints) winnerId = c.challengedId;
      // null = empate

      await db
        .update(x1Challenges)
        .set({
          status: "concluded",
          winnerId,
          challengerPoints,
          challengedPoints,
          concludedAt: new Date(),
        })
        .where(eq(x1Challenges.id, input.challengeId));

      logger.info(
        `[X1] Challenge concluded: id=${input.challengeId} challenger=${challengerPoints}pts challenged=${challengedPoints}pts winner=${winnerId ?? "draw"}`
      );

      // Notificações para ambos
      const winnerMsg = winnerId === null ? "Empate! Nenhum dos dois ganhou." : "";
      await sendNotification({
        userId: c.challengerId,
        type: "x1_challenge_concluded",
        title: "X1 encerrado! ⚔️",
        message:
          winnerId === c.challengerId
            ? `Você venceu o duelo! ${challengerPoints} x ${challengedPoints} pts`
            : winnerId === c.challengedId
              ? `Você perdeu o duelo. ${challengerPoints} x ${challengedPoints} pts`
              : `Empate! ${challengerPoints} x ${challengedPoints} pts`,
        actionUrl: `/x1/${input.challengeId}`,
        actionLabel: "Ver resultado",
        priority: "high",
      });
      await sendNotification({
        userId: c.challengedId,
        type: "x1_challenge_concluded",
        title: "X1 encerrado! ⚔️",
        message:
          winnerId === c.challengedId
            ? `Você venceu o duelo! ${challengedPoints} x ${challengerPoints} pts`
            : winnerId === c.challengerId
              ? `Você perdeu o duelo. ${challengedPoints} x ${challengerPoints} pts`
              : `Empate! ${challengedPoints} x ${challengerPoints} pts`,
        actionUrl: `/x1/${input.challengeId}`,
        actionLabel: "Ver resultado",
        priority: "high",
      });

      return { winnerId, challengerPoints, challengedPoints };
    }),

  // ─── Listar desafios de um bolão ──────────────────────────────────────────
  getByPool: protectedProcedure
    .input(
      z.object({
        poolId: z.number(),
        filter: z.enum(["all", "mine", "pending"]).default("mine"),
      })
    )
    .query(async ({ ctx, input }) => {
      await assertMembership(input.poolId, ctx.user.id);
      const db = await getDb();
      const { x1Challenges, users } = await getSchema();
      const { eq, and, or, desc } = await import("drizzle-orm");

      let whereClause;
      if (input.filter === "mine") {
        whereClause = and(
          eq(x1Challenges.poolId, input.poolId),
          or(eq(x1Challenges.challengerId, ctx.user.id), eq(x1Challenges.challengedId, ctx.user.id))
        );
      } else if (input.filter === "pending") {
        whereClause = and(
          eq(x1Challenges.poolId, input.poolId),
          eq(x1Challenges.challengedId, ctx.user.id),
          eq(x1Challenges.status, "pending")
        );
      } else {
        whereClause = eq(x1Challenges.poolId, input.poolId);
      }

      const rows = await db
        .select()
        .from(x1Challenges)
        .where(whereClause)
        .orderBy(desc(x1Challenges.createdAt))
        .limit(50);

      // Enriquece com dados dos usuários
      const userIdSet = new Set<number>();
      for (const r of rows) {
        userIdSet.add(r.challengerId);
        userIdSet.add(r.challengedId);
        if (r.winnerId) userIdSet.add(r.winnerId);
      }
      const userIds = Array.from(userIdSet);
      const { inArray } = await import("drizzle-orm");
      const userRows = userIds.length
        ? await db
            .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
            .from(users)
            .where(inArray(users.id, userIds))
        : [];
      const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

      return rows.map((r) => ({
        ...r,
        challenger: userMap[r.challengerId] ?? null,
        challenged: userMap[r.challengedId] ?? null,
        winner: r.winnerId ? (userMap[r.winnerId] ?? null) : null,
        isMyChallenge: r.challengerId === ctx.user.id || r.challengedId === ctx.user.id,
        iAmChallenger: r.challengerId === ctx.user.id,
        iAmChallenged: r.challengedId === ctx.user.id,
      }));
    }),

  // ─── Detalhe de um desafio ────────────────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ challengeId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      const { x1Challenges, users, x1GameScores, games } = await getSchema();
      const { eq, inArray } = await import("drizzle-orm");

      const rows = await db
        .select()
        .from(x1Challenges)
        .where(eq(x1Challenges.id, input.challengeId))
        .limit(1);

      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND", message: "Desafio não encontrado." });
      const c = rows[0];

      // Verifica acesso: deve ser membro do bolão
      await assertMembership(c.poolId, ctx.user.id);

      // Busca usuários
      const userIds = [c.challengerId, c.challengedId, c.winnerId].filter(Boolean) as number[];
      const userRows = await db
        .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
        .from(users)
        .where(inArray(users.id, userIds));
      const userMap = Object.fromEntries(userRows.map((u) => [u.id, u]));

      // Busca game scores (para score_duel)
      const gameScores = await db
        .select()
        .from(x1GameScores)
        .where(eq(x1GameScores.challengeId, input.challengeId));

      // Busca detalhes dos jogos
      const gameIds = (c.gameIds as number[] | null) ?? gameScores.map((gs) => gs.gameId);
      const gameDetails = gameIds.length
        ? await db.select().from(games).where(inArray(games.id, gameIds))
        : [];

      return {
        ...c,
        challenger: userMap[c.challengerId] ?? null,
        challenged: userMap[c.challengedId] ?? null,
        winner: c.winnerId ? (userMap[c.winnerId] ?? null) : null,
        gameScores,
        games: gameDetails,
        iAmChallenger: c.challengerId === ctx.user.id,
        iAmChallenged: c.challengedId === ctx.user.id,
      };
    }),

  // ─── Estatísticas do usuário em um bolão ─────────────────────────────────
  getMyStats: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertMembership(input.poolId, ctx.user.id);
      const db = await getDb();
      const { x1Challenges } = await getSchema();
      const { eq, and, or } = await import("drizzle-orm");

      const all = await db
        .select()
        .from(x1Challenges)
        .where(
          and(
            eq(x1Challenges.poolId, input.poolId),
            or(eq(x1Challenges.challengerId, ctx.user.id), eq(x1Challenges.challengedId, ctx.user.id))
          )
        );

      const concluded = all.filter((c) => c.status === "concluded");
      const wins = concluded.filter((c) => c.winnerId === ctx.user.id).length;
      const losses = concluded.filter((c) => c.winnerId !== null && c.winnerId !== ctx.user.id).length;
      const draws = concluded.filter((c) => c.winnerId === null).length;
      const active = all.filter((c) => c.status === "active").length;
      const pending = all.filter((c) => c.status === "pending" && c.challengedId === ctx.user.id).length;

      return { wins, losses, draws, active, pending, total: concluded.length };
    }),

  // ─── Placar de rivalidade entre dois usuários em um bolão ────────────────
  getRivalry: protectedProcedure
    .input(z.object({ poolId: z.number(), opponentId: z.number() }))
    .query(async ({ ctx, input }) => {
      await assertMembership(input.poolId, ctx.user.id);
      const db = await getDb();
      const { x1Challenges } = await getSchema();
      const { eq, and, or, desc } = await import("drizzle-orm");

      const all = await db
        .select()
        .from(x1Challenges)
        .where(
          and(
            eq(x1Challenges.poolId, input.poolId),
            or(
              and(eq(x1Challenges.challengerId, ctx.user.id), eq(x1Challenges.challengedId, input.opponentId)),
              and(eq(x1Challenges.challengerId, input.opponentId), eq(x1Challenges.challengedId, ctx.user.id))
            ),
            eq(x1Challenges.status, "concluded")
          )
        )
        .orderBy(desc(x1Challenges.concludedAt));

      const myWins = all.filter((c) => c.winnerId === ctx.user.id).length;
      const opponentWins = all.filter((c) => c.winnerId === input.opponentId).length;
      const draws = all.filter((c) => c.winnerId === null).length;
      const lastChallenge = all[0] ?? null;

      return {
        myWins,
        opponentWins,
        draws,
        total: all.length,
        lastChallenge,
        iAmLeading: myWins > opponentWins,
        isTied: myWins === opponentWins,
      };
    }),

  // ─── Admin: listar todos os desafios da plataforma ────────────────────────
  adminList: protectedProcedure
    .input(
      z.object({
        poolId: z.number().optional(),
        status: z.enum(["all", "pending", "active", "concluded", "expired", "declined", "cancelled"]).default("all"),
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      const { x1Challenges, users, pools } = await getSchema();
      const { eq, and, desc, count } = await import("drizzle-orm");

      const conditions: any[] = [];
      if (input.poolId) conditions.push(eq(x1Challenges.poolId, input.poolId));
      if (input.status !== "all") conditions.push(eq(x1Challenges.status, input.status as any));

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const [totalRows, rows] = await Promise.all([
        db.select({ count: count() }).from(x1Challenges).where(whereClause),
        db
          .select()
          .from(x1Challenges)
          .where(whereClause)
          .orderBy(desc(x1Challenges.createdAt))
          .limit(input.pageSize)
          .offset((input.page - 1) * input.pageSize),
      ]);

      const total = totalRows[0]?.count ?? 0;

      // Enriquece com usuários e bolão
      const userIdSet = new Set<number>();
      const poolIdSet = new Set<number>();
      for (const r of rows) {
        userIdSet.add(r.challengerId);
        userIdSet.add(r.challengedId);
        if (r.winnerId) userIdSet.add(r.winnerId);
        poolIdSet.add(r.poolId);
      }
      const { inArray } = await import("drizzle-orm");
      const [userRows, poolRows] = await Promise.all([
        userIdSet.size
          ? db.select({ id: users.id, name: users.name }).from(users).where(inArray(users.id, Array.from(userIdSet)))
          : [],
        poolIdSet.size
          ? db.select({ id: pools.id, name: pools.name, slug: pools.slug }).from(pools).where(inArray(pools.id, Array.from(poolIdSet)))
          : [],
      ]);
      const userMap = Object.fromEntries((userRows as any[]).map((u: any) => [u.id, u]));
      const poolMap = Object.fromEntries((poolRows as any[]).map((p: any) => [p.id, p]));

      return {
        total,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil(total / input.pageSize),
        items: rows.map((r) => ({
          ...r,
          challenger: userMap[r.challengerId] ?? null,
          challenged: userMap[r.challengedId] ?? null,
          winner: r.winnerId ? (userMap[r.winnerId] ?? null) : null,
          pool: poolMap[r.poolId] ?? null,
        })),
      };
    }),

  // ─── Admin: cancelar/forçar conclusão de um desafio ─────────────────────
  adminForceCancel: protectedProcedure
    .input(z.object({ challengeId: z.number(), reason: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      const { x1Challenges } = await getSchema();
      const { eq } = await import("drizzle-orm");

      const rows = await db.select().from(x1Challenges).where(eq(x1Challenges.id, input.challengeId)).limit(1);
      if (!rows.length) throw new TRPCError({ code: "NOT_FOUND" });
      const c = rows[0];
      if (c.status === "concluded" || c.status === "expired") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Desafio já encerrado." });
      }

      await db
        .update(x1Challenges)
        .set({ status: "cancelled" })
        .where(eq(x1Challenges.id, input.challengeId));

      logger.info(`[X1][Admin] Force-cancelled challenge ${input.challengeId} by admin ${ctx.user.id}. Reason: ${input.reason ?? "none"}`);
      return { success: true };
    }),

  // ─── Admin: estatísticas globais do X1 ───────────────────────────────────
  adminStats: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
    const db = await getDb();
    const { x1Challenges } = await getSchema();
    const { count, eq } = await import("drizzle-orm");

    const [total, pending, active, concluded, expired] = await Promise.all([
      db.select({ count: count() }).from(x1Challenges),
      db.select({ count: count() }).from(x1Challenges).where(eq(x1Challenges.status, "pending")),
      db.select({ count: count() }).from(x1Challenges).where(eq(x1Challenges.status, "active")),
      db.select({ count: count() }).from(x1Challenges).where(eq(x1Challenges.status, "concluded")),
      db.select({ count: count() }).from(x1Challenges).where(eq(x1Challenges.status, "expired")),
    ]);

    return {
      total: total[0]?.count ?? 0,
      pending: pending[0]?.count ?? 0,
      active: active[0]?.count ?? 0,
      concluded: concluded[0]?.count ?? 0,
      expired: expired[0]?.count ?? 0,
    };
  }),

  // ─── Expirar desafios pendentes vencidos (cron job) ───────────────────────
  expireStale: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    const { x1Challenges } = await getSchema();
    const { eq, and, lt } = await import("drizzle-orm");

    const now = new Date();
    const stale = await db
      .select()
      .from(x1Challenges)
      .where(and(eq(x1Challenges.status, "pending"), lt(x1Challenges.expiresAt, now)));

    if (!stale.length) return { expired: 0 };

    for (const c of stale) {
      await db
        .update(x1Challenges)
        .set({ status: "expired" })
        .where(eq(x1Challenges.id, c.id));
    }

    logger.info(`[X1] Expired ${stale.length} stale challenges`);
    return { expired: stale.length };
  }),
});
