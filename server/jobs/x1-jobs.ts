/**
 * X1 Jobs — Automação do ciclo de vida dos duelos
 *
 * Jobs:
 *  1. x1ExpiryJob     → expira desafios pendentes após 48h (cron horário)
 *  2. x1ScoreUpdateJob → atualiza placar de score_duel após jogo finalizado
 *
 * Integração:
 *  - Chamados pelo server/workers.ts no startup
 *  - x1ScoreUpdateJob é chamado pelo scoring.ts após setResult
 */

import logger from "../logger";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

async function getDb() {
  const { getDb: _getDb } = await import("../../server/db");
  const db = await _getDb();
  if (!db) throw new Error("DB not available");
  return db;
}

async function getSchema() {
  return import("../../drizzle/schema");
}

// ─── JOB 1: Expiração automática de desafios pendentes ───────────────────────

/**
 * Expira todos os desafios com status "pending" cujo expiresAt já passou.
 * Deve ser chamado a cada hora pelo cron.
 */
export async function x1ExpiryJob(): Promise<{ expired: number }> {
  const db = await getDb();
  const { x1Challenges } = await getSchema();
  const { eq, and, lt } = await import("drizzle-orm");

  const now = new Date();
  const stale = await db
    .select()
    .from(x1Challenges)
    .where(and(eq(x1Challenges.status, "pending"), lt(x1Challenges.expiresAt, now)));

  if (!stale.length) {
    logger.debug("[X1][ExpiryJob] No stale challenges found.");
    return { expired: 0 };
  }

  for (const c of stale) {
    await db
      .update(x1Challenges)
      .set({ status: "expired" })
      .where(eq(x1Challenges.id, c.id));
    logger.info(`[X1][ExpiryJob] Expired challenge ${c.id} (challenger=${c.challengerId} challenged=${c.challengedId})`);
  }

  logger.info(`[X1][ExpiryJob] Expired ${stale.length} challenge(s).`);
  return { expired: stale.length };
}

// ─── JOB 2: Atualização de placar pós-jogo ───────────────────────────────────

/**
 * Atualiza o placar de todos os score_duel que incluem o jogo recém-finalizado.
 * Deve ser chamado pelo scoring.ts após setGameResult.
 *
 * Fluxo:
 *  1. Busca todos os score_duel "active" que contêm o gameId nos gameIds
 *  2. Para cada um, recalcula os pontos do challenger e challenged
 *  3. Atualiza x1_game_scores com os pontos do jogo
 *  4. Se todos os jogos do duelo estão finalizados → conclui o duelo
 */
