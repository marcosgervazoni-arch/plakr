/**
 * X1 Prediction Resolver — Resolver automático de duelos de previsão por fase
 *
 * Responsabilidade:
 *   Após todos os jogos de uma fase de mata-mata serem finalizados, este job:
 *   1. Identifica quais times realmente avançaram para a próxima fase
 *   2. Busca todos os duelos X1 do tipo `phase_qualified` com status `active`
 *      que apostaram nessa fase
 *   3. Calcula quantos times cada participante acertou
 *   4. Determina o vencedor (mais acertos) ou empate e conclui o duelo
 *   5. Envia notificações in-app para ambos os participantes
 *
 * Estratégia de detecção dos times que avançaram:
 *   - Fase encerrada = todos os jogos da fase têm status "finished"
 *   - Times que avançaram = teamAId + teamBId dos jogos da PRÓXIMA fase
 *     (o chaveamento é preenchido quando os jogos da próxima fase são criados)
 *   - Fallback: se a próxima fase ainda não existe, usa os vencedores dos jogos
 *     da fase atual (scoreA > scoreB → teamAId avançou, etc.)
 *
 * Integração:
 *   - Chamado pelo cron a cada 30 minutos (registerX1PredictionResolverCron)
 *   - Chamado diretamente pelo scoring.ts após processGameScoring (trigger pós-jogo)
 *   - Pode ser disparado manualmente via procedure admin x1.resolvePhase
 *
 * Idempotência:
 *   - Duelos já concluídos (status !== "active") são ignorados
 *   - Fases parcialmente finalizadas (algum jogo ainda não terminou) são ignoradas
 */

import logger from "../logger";

// ─── HEALTH TRACKING ─────────────────────────────────────────────────────────

export const x1PredictionResolverHealth = {
  lastRunAt: null as Date | null,
  lastRunSuccess: null as boolean | null,
  lastError: null as string | null,
  runCount: 0,
  lastResolvedCount: 0,
};

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

// ─── TIPOS INTERNOS ───────────────────────────────────────────────────────────

export interface PhaseResolutionResult {
  /** ID do torneio processado */
  tournamentId: number;
  /** Nome da fase processada */
  phase: string;
  /** Times que realmente avançaram (IDs como strings para comparação com JSON) */
  advancedTeamIds: string[];
  /** Duelos resolvidos nesta execução */
  resolved: number;
  /** Duelos ignorados (já concluídos ou fase incompleta) */
  skipped: number;
}

export interface ResolverRunResult {
  /** Fases processadas */
  phasesChecked: number;
  /** Total de duelos resolvidos */
  totalResolved: number;
  /** Detalhes por fase */
  details: PhaseResolutionResult[];
}

// ─── LÓGICA PRINCIPAL ─────────────────────────────────────────────────────────

/**
 * Identifica os times que avançaram de uma fase encerrada.
 *
 * Estratégia em dois níveis:
 *   1. Próxima fase já cadastrada: usa teamAId/teamBId dos jogos da próxima fase
 *   2. Fallback (próxima fase ainda não existe): deriva vencedores dos jogos da fase atual
 *      - scoreA > scoreB → teamAId avançou
 *      - scoreA < scoreB → teamBId avançou
 *      - Empate com pênaltis: não temos dado de pênaltis, então inclui ambos como candidatos
 *        (conservador — melhor falso positivo do que falso negativo)
 */
