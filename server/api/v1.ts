/**
 * Plakr Public API — v1
 *
 * Endpoints da Fase 1:
 *   GET  /api/v1/tournaments          — listar campeonatos (pools:read)
 *   GET  /api/v1/tournaments/:id      — detalhar campeonato (pools:read)
 *   POST /api/v1/pools                — criar bolão (pools:write)
 *   GET  /api/v1/pools/:slug          — detalhar bolão (pools:read)
 *   PUT  /api/v1/games/:id/result     — lançar resultado (results:write)
 */
import { Router } from "express";
import { requireApiKey } from "./auth";
import {
  getGlobalTournaments,
  getTournamentById,
  getTournamentPhases,
  getTeamsByTournament,
  createPool,
  getPoolBySlug,
  getGameById,
  updateGameResult,
  getBetsByGameAllPools,
  getPoolScoringRules,
  getPlatformSettings,
  recalculateMemberStats,
  updateBetScore,
  canCreatePool,
} from "../db";
import { calculateBetScore, calculateZebraContext } from "../scoring";
import { nanoid } from "nanoid";
import type { ScoringRules } from "../scoring";

// Inline helper (mesma lógica dos routers de tournaments e pools-games)
function buildEffectiveRules(
  rules: any,
  defaultSettings: any
): ScoringRules {
  return {
    exactScorePoints:    rules?.exactScorePoints    ?? defaultSettings?.defaultScoringExact          ?? 10,
    correctResultPoints: rules?.correctResultPoints ?? defaultSettings?.defaultScoringCorrect         ?? 5,
    totalGoalsPoints:    rules?.totalGoalsPoints    ?? defaultSettings?.defaultScoringBonusGoals      ?? 3,
    goalDiffPoints:      rules?.goalDiffPoints      ?? defaultSettings?.defaultScoringBonusDiff       ?? 3,
    oneTeamGoalsPoints:  rules?.oneTeamGoalsPoints  ?? defaultSettings?.defaultScoringBonusOneTeam    ?? 2,
    landslidePoints:     rules?.landslidePoints     ?? defaultSettings?.defaultScoringBonusLandslide  ?? 5,
    landslideMinDiff:    rules?.landslideMinDiff    ?? defaultSettings?.defaultLandslideMinDiff        ?? 4,
    zebraPoints:         rules?.zebraPoints         ?? defaultSettings?.defaultScoringBonusUpset      ?? 1,
    zebraThreshold:      rules?.zebraThreshold      ?? defaultSettings?.defaultZebraThreshold         ?? 75,
    zebraCountDraw:      rules?.zebraCountDraw      ?? false,
    zebraEnabled:        rules?.zebraEnabled        ?? true,
  };
}

const router = Router();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function apiError(res: any, status: number, code: string, message: string) {
  return res.status(status).json({ error: { code, message, status } });
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .substring(0, 100);
}

// ─── GET /api/v1/tournaments ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/v1/tournaments:
 *   get:
 *     summary: Listar campeonatos disponíveis
 *     tags: [Campeonatos]
 *     security:
 *       - ApiKeyAuth: []
 *     responses:
 *       200:
 *         description: Lista de campeonatos globais ativos
 */
router.get("/tournaments", requireApiKey("pools:read"), async (req, res) => {
  try {
    const tournaments = await getGlobalTournaments();
    return res.json({
      data: tournaments.map((t) => ({
        id: t.id,
        name: t.name,
        slug: t.slug,
        logoUrl: t.logoUrl,
        status: t.status,
        country: t.country,
        season: t.season,
        format: t.format,
        startDate: t.startDate,
        endDate: t.endDate,
      })),
      total: tournaments.length,
    });
  } catch (err) {
    console.error("[API v1] GET /tournaments error:", err);
    return apiError(res, 500, "INTERNAL_ERROR", "Erro ao listar campeonatos.");
  }
});

// ─── GET /api/v1/tournaments/:id ─────────────────────────────────────────────
/**
 * @openapi
 * /api/v1/tournaments/{id}:
 *   get:
 *     summary: Detalhar campeonato com fases e times
 *     tags: [Campeonatos]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 */