export async function x1ScoreUpdateJob(gameId: number): Promise<{ updated: number; concluded: number }> {
  const db = await getDb();
  const { x1Challenges, x1GameScores, bets, games } = await getSchema();
  const { eq, and, inArray } = await import("drizzle-orm");

  // Busca duelos ativos que contêm este jogo
  const activeChallenges = await db
    .select()
    .from(x1Challenges)
    .where(eq(x1Challenges.status, "active"));

  // Filtra os que incluem o gameId (gameIds é JSON array)
  const relevant = activeChallenges.filter((c) => {
    const ids = (c.gameIds as number[] | null) ?? [];
    return ids.includes(gameId);
  });

  if (!relevant.length) {
    logger.debug(`[X1][ScoreUpdateJob] No active challenges for game ${gameId}.`);
    return { updated: 0, concluded: 0 };
  }

  let updated = 0;
  let concluded = 0;

  for (const challenge of relevant) {
    const gameIds = (challenge.gameIds as number[]) ?? [];

    // Busca pontos do challenger e challenged para este jogo
    const [challengerBet, challengedBet] = await Promise.all([
      db
        .select({ points: bets.pointsEarned })
        .from(bets)
        .where(
          and(
            eq(bets.userId, challenge.challengerId),
            eq(bets.poolId, challenge.poolId),
            eq(bets.gameId, gameId)
          )
        )
        .limit(1),
      db
        .select({ points: bets.pointsEarned })
        .from(bets)
        .where(
          and(
            eq(bets.userId, challenge.challengedId),
            eq(bets.poolId, challenge.poolId),
            eq(bets.gameId, gameId)
          )
        )
        .limit(1),
    ]);

    const challengerPoints = challengerBet[0]?.points ?? 0;
    const challengedPoints = challengedBet[0]?.points ?? 0;

    // Upsert no x1_game_scores
    const existing = await db
      .select()
      .from(x1GameScores)
      .where(and(eq(x1GameScores.challengeId, challenge.id), eq(x1GameScores.gameId, gameId)))
      .limit(1);

    if (existing.length) {
      await db
        .update(x1GameScores)
        .set({ challengerPoints, challengedPoints })
        .where(and(eq(x1GameScores.challengeId, challenge.id), eq(x1GameScores.gameId, gameId)));
    } else {
      await db.insert(x1GameScores).values({
        challengeId: challenge.id,
        gameId,
        challengerPoints,
        challengedPoints,
      });
    }

    updated++;
    logger.info(
      `[X1][ScoreUpdateJob] Updated score for challenge ${challenge.id}, game ${gameId}: ` +
      `challenger=${challengerPoints}pts challenged=${challengedPoints}pts`
    );

    // Verifica se todos os jogos do duelo estão finalizados
    const finishedGames = await db
      .select({ id: games.id, status: games.status })
      .from(games)
      .where(inArray(games.id, gameIds));

    const allFinished = finishedGames.length === gameIds.length && finishedGames.every((g) => g.status === "finished");

    if (allFinished) {
      // Calcula totais
      const allScores = await db
        .select()
        .from(x1GameScores)
        .where(eq(x1GameScores.challengeId, challenge.id));

      const totalChallenger = allScores.reduce((acc, s) => acc + (s.challengerPoints ?? 0), 0);
      const totalChallenged = allScores.reduce((acc, s) => acc + (s.challengedPoints ?? 0), 0);

      const winnerId =
        totalChallenger > totalChallenged
          ? challenge.challengerId
          : totalChallenged > totalChallenger
          ? challenge.challengedId
          : null;

      await db
        .update(x1Challenges)
        .set({
          status: "concluded",
          challengerPoints: totalChallenger,
          challengedPoints: totalChallenged,
          winnerId,
          concludedAt: new Date(),
        })
        .where(eq(x1Challenges.id, challenge.id));

      concluded++;
      logger.info(
        `[X1][ScoreUpdateJob] Challenge ${challenge.id} concluded: ` +
        `challenger=${totalChallenger}pts challenged=${totalChallenged}pts winner=${winnerId ?? "draw"}`
      );

      // Notificações de conclusão
      try {
        const { createNotification } = await import("../../server/db");
        const winnerName = winnerId === challenge.challengerId ? "Você" : "Seu adversário";
        const resultText = winnerId === null ? "Empate!" : `${winnerName} venceu!`;

        await Promise.all([
          createNotification({
            userId: challenge.challengerId,
            type: "x1_challenge_concluded",
            title: `Duelo concluído — ${resultText}`,
            message: `Placar final: ${totalChallenger} × ${totalChallenged} pts`,
            actionUrl: `/x1/${challenge.id}`,
            actionLabel: "Ver resultado",
            priority: "high",
          }),
          createNotification({
            userId: challenge.challengedId,
            type: "x1_challenge_concluded",
            title: `Duelo concluído — ${resultText}`,
            message: `Placar final: ${totalChallenged} × ${totalChallenger} pts`,
            actionUrl: `/x1/${challenge.id}`,
            actionLabel: "Ver resultado",
            priority: "high",
          }),
        ]);
      } catch (e) {
        logger.warn({ err: e }, `[X1][ScoreUpdateJob] Failed to send conclusion notifications for challenge ${challenge.id}`);
      }
    }
  }

  return { updated, concluded };
}

// ─── CRON SETUP ──────────────────────────────────────────────────────────────

/**
 * Registra o cron de expiração do X1 (executa a cada hora).
 * Deve ser chamado no startup do servidor (server/workers.ts).
 */
export function registerX1CronJobs(): void {
  // Executa imediatamente no startup e depois a cada hora
  const INTERVAL_MS = 60 * 60 * 1000; // 1 hora

  const run = async () => {
    try {
      const result = await x1ExpiryJob();
      if (result.expired > 0) {
        logger.info(`[X1][Cron] Expiry run: ${result.expired} challenge(s) expired.`);
      }
    } catch (err) {
      logger.error({ err }, "[X1][Cron] Expiry job failed.");
    }
  };

  // Primeira execução após 30s do startup (para não sobrecarregar o boot)
  setTimeout(run, 30_000);
  setInterval(run, INTERVAL_MS);

  logger.info("[X1][Cron] Expiry job registered (interval: 1h).");
}
