/**
 * Motor de Pontuação Assíncrono — ApostAI
 * Usa BullMQ para processar cálculo de pontos após registro de resultados.
 * Fallback: se Redis não estiver disponível, executa de forma síncrona.
 */

import { Queue, Worker, Job } from "bullmq";
import {
  getBetsByGame,
  getGameById,
  getPoolScoringRules,
  getPoolMember,
  upsertBet,
  upsertPoolMemberStats,
  createNotification,
  getPoolMembers,
  getPoolById,
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
  isZebra: boolean;
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

// ─── SCORING LOGIC ────────────────────────────────────────────────────────────

export function calculateBetScore(
  predictedA: number,
  predictedB: number,
  actualA: number,
  actualB: number,
  rules: {
    exactScorePoints: number;
    correctResultPoints: number;
    totalGoalsPoints: number;
    goalDiffPoints: number;
    zebraPoints: number;
    zebraEnabled: boolean;
  },
  isZebra: boolean
) {
  let points = 0;
  let resultType: "exact" | "correct_result" | "wrong" = "wrong";

  const exactMatch = predictedA === actualA && predictedB === actualB;
  const predictedResult = Math.sign(predictedA - predictedB);
  const actualResult = Math.sign(actualA - actualB);
  const correctResult = predictedResult === actualResult;

  if (exactMatch) {
    points += rules.exactScorePoints;
    resultType = "exact";
  } else if (correctResult) {
    points += rules.correctResultPoints;
    resultType = "correct_result";
  }

  // Bônus só são concedidos quando o resultado (vencedor/empate) está correto
  if (correctResult) {
    if (predictedA + predictedB === actualA + actualB) {
      points += rules.totalGoalsPoints;
    }

    if (Math.abs(predictedA - predictedB) === Math.abs(actualA - actualB)) {
      points += rules.goalDiffPoints;
    }

    if (rules.zebraEnabled && isZebra) {
      points += rules.zebraPoints;
    }
  }

  return { points, resultType };
}

// ─── CORE SCORING PROCESSOR ───────────────────────────────────────────────────

export async function processGameScoring(gameId: number, scoreA: number, scoreB: number, isZebra: boolean) {
  const game = await getGameById(gameId);
  if (!game) {
    console.warn(`[Scoring] Game ${gameId} not found`);
    return;
  }

  // Buscar todos os bolões que usam este torneio via query direta
  const { getDb } = await import("./db");
  const db = await getDb();
  if (!db) return;
  const { pools: poolsTable } = await import("../drizzle/schema");
  const { eq } = await import("drizzle-orm");
  const pools = await db.select().from(poolsTable).where(eq(poolsTable.tournamentId, game.tournamentId));

  for (const pool of pools) {
    if (pool.status !== "active") continue;

    const rules = await getPoolScoringRules(pool.id);
    const defaultRules = {
      exactScorePoints: rules?.exactScorePoints ?? 10,
      correctResultPoints: rules?.correctResultPoints ?? 5,
      totalGoalsPoints: rules?.totalGoalsPoints ?? 2,
      goalDiffPoints: rules?.goalDiffPoints ?? 2,
      zebraPoints: rules?.zebraPoints ?? 3,
      zebraEnabled: rules?.zebraEnabled ?? true,
    };

    // Buscar todos os palpites deste jogo neste bolão
    const bets = await getBetsByGame(gameId, pool.id);

    for (const bet of bets) {
      const { points, resultType } = calculateBetScore(
        bet.predictedScoreA,
        bet.predictedScoreB,
        scoreA,
        scoreB,
        defaultRules,
        isZebra
      );

      // Atualizar pontuação do palpite
      await updateBetScore(bet.id, { pointsEarned: points, resultType });
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
let archiveWorker: Worker | null = null;

export function startScoringWorker() {
  const conn = getRedisConnection();
  if (!conn) {
    console.log("[Scoring] Redis not available — scoring will run synchronously");
    return;
  }

  scoreWorker = new Worker(
    "score-game",
    async (job: Job<ScoreGameJobData>) => {
      const { gameId, scoreA, scoreB, isZebra } = job.data;
      await processGameScoring(gameId, scoreA, scoreB, isZebra);
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
    await processGameScoring(data.gameId, data.scoreA, data.scoreB, data.isZebra);
  }
}
