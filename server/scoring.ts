/**
 * Motor de Pontuação Assíncrono — ApostAI
 * Implementa os 7 critérios acumuláveis conforme SISTEMA-PONTUACAO-APOSTAI.md v1.0
 * Usa BullMQ para processar cálculo de pontos após registro de resultados.
 * Fallback: se Redis não estiver disponível, executa de forma síncrona.
 */

import { Queue, Worker, Job } from "bullmq";
import {
  getBetsByGame,
  getGameById,
  getPoolScoringRules,
  upsertPoolMemberStats,
  createNotification,
  getPoolMembers,
  getBetsByPool,
  updateBetScore,
} from "./db";

// ─── REDIS CONNECTION ─────────────────────────────────────────────────────────

const REDIS_URL = process.env.REDIS_URL;

function getRedisConnection() {
  if (!REDIS_URL) return null;
  try {
    const { default: IORedis } = require("ioredis");
    return new IORedis(REDIS_URL, { maxRetriesPerRequest: null });
  } catch {
    return null;
  }
}

// ─── JOB TYPES ────────────────────────────────────────────────────────────────

export interface ScoreGameJobData {
  gameId: number;
  scoreA: number;
  scoreB: number;
}

export interface ArchivePoolJobData {
  poolId: number;
}

// ─── QUEUE ────────────────────────────────────────────────────────────────────

let scoreQueue: Queue | null = null;
let archiveQueue: Queue | null = null;

export function getScoreQueue(): Queue | null {
  if (scoreQueue) return scoreQueue;
  const conn = getRedisConnection();
  if (!conn) return null;
  scoreQueue = new Queue("score-game", { connection: conn });
  return scoreQueue;
}

export function getArchiveQueue(): Queue | null {
  if (archiveQueue) return archiveQueue;
  const conn = getRedisConnection();
  if (!conn) return null;
  archiveQueue = new Queue("archive-pool", { connection: conn });
  return archiveQueue;
}

// ─── TIPOS ────────────────────────────────────────────────────────────────────

export type ResultType = "exact" | "correct_result" | "wrong";

export interface ScoringRules {
  exactScorePoints: number;
  correctResultPoints: number;
  totalGoalsPoints: number;
  goalDiffPoints: number;
  oneTeamGoalsPoints: number;
  landslidePoints: number;
  zebraPoints: number;
  zebraThreshold: number;   // % inteiro (ex: 75 = 75%)
  zebraCountDraw: boolean;
  zebraEnabled: boolean;
}

export interface ScoringBreakdown {
  pointsExactScore: number;
  pointsCorrectResult: number;
  pointsTotalGoals: number;
  pointsGoalDiff: number;
  pointsOneTeamGoals: number;
  pointsLandslide: number;
  pointsZebra: number;
  isZebra: boolean;
  total: number;
  resultType: ResultType;
}

export interface ZebraContext {
  /** true quando este jogo é considerado zebra (threshold atingido e favorito perdeu) */
  isZebraGame: boolean;
  /** Qual lado era o favorito (maioria apostou nele) */
  betterTeam: "A" | "B" | "draw";
  /** true se o favorito venceu (não é zebra) */
  favoriteWon: boolean;
}

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function getSide(scoreA: number, scoreB: number): "A" | "B" | "draw" {
  return scoreA > scoreB ? "A" : scoreA < scoreB ? "B" : "draw";
}

// ─── ENGINE PRINCIPAL ─────────────────────────────────────────────────────────
//
// Implementa os 7 critérios conforme SISTEMA-PONTUACAO-APOSTAI.md:
//
//  Critérios INDEPENDENTES do resultado:
//    4. Diferença de gols  — |predA-predB| == |actA-actB|
//    5. Gols de um time    — predA==actA OR predB==actB
//
//  Critérios DEPENDENTES do resultado (requerem acerto do vencedor/empate):
//    2. Resultado correto  — lado apostado == lado real
//    1. Placar exato       — predA==actA AND predB==actB  (implica resultado correto)
//    3. Total de gols      — (predA+predB) == (actA+actB)
//    6. Goleada            — diff_real>=4 AND diff_palpite>=4
//    7. Zebra              — ratio_perdedor >= zebraThreshold/100
//
// Nota: Critério 1 (placar exato) e Critério 2 (resultado correto) são CUMULATIVOS.
// Um placar exato soma AMBOS os pontos (10+5 com valores padrão).