async function getAdvancedTeams(
  tournamentId: number,
  phase: string,
  allPhases: string[]
): Promise<string[]> {
  const db = await getDb();
  const { games } = await getSchema();
  const { eq, and, isNotNull } = await import("drizzle-orm");

  // Tenta encontrar a próxima fase no chaveamento
  // Ordena as fases por número de jogos (decrescente) para inferir a sequência
  const phaseGameCounts = new Map<string, number>();
  for (const p of allPhases) {
    const count = await db
      .select({ id: games.id })
      .from(games)
      .where(and(eq(games.tournamentId, tournamentId), eq(games.phase, p)));
    phaseGameCounts.set(p, count.length);
  }

  // Ordena fases por contagem de jogos (decrescente = fase mais inicial primeiro)
  const sortedPhases = [...allPhases].sort(
    (a, b) => (phaseGameCounts.get(b) ?? 0) - (phaseGameCounts.get(a) ?? 0)
  );
  const phaseIndex = sortedPhases.indexOf(phase);
  const nextPhase = phaseIndex >= 0 && phaseIndex < sortedPhases.length - 1
    ? sortedPhases[phaseIndex + 1]
    : null;

  if (nextPhase) {
    // Estratégia 1: busca times da próxima fase (já cadastrados no chaveamento)
    const nextPhaseGames = await db
      .select({ teamAId: games.teamAId, teamBId: games.teamBId })
      .from(games)
      .where(
        and(
          eq(games.tournamentId, tournamentId),
          eq(games.phase, nextPhase),
          isNotNull(games.teamAId)
        )
      );

    const advancedIds = new Set<string>();
    for (const g of nextPhaseGames) {
      if (g.teamAId) advancedIds.add(String(g.teamAId));
      if (g.teamBId) advancedIds.add(String(g.teamBId));
    }

    if (advancedIds.size > 0) {
      logger.debug(
        { tournamentId, phase, nextPhase, count: advancedIds.size },
        "[X1][Resolver] Advanced teams from next phase"
      );
      return Array.from(advancedIds);
    }
  }

  // Estratégia 2 (fallback): deriva vencedores dos resultados da fase atual
  const currentPhaseGames = await db
    .select({
      teamAId: games.teamAId,
      teamBId: games.teamBId,
      scoreA: games.scoreA,
      scoreB: games.scoreB,
    })
    .from(games)
    .where(and(eq(games.tournamentId, tournamentId), eq(games.phase, phase)));

  const advancedIds = new Set<string>();
  for (const g of currentPhaseGames) {
    if (g.scoreA == null || g.scoreB == null) continue;
    if (g.scoreA > g.scoreB && g.teamAId) {
      advancedIds.add(String(g.teamAId));
    } else if (g.scoreB > g.scoreA && g.teamBId) {
      advancedIds.add(String(g.teamBId));
    } else {
      // Empate (provavelmente decidido por pênaltis — inclui ambos como candidatos)
      if (g.teamAId) advancedIds.add(String(g.teamAId));
      if (g.teamBId) advancedIds.add(String(g.teamBId));
    }
  }

  logger.debug(
    { tournamentId, phase, count: advancedIds.size, fallback: true },
    "[X1][Resolver] Advanced teams from current phase results (fallback)"
  );
  return Array.from(advancedIds);
}

/**
 * Calcula quantos times de uma aposta estão no conjunto de times que avançaram.
 */
function countHits(answer: string | string[] | null | undefined, advancedSet: Set<string>): number {
  if (!answer) return 0;
  const arr = Array.isArray(answer) ? answer : [answer];
  return arr.filter((t) => advancedSet.has(String(t))).length;
}

/**
 * Resolve todos os duelos phase_qualified de um torneio/fase específica.
 *
 * Pré-condição: todos os jogos da fase devem estar finalizados (verificado antes de chamar).
 */