router.get("/tournaments/:id", requireApiKey("pools:read"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return apiError(res, 400, "VALIDATION_ERROR", "ID inválido.");

  try {
    const tournament = await getTournamentById(id);
    if (!tournament) return apiError(res, 404, "NOT_FOUND", `Campeonato ${id} não encontrado.`);

    const [phases, teams] = await Promise.all([
      getTournamentPhases(id),
      getTeamsByTournament(id),
    ]);

    return res.json({
      data: {
        id: tournament.id,
        name: tournament.name,
        slug: tournament.slug,
        logoUrl: tournament.logoUrl,
        status: tournament.status,
        country: tournament.country,
        season: tournament.season,
        format: tournament.format,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        phases: phases.map((p) => ({
          key: p.key,
          label: p.label,
          order: p.order,
          isKnockout: p.isKnockout,
          enabled: p.enabled,
        })),
        teams: teams.map((t) => ({
          id: t.id,
          name: t.name,
          code: t.code,
          flagUrl: t.flagUrl,
          groupName: t.groupName,
        })),
      },
    });
  } catch (err) {
    console.error("[API v1] GET /tournaments/:id error:", err);
    return apiError(res, 500, "INTERNAL_ERROR", "Erro ao buscar campeonato.");
  }
});

// ─── POST /api/v1/pools ───────────────────────────────────────────────────────
/**
 * @openapi
 * /api/v1/pools:
 *   post:
 *     summary: Criar um novo bolão
 *     tags: [Bolões]
 *     security:
 *       - ApiKeyAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, tournamentId]
 *             properties:
 *               name:
 *                 type: string
 *                 example: "Bolão da Empresa - Copa 2026"
 *               slug:
 *                 type: string
 *                 example: "bolao-empresa-copa-2026"
 *               tournamentId:
 *                 type: integer
 *                 example: 3
 *               accessType:
 *                 type: string
 *                 enum: [public, private_link]
 *                 default: private_link
 *               description:
 *                 type: string
 *               invitePermission:
 *                 type: string
 *                 enum: [organizer_only, all_members]
 *                 default: organizer_only
 */
router.post("/pools", requireApiKey("pools:write"), async (req, res) => {
  const { name, slug, tournamentId, accessType, description, invitePermission } = req.body ?? {};

  if (!name || typeof name !== "string" || name.trim().length < 3) {
    return apiError(res, 400, "VALIDATION_ERROR", "Campo 'name' obrigatório (mín. 3 caracteres).");
  }
  if (!tournamentId || typeof tournamentId !== "number") {
    return apiError(res, 400, "VALIDATION_ERROR", "Campo 'tournamentId' obrigatório (integer).");
  }

  const ownerId = req.apiKey!.createdBy;

  try {
    // Verificar limite de plano
    const canCreate = await canCreatePool(ownerId);
    if (!canCreate.allowed) {
      return apiError(res, 422, "UNPROCESSABLE", canCreate.reason ?? "Limite de bolões atingido.");
    }

    // Verificar se campeonato existe
    const tournament = await getTournamentById(tournamentId);
    if (!tournament) {
      return apiError(res, 404, "NOT_FOUND", `Campeonato ${tournamentId} não encontrado.`);
    }

    // Gerar slug único
    const baseSlug = slug ? slugify(slug) : slugify(name);
    const finalSlug = `${baseSlug}-${nanoid(6).toLowerCase()}`;

    // Gerar convite
    const inviteCode = nanoid(8).toUpperCase();
    const inviteToken = nanoid(32);

    const poolId = await createPool({
      name: name.trim(),
      slug: finalSlug,
      tournamentId,
      ownerId,
      accessType: accessType === "public" ? "public" : "private_link",
      description: description ?? null,
      invitePermission: invitePermission === "all_members" ? "all_members" : "organizer_only",
      inviteCode,
      inviteToken,
      status: "active",
    });

    const baseUrl = req.headers.origin ?? `https://plakr.io`;

    return res.status(201).json({
      data: {
        id: poolId,
        slug: finalSlug,
        name: name.trim(),
        inviteCode,
        inviteToken,
        inviteUrl: `${baseUrl}/boloes/${finalSlug}?invite=${inviteToken}`,
        status: "active",
        createdAt: new Date().toISOString(),
      },
    });
  } catch (err: any) {
    if (err?.code === "ER_DUP_ENTRY") {
      return apiError(res, 409, "CONFLICT", "Slug já existe. Escolha outro nome ou slug.");
    }
    console.error("[API v1] POST /pools error:", err);
    return apiError(res, 500, "INTERNAL_ERROR", "Erro ao criar bolão.");
  }
});

// ─── GET /api/v1/pools/:slug ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/v1/pools/{slug}:
 *   get:
 *     summary: Detalhar um bolão pelo slug
 *     tags: [Bolões]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: slug
 *         required: true
 *         schema:
 *           type: string
 */