export function calculateBetScore(
  predictedA: number,
  predictedB: number,
  actualA: number,
  actualB: number,
  rules: ScoringRules,
  zebraCtx: ZebraContext = { isZebraGame: false, betterTeam: "A", favoriteWon: true }
): ScoringBreakdown {
  const breakdown: ScoringBreakdown = {
    pointsExactScore: 0,
    pointsCorrectResult: 0,
    pointsTotalGoals: 0,
    pointsGoalDiff: 0,
    pointsOneTeamGoals: 0,
    pointsLandslide: 0,
    pointsZebra: 0,
    isZebra: false,
    total: 0,
    resultType: "wrong",
  };

  const predictedSide = getSide(predictedA, predictedB);
  const actualSide = getSide(actualA, actualB);
  const correctResult = predictedSide === actualSide;

  // ── Critérios INDEPENDENTES (avaliar sempre) ──────────────────────────────

  // Critério 4: Diferença de gols — independente do resultado
  if (Math.abs(predictedA - predictedB) === Math.abs(actualA - actualB)) {
    breakdown.pointsGoalDiff = rules.goalDiffPoints;
  }

  // Critério 5: Gols de um time — independente do resultado
  if (predictedA === actualA || predictedB === actualB) {
    breakdown.pointsOneTeamGoals = rules.oneTeamGoalsPoints;
  }

  // ── Critérios DEPENDENTES do resultado ────────────────────────────────────

  if (correctResult) {
    // Critério 2: Resultado correto (sempre soma quando acertou)
    breakdown.pointsCorrectResult = rules.correctResultPoints;

    // Critério 1: Placar exato (soma ALÉM do resultado correto)
    if (predictedA === actualA && predictedB === actualB) {
      breakdown.pointsExactScore = rules.exactScorePoints;
      breakdown.resultType = "exact";
    } else {
      breakdown.resultType = "correct_result";
    }

    // Critério 3: Total de gols (requer resultado correto)
    if (predictedA + predictedB === actualA + actualB) {
      breakdown.pointsTotalGoals = rules.totalGoalsPoints;
    }

    // Critério 6: Goleada (diff≥3 no resultado real E no palpite)
    if (
      Math.abs(actualA - actualB) >= 3 &&
      Math.abs(predictedA - predictedB) >= 3
    ) {
      breakdown.pointsLandslide = rules.landslidePoints;
    }

    // Critério 7: Zebra
    if (rules.zebraEnabled && zebraCtx.isZebraGame) {
      const isDrawResult = actualSide === "draw";
      const shouldEvaluateZebra = !isDrawResult || rules.zebraCountDraw;

      if (shouldEvaluateZebra) {
        breakdown.pointsZebra = rules.zebraPoints;
        breakdown.isZebra = true;
      }
    }
  }

  // Total acumulado
  breakdown.total =
    breakdown.pointsExactScore +
    breakdown.pointsCorrectResult +
    breakdown.pointsTotalGoals +
    breakdown.pointsGoalDiff +
    breakdown.pointsOneTeamGoals +
    breakdown.pointsLandslide +
    breakdown.pointsZebra;

  return breakdown;
}

// ─── CÁLCULO DO CONTEXTO ZEBRA ────────────────────────────────────────────────
//
// Deve ser chamado ANTES de processar os palpites individuais.
// Calcula a fração (0–1) dos apostadores que apostou no lado PERDEDOR.

export function calculateZebraContext(
  bets: Array<{ predictedScoreA: number; predictedScoreB: number }>,
  actualA: number,
  actualB: number,
  threshold: number = 75
): ZebraContext {
  const noZebra: ZebraContext = { isZebraGame: false, betterTeam: "A", favoriteWon: true };
  if (bets.length === 0) return noZebra;

  const actualSide = getSide(actualA, actualB);

  // Contar votos por lado
  const votes = { A: 0, B: 0, draw: 0 };
  for (const bet of bets) {
    const side = getSide(bet.predictedScoreA, bet.predictedScoreB);
    votes[side]++;
  }

  // Determinar o favorito (lado com mais votos)
  const betterTeam: "A" | "B" | "draw" =
    votes.A >= votes.B && votes.A >= votes.draw ? "A" :
    votes.B >= votes.A && votes.B >= votes.draw ? "B" : "draw";

  const favoriteVotes = votes[betterTeam];
  const favoritePct = (favoriteVotes / bets.length) * 100;

  // Só é zebra se: >= threshold% apostou no favorito E o favorito NÃO venceu
  const favoriteWon = actualSide === betterTeam;
  const isZebraGame = favoritePct >= threshold && !favoriteWon;

  return { isZebraGame, betterTeam, favoriteWon };
}

// ─── CORE SCORING PROCESSOR ───────────────────────────────────────────────────