export async function resolvePhase(
  tournamentId: number,
  phase: string,
  allPhases: string[]
): Promise<PhaseResolutionResult> {
  const db = await getDb();
  const { x1Challenges, pools } = await getSchema();
  const { eq, and, inArray } = await import("drizzle-orm");

  logger.info({ tournamentId, phase }, "[X1][Resolver] Resolving phase_qualified challenges");

  // Identifica times que avançaram
  const advancedTeamIds = await getAdvancedTeams(tournamentId, phase, allPhases);
  const advancedSet = new Set(advancedTeamIds);

  if (advancedSet.size === 0) {
    logger.warn({ tournamentId, phase }, "[X1][Resolver] No advanced teams found — skipping");
    return { tournamentId, phase, advancedTeamIds: [], resolved: 0, skipped: 0 };
  }

  // Busca todos os bolões do torneio
  const tournamentPools = await db
    .select({ id: pools.id })
    .from(pools)
    .where(eq(pools.tournamentId, tournamentId));

  if (!tournamentPools.length) {
    return { tournamentId, phase, advancedTeamIds, resolved: 0, skipped: 0 };
  }

  const poolIds = tournamentPools.map((p) => p.id);

  // Busca duelos phase_qualified ativos nos bolões do torneio
  const activeChallenges = await db
    .select()
    .from(x1Challenges)
    .where(
      and(
        eq(x1Challenges.challengeType, "prediction"),
        eq(x1Challenges.predictionType, "phase_qualified"),
        eq(x1Challenges.status, "active"),
        inArray(x1Challenges.poolId, poolIds)
      )
    );

  // Filtra apenas os que apostaram nesta fase específica
  const relevant = activeChallenges.filter((c) => {
    const ctx = c.predictionContext as { phase?: string } | null;
    return ctx?.phase === phase;
  });

  if (!relevant.length) {
    logger.debug({ tournamentId, phase }, "[X1][Resolver] No active challenges for this phase");
    return { tournamentId, phase, advancedTeamIds, resolved: 0, skipped: 0 };
  }

  let resolved = 0;
  let skipped = 0;

  for (const challenge of relevant) {
    try {
      const challengerHits = countHits(challenge.challengerAnswer as string | string[], advancedSet);
      const challengedHits = countHits(challenge.challengedAnswer as string | string[], advancedSet);

      const winnerId =
        challengerHits > challengedHits
          ? challenge.challengerId
          : challengedHits > challengerHits
          ? challenge.challengedId
          : null; // empate

      await db
        .update(x1Challenges)
        .set({
          status: "concluded",
          challengerPoints: challengerHits,
          challengedPoints: challengedHits,
          winnerId,
          concludedAt: new Date(),
        })
        .where(eq(x1Challenges.id, challenge.id));

      resolved++;

      const resultText =
        winnerId === null
          ? "Empate!"
          : winnerId === challenge.challengerId
          ? "Você venceu!"
          : "Seu adversário venceu!";

      logger.info(
        {
          challengeId: challenge.id,
          phase,
          challengerHits,
          challengedHits,
          winnerId: winnerId ?? "draw",
        },
        `[X1][Resolver] Challenge ${challenge.id} concluded: ${resultText}`
      );

      // Notificações in-app para ambos os participantes
      try {
        const { createNotification } = await import("../../server/db");

        const challengerResult =
          winnerId === null
            ? "Empate!"
            : winnerId === challenge.challengerId
            ? "Você venceu! 🏆"
            : "Você perdeu. 😔";

        const challengedResult =
          winnerId === null
            ? "Empate!"
            : winnerId === challenge.challengedId
            ? "Você venceu! 🏆"
            : "Você perdeu. 😔";

        await Promise.all([
          createNotification({
            userId: challenge.challengerId,
            type: "x1_challenge_concluded",
            title: `Duelo de fase resolvido — ${challengerResult}`,
            message: `Fase "${phase}": você acertou ${challengerHits} time${challengerHits !== 1 ? "s" : ""}, adversário acertou ${challengedHits}.`,
            actionUrl: `/x1/${challenge.id}`,
            actionLabel: "Ver resultado",
            priority: "high",
          }),
          createNotification({
            userId: challenge.challengedId,
            type: "x1_challenge_concluded",
            title: `Duelo de fase resolvido — ${challengedResult}`,
            message: `Fase "${phase}": você acertou ${challengedHits} time${challengedHits !== 1 ? "s" : ""}, adversário acertou ${challengerHits}.`,
            actionUrl: `/x1/${challenge.id}`,
            actionLabel: "Ver resultado",
            priority: "high",
          }),
        ]);
      } catch (notifErr) {
        logger.warn(
          { challengeId: challenge.id, err: notifErr },
          "[X1][Resolver] Notification failed (non-critical)"
        );
      }
      // [Badges] Verificar badges para ambos os jogadores após X1 resolvido
      for (const uid of [challenge.challengerId, challenge.challengedId]) {
        import("../../server/badges")
          .then(({ calculateAndAssignBadges }) => calculateAndAssignBadges(uid).catch(() => {}))
          .catch(() => {});
      }
      // [Mural] Evento automático: resultado do X1
      import("../../server/mural-triggers")
        .then(async ({ muralTrigger }) => {
          const { getUserById } = await import("../../server/db");
          const challenger = await getUserById(challenge.challengerId);
          const challenged = await getUserById(challenge.challengedId);
          await muralTrigger.x1Result({
            poolId: challenge.poolId,
            challengerName: challenger?.name ?? "Participante",
            challengedName: challenged?.name ?? "Participante",
            challengerPoints: challengerHits,
            challengedPoints: challengedHits,
            winnerId,
            scope: phase,
          });
        })
        .catch(() => {});
    } catch (err) {
      logger.error({ challengeId: challenge.id, err }, "[X1][Resolver] Failed to resolve challenge");
      skipped++;
    }
  }

  logger.info(
    { tournamentId, phase, resolved, skipped, advancedCount: advancedSet.size },
    "[X1][Resolver] Phase resolution complete"
  );

  return { tournamentId, phase, advancedTeamIds, resolved, skipped };
}

// ─── JOB PRINCIPAL ────────────────────────────────────────────────────────────