router.get("/pools/:slug", requireApiKey("pools:read"), async (req, res) => {
  const { slug } = req.params;
  if (!slug) return apiError(res, 400, "VALIDATION_ERROR", "Slug inválido.");

  try {
    const pool = await getPoolBySlug(slug);
    if (!pool) return apiError(res, 404, "NOT_FOUND", `Bolão '${slug}' não encontrado.`);

    const baseUrl = req.headers.origin ?? `https://plakr.io`;

    return res.json({
      data: {
        id: pool.id,
        slug: pool.slug,
        name: pool.name,
        description: pool.description,
        logoUrl: pool.logoUrl,
        accessType: pool.accessType,
        status: pool.status,
        inviteCode: pool.inviteCode,
        inviteUrl: pool.inviteToken
          ? `${baseUrl}/boloes/${pool.slug}?invite=${pool.inviteToken}`
          : null,
        tournamentId: pool.tournamentId,
        ownerId: pool.ownerId,
        createdAt: pool.createdAt,
        updatedAt: pool.updatedAt,
      },
    });
  } catch (err) {
    console.error("[API v1] GET /pools/:slug error:", err);
    return apiError(res, 500, "INTERNAL_ERROR", "Erro ao buscar bolão.");
  }
});

// ─── PUT /api/v1/games/:id/result ─────────────────────────────────────────────
/**
 * @openapi
 * /api/v1/games/{id}/result:
 *   put:
 *     summary: Lançar ou atualizar o resultado de um jogo
 *     tags: [Resultados]
 *     security:
 *       - ApiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [scoreA, scoreB]
 *             properties:
 *               scoreA:
 *                 type: integer
 *                 minimum: 0
 *                 example: 3
 *               scoreB:
 *                 type: integer
 *                 minimum: 0
 *                 example: 1
 */
router.put("/games/:id/result", requireApiKey("results:write"), async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return apiError(res, 400, "VALIDATION_ERROR", "ID de jogo inválido.");

  const { scoreA, scoreB } = req.body ?? {};

  if (typeof scoreA !== "number" || scoreA < 0 || !Number.isInteger(scoreA)) {
    return apiError(res, 400, "VALIDATION_ERROR", "Campo 'scoreA' obrigatório (integer ≥ 0).");
  }
  if (typeof scoreB !== "number" || scoreB < 0 || !Number.isInteger(scoreB)) {
    return apiError(res, 400, "VALIDATION_ERROR", "Campo 'scoreB' obrigatório (integer ≥ 0).");
  }

  try {
    const game = await getGameById(id);
    if (!game) return apiError(res, 404, "NOT_FOUND", `Jogo ${id} não encontrado.`);

    if (game.status === "cancelled") {
      return apiError(res, 422, "UNPROCESSABLE", "Não é possível lançar resultado de jogo cancelado.");
    }

    // Atualizar resultado no banco
    await updateGameResult(id, scoreA, scoreB, false);

    // Recalcular pontuação de todos os bolões que têm palpites neste jogo
    const allBets = await getBetsByGameAllPools(id);
    const affectedPoolsSet = new Set(allBets.map((b) => b.poolId));
    const affectedPools = Array.from(affectedPoolsSet);
    const defaultSettings = await getPlatformSettings();

    for (const poolId of affectedPools) {
      const rulesRow = await getPoolScoringRules(poolId);
      const effectiveRules = buildEffectiveRules(rulesRow, defaultSettings);
      const poolBets = allBets.filter((b) => b.poolId === poolId);
      const zebraCtx = calculateZebraContext(poolBets, scoreA, scoreB);
      const affectedUsersSet = new Set<number>();

      for (const bet of poolBets) {
        const breakdown = calculateBetScore(
          bet.predictedScoreA,
          bet.predictedScoreB,
          scoreA,
          scoreB,
          effectiveRules,
          zebraCtx
        );
        await updateBetScore(bet.id, {
          pointsEarned: breakdown.total,
          pointsExactScore: breakdown.pointsExactScore,
          pointsCorrectResult: breakdown.pointsCorrectResult,
          pointsTotalGoals: breakdown.pointsTotalGoals,
          pointsGoalDiff: breakdown.pointsGoalDiff,
          pointsZebra: breakdown.pointsZebra,
          resultType: breakdown.resultType,
        });
        affectedUsersSet.add(bet.userId);
      }

      for (const userId of Array.from(affectedUsersSet)) {
        await recalculateMemberStats(poolId, userId);
      }
    }

    return res.json({
      data: {
        gameId: id,
        scoreA,
        scoreB,
        status: "finished",
        pointsRecalculated: true,
        affectedBets: allBets.length,
        affectedPools: affectedPools.length,
      },
    });
  } catch (err) {
    console.error("[API v1] PUT /games/:id/result error:", err);
    return apiError(res, 500, "INTERNAL_ERROR", "Erro ao lançar resultado.");
  }
});

export default router;