export async function processGameScoring(gameId: number, scoreA: number, scoreB: number) {
  const game = await getGameById(gameId);
  if (!game) {
    console.warn(`[Scoring] Game ${gameId} not found`);
    return;
  }

  // Buscar todos os bolões que usam este torneio
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return;
  const { pools: poolsTable } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const pools = await db.select().from(poolsTable).where(eq(poolsTable.tournamentId, game.tournamentId));

  for (const pool of pools) {
    if (pool.status !== "active") continue;

    const rulesRow = await getPoolScoringRules(pool.id);

    // Valores padrão conforme SISTEMA-PONTUACAO-APOSTAI.md
    const rules: ScoringRules = {
      exactScorePoints:    rulesRow?.exactScorePoints    ?? 10,
      correctResultPoints: rulesRow?.correctResultPoints ?? 5,
      totalGoalsPoints:    rulesRow?.totalGoalsPoints    ?? 3,
      goalDiffPoints:      rulesRow?.goalDiffPoints      ?? 3,
      oneTeamGoalsPoints:  rulesRow?.oneTeamGoalsPoints  ?? 2,
      landslidePoints:     rulesRow?.landslidePoints     ?? 5,
      zebraPoints:         rulesRow?.zebraPoints         ?? 1,
      zebraThreshold:      rulesRow?.zebraThreshold      ?? 75,
      zebraCountDraw:      rulesRow?.zebraCountDraw      ?? false,
      zebraEnabled:        rulesRow?.zebraEnabled        ?? true,
    };

    // Buscar todos os palpites deste jogo neste bolão
    const bets = await getBetsByGame(gameId, pool.id);

    // Calcular contexto zebra uma única vez para este jogo/bolão
    const zebraCtx = calculateZebraContext(bets, scoreA, scoreB);

    for (const bet of bets) {
      const breakdown = calculateBetScore(
        bet.predictedScoreA,
        bet.predictedScoreB,
        scoreA,
        scoreB,
        rules,
        zebraCtx
      );

      await updateBetScore(bet.id, {
        pointsEarned: breakdown.total,
        resultType: breakdown.resultType,
      });
    }

    // Recalcular stats de todos os membros do bolão
    const members = await getPoolMembers(pool.id);
    for (const { member } of members) {
      const allBets = await getBetsByPool(pool.id, member.userId);
      const totalPoints = allBets.reduce((sum, b) => sum + (b.pointsEarned ?? 0), 0);
      const exactCount = allBets.filter((b) => b.resultType === "exact").length;
      const correctCount = allBets.filter((b) => b.resultType === "correct_result").length;

      await upsertPoolMemberStats(pool.id, member.userId, {
        totalPoints,
        exactScoreCount: exactCount,
        correctResultCount: correctCount,
        totalBets: allBets.length,
      });
    }

    // Notificar membros sobre resultado
    for (const { member } of members) {
      await createNotification({
        userId: member.userId,
        poolId: pool.id,
        type: "result_available",
        title: `Resultado: ${game.teamAName} ${scoreA} × ${scoreB} ${game.teamBName}`,
        message: `O resultado do jogo foi registrado. Confira sua pontuação no bolão "${pool.name}".`,
      });
    }
  }

  console.log(`[Scoring] Processed game ${gameId}: ${scoreA}×${scoreB}, ${pools.length} pools updated`);
}

// ─── WORKER ───────────────────────────────────────────────────────────────────

let scoreWorker: Worker | null = null;

export function startScoringWorker() {
  const conn = getRedisConnection();
  if (!conn) {
    console.log("[Scoring] Redis not available — scoring will run synchronously");
    return;
  }

  scoreWorker = new Worker(
    "score-game",
    async (job: Job<ScoreGameJobData>) => {
      const { gameId, scoreA, scoreB } = job.data;
      await processGameScoring(gameId, scoreA, scoreB);
    },
    { connection: conn, concurrency: 3 }
  );

  scoreWorker.on("completed", (job) => {
    console.log(`[Scoring] Job ${job.id} completed for game ${job.data.gameId}`);
  });

  scoreWorker.on("failed", (job, err) => {
    console.error(`[Scoring] Job ${job?.id} failed:`, err.message);
  });

  console.log("[Scoring] Worker started");
}

export async function enqueueScoreGame(data: ScoreGameJobData) {
  const queue = getScoreQueue();
  if (queue) {
    await queue.add("score-game", data, {
      attempts: 3,
      backoff: { type: "exponential", delay: 2000 },
    });
    console.log(`[Scoring] Enqueued scoring for game ${data.gameId}`);
  } else {
    // Fallback síncrono se Redis não disponível
    console.log(`[Scoring] Running synchronously for game ${data.gameId}`);
    await processGameScoring(data.gameId, data.scoreA, data.scoreB);
  }
}