/**
 * Varre todos os torneios ativos, detecta fases completamente encerradas
 * (todos os jogos com status "finished") e resolve os duelos phase_qualified
 * correspondentes.
 *
 * Idempotente: duelos já concluídos são ignorados automaticamente.
 */
export async function runX1PredictionResolverJob(): Promise<ResolverRunResult> {
  const db = await getDb();
  const { games, pools, tournaments } = await getSchema();
  const { eq, and, ne, inArray } = await import("drizzle-orm");

  logger.debug("[X1][Resolver] Starting prediction resolver job");

  // Busca torneios que têm bolões ativos
  const activePools = await db
    .select({ tournamentId: pools.tournamentId })
    .from(pools)
    .where(
      and(
        ne(pools.status, "archived"),
        ne(pools.status, "deleted")
      )
    );

  const tournamentIds = Array.from(new Set(activePools.map((p) => p.tournamentId)));

  if (!tournamentIds.length) {
    logger.debug("[X1][Resolver] No active tournaments found");
    return { phasesChecked: 0, totalResolved: 0, details: [] };
  }

  const details: PhaseResolutionResult[] = [];
  let totalResolved = 0;
  let phasesChecked = 0;

  for (const tournamentId of tournamentIds) {
    // Busca todas as fases de mata-mata do torneio
    const allGames = await db
      .select({ phase: games.phase, status: games.status })
      .from(games)
      .where(eq(games.tournamentId, tournamentId));

    // Agrupa por fase (excluindo fases de grupo)
    const phaseMap = new Map<string, { total: number; finished: number }>();
    for (const g of allGames) {
      if (!g.phase || g.phase === "group_stage" || g.phase.startsWith("group_")) continue;
      const entry = phaseMap.get(g.phase) ?? { total: 0, finished: 0 };
      entry.total++;
      if (g.status === "finished") entry.finished++;
      phaseMap.set(g.phase, entry);
    }

    const allKnockoutPhases = Array.from(phaseMap.keys());

    for (const [phase, counts] of Array.from(phaseMap.entries())) {
      phasesChecked++;

      // Só processa fases 100% encerradas
      if (counts.total === 0 || counts.finished < counts.total) {
        logger.debug(
          { tournamentId, phase, finished: counts.finished, total: counts.total },
          "[X1][Resolver] Phase not fully finished — skipping"
        );
        continue;
      }

      const result = await resolvePhase(tournamentId, phase, allKnockoutPhases);
      if (result.resolved > 0 || result.skipped > 0) {
        details.push(result);
        totalResolved += result.resolved;
      }
    }
  }

  logger.info(
    { phasesChecked, totalResolved, detailCount: details.length },
    "[X1][Resolver] Job complete"
  );

  return { phasesChecked, totalResolved, details };
}

// ─── CRON SETUP ──────────────────────────────────────────────────────────────

let resolverInterval: NodeJS.Timeout | null = null;

/**
 * Registra o cron do resolver de previsões de fase (executa a cada 30 minutos).
 * Deve ser chamado no startup do servidor (server/_core/index.ts).
 */
export function registerX1PredictionResolverCron(): void {
  const INTERVAL_MS = 30 * 60 * 1000; // 30 minutos

  const run = async () => {
    x1PredictionResolverHealth.runCount++;
    x1PredictionResolverHealth.lastRunAt = new Date();
    try {
      const result = await runX1PredictionResolverJob();
      x1PredictionResolverHealth.lastRunSuccess = true;
      x1PredictionResolverHealth.lastError = null;
      x1PredictionResolverHealth.lastResolvedCount = result.totalResolved;
      if (result.totalResolved > 0) {
        logger.info(
          { totalResolved: result.totalResolved },
          "[X1][Resolver][Cron] Resolved challenges in this run"
        );
      }
    } catch (err) {
      x1PredictionResolverHealth.lastRunSuccess = false;
      x1PredictionResolverHealth.lastError = err instanceof Error ? err.message : String(err);
      logger.error({ err }, "[X1][Resolver][Cron] Job failed");
    }
  };

  // Primeira execução 60s após o startup (para não sobrecarregar o boot)
  setTimeout(run, 60_000);
  resolverInterval = setInterval(run, INTERVAL_MS);

  logger.info("[X1][Resolver][Cron] Registered (interval: 30min)");
}

export function stopX1PredictionResolverCron(): void {
  if (resolverInterval) {
    clearInterval(resolverInterval);
    resolverInterval = null;
  }
}
