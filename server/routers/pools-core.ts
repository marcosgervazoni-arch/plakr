/**
 * Plakr! — Sub-router: Bolões (Core)
 * Procedures: create, getBySlug, listPublic, previewByToken, joinByToken, joinPublic,
 *             update, delete, closePool, concludePool, getBracket
 */
import { z } from "zod";
import { nanoid } from "nanoid";
import {
  addPoolMember,
  countActivePoolsByOwner,
  countPoolMembers,
  createAdminLog,
  createNotification,
  createPool,
  getGamesByTournament,
  getPoolById,
  getPoolByInviteToken,
  getPoolBySlug,
  getPoolMember,
  getPoolMembers,
  getPoolRanking,
  getPoolScoringRules,
  getTournamentById,
  getTournamentPhases,
  getUserPlan,
  getUserPlanTier,
  getPlatformSettings,
  recalculateMemberStats,
  updatePool,
  upsertPoolScoringRules,
  saveFinalPositions,
  getPredictionReliability,
} from "../db";
import { protectedProcedure, router } from "../_core/trpc";
import { Err, PoolErr } from "../errors";

export const poolsCoreRouter = router({
  // ── Criar bolão ────────────────────────────────────────────────────────────
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(3).max(100),
      tournamentId: z.number(),
      accessType: z.enum(["public", "private_link"]).default("private_link"),
      invitePermission: z.enum(["organizer_only", "all_members"]).default("organizer_only"),
      description: z.string().max(1000).optional(), // [SEC] limite de payload
      // Regras de pontuação (Pro only — validadas no servidor)
      exactScorePoints: z.number().int().min(1).max(50).optional(),
      correctResultPoints: z.number().int().min(1).max(50).optional(),
      totalGoalsPoints: z.number().int().min(0).max(20).optional(),
      goalDiffPoints: z.number().int().min(0).max(20).optional(),
      oneTeamGoalsPoints: z.number().int().min(0).max(20).optional(),
      landslidePoints: z.number().int().min(0).max(50).optional(),
      zebraPoints: z.number().int().min(0).max(20).optional(),
      zebraThreshold: z.number().int().min(51).max(99).optional(),
      landslideMinDiff: z.number().int().min(2).max(10).optional(),
      bettingDeadlineMinutes: z.number().int().min(0).max(1440).optional(),
      // Inscrição paga (Pro only)
      entryFee: z.number().min(0).max(10000).nullable().optional(),
      pixKey: z.string().max(100).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const settings = await getPlatformSettings();
      const freeMax = settings?.freeMaxPools ?? 2;
      const activeCount = await countActivePoolsByOwner(ctx.user.id);
      const { canCreatePool } = await import("../db");
      const canCreate = await canCreatePool(ctx.user.id);
      if (!canCreate.allowed) {
        throw Err.forbidden(canCreate.reason ?? `Limite de ${freeMax} bolões ativos no plano gratuito. Faça upgrade para criar mais bolões.`);
      }
      // Verificar se o usuário é Pro para features avançadas
      const userTier = await getUserPlanTier(ctx.user.id);
      const isProUser = userTier !== "free" || ctx.user.role === "admin";
      const {
        exactScorePoints, correctResultPoints, totalGoalsPoints, goalDiffPoints,
        oneTeamGoalsPoints, landslidePoints, zebraPoints, zebraThreshold,
        landslideMinDiff, bettingDeadlineMinutes, entryFee, pixKey,
        ...poolInput
      } = input;
      const slug = `${input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${nanoid(6)}`;
      const inviteToken = nanoid(32);
      const inviteCode = nanoid(8).toUpperCase();
      const poolData: any = {
        ...poolInput,
        slug,
        inviteToken,
        inviteCode,
        ownerId: ctx.user.id,
      };
      // Inscrição paga: apenas Pro
      if (isProUser && entryFee !== undefined && entryFee !== null && entryFee > 0) {
        poolData.entryFee = String(entryFee);
        if (pixKey) poolData.pixKey = pixKey;
      }
      const poolId = await createPool(poolData);
      await addPoolMember(poolId, ctx.user.id, "organizer");
      // Regras de pontuação: apenas Pro pode personalizar
      const scoringRulesData: Record<string, number> = {};
      if (isProUser) {
        if (exactScorePoints !== undefined) scoringRulesData.exactScorePoints = exactScorePoints;
        if (correctResultPoints !== undefined) scoringRulesData.correctResultPoints = correctResultPoints;
        if (totalGoalsPoints !== undefined) scoringRulesData.totalGoalsPoints = totalGoalsPoints;
        if (goalDiffPoints !== undefined) scoringRulesData.goalDiffPoints = goalDiffPoints;
        if (oneTeamGoalsPoints !== undefined) scoringRulesData.oneTeamGoalsPoints = oneTeamGoalsPoints;
        if (landslidePoints !== undefined) scoringRulesData.landslidePoints = landslidePoints;
        if (zebraPoints !== undefined) scoringRulesData.zebraPoints = zebraPoints;
        if (zebraThreshold !== undefined) scoringRulesData.zebraThreshold = zebraThreshold;
        if (landslideMinDiff !== undefined) scoringRulesData.landslideMinDiff = landslideMinDiff;
        if (bettingDeadlineMinutes !== undefined) scoringRulesData.bettingDeadlineMinutes = bettingDeadlineMinutes;
      }
      await upsertPoolScoringRules(poolId, scoringRulesData, ctx.user.id);
      // [LOG E2] Bolão criado por usuário (não admin)
      if (ctx.user.role !== "admin") {
        await createAdminLog(ctx.user.id, "pool_created", "pool", poolId, {
          name: input.name,
          accessType: input.accessType,
          tournamentId: input.tournamentId,
        }, poolId, { level: "info" });
      }
      // [Badges] Verificar badges após criar bolão (ex: Desbravador, Presida)
      import("../badges")
        .then(({ calculateAndAssignBadges }) => calculateAndAssignBadges(ctx.user.id).catch(() => {}))
        .catch(() => {});
      return { poolId, slug, inviteToken };
    }),

  // ── Buscar bolão por slug ──────────────────────────────────────────────────
  getBySlug: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .query(async ({ input, ctx }) => {
      const pool = await getPoolBySlug(input.slug);
      if (!pool) throw Err.notFound("Recurso");
      const member = await getPoolMember(pool.id, ctx.user.id);
      if (!member && ctx.user.role !== "admin") {
        throw Err.forbidden("Você não é membro deste bolão.");
      }
      // [SEC] Bloquear acesso de membros com pagamento pendente ou rejeitado
      if (member && member.memberStatus === "pending_approval") {
        throw new (await import("@trpc/server")).TRPCError({
          code: "FORBIDDEN",
          message: "Sua inscrição está aguardando aprovação do organizador. Você terá acesso ao bolão após a confirmação do pagamento.",
        });
      }
      if (member && member.memberStatus === "rejected") {
        throw new (await import("@trpc/server")).TRPCError({
          code: "FORBIDDEN",
          message: "Sua inscrição foi recusada pelo organizador. Entre em contato para mais informações.",
        });
      }
      const tournament = await getTournamentById(pool.tournamentId);
      const gameList = await getGamesByTournament(pool.tournamentId);
      const rules = await getPoolScoringRules(pool.id);
      const memberCount = await countPoolMembers(pool.id);
      const phases = await getTournamentPhases(pool.tournamentId);
      // Calcular confiabilidade das probabilidades pré-jogo para esta liga
      // stddev_cmp >= 20 indica dados suficientemente variados para exibir a barra
      const predictionReliable = tournament?.apiFootballLeagueId
        ? await getPredictionReliability(tournament.apiFootballLeagueId)
        : false;
      return { pool, tournament, games: gameList, rules, memberCount, myRole: member?.role, phases, predictionReliable };
    }),

  // ── Listar bolões públicos ─────────────────────────────────────────────────
  listPublic: protectedProcedure
    .input(z.object({
      search: z.string().optional(),
      tournamentId: z.number().optional(),
      limit: z.number().default(20),
      offset: z.number().default(0),
    }))
    .query(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return { pools: [], total: 0 };
      const { sql, eq, and, like, desc } = await import("drizzle-orm");
      const { pools: poolsTable, tournaments, users: usersTable } = await import("../../drizzle/schema");
      const conditions = [eq(poolsTable.status, "active")];
      if (input.search) conditions.push(like(poolsTable.name, `%${input.search}%`));
      if (input.tournamentId) conditions.push(eq(poolsTable.tournamentId, input.tournamentId));
      const userId = ctx.user.id;
      const rows = await db
        .select({
          pool: poolsTable,
          tournamentName: tournaments.name,
          ownerName: usersTable.name,
          memberCount: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.\`poolId\` = ${poolsTable.id} AND (pm.\`memberStatus\` IS NULL OR pm.\`memberStatus\` = 'active'))`,
          isMember: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.\`poolId\` = ${poolsTable.id} AND pm.\`userId\` = ${userId} AND (pm.\`memberStatus\` IS NULL OR pm.\`memberStatus\` = 'active'))`,
          totalGames: sql<number>`(SELECT COUNT(*) FROM games g WHERE g.\`tournamentId\` = ${poolsTable.tournamentId})`,
          finishedGames: sql<number>`(SELECT COUNT(*) FROM games g WHERE g.\`tournamentId\` = ${poolsTable.tournamentId} AND g.\`status\` = 'finished')`,
          nextMatchDate: sql<Date | null>`(SELECT MIN(g.\`matchDate\`) FROM games g WHERE g.\`tournamentId\` = ${poolsTable.tournamentId} AND g.\`status\` = 'scheduled')`,
        })
        .from(poolsTable)
        .leftJoin(tournaments, eq(poolsTable.tournamentId, tournaments.id))
        .leftJoin(usersTable, eq(poolsTable.ownerId, usersTable.id))
        .where(and(...conditions))
        .orderBy(desc(poolsTable.createdAt))
        .limit(input.limit)
        .offset(input.offset);
      return {
        pools: rows.map((r) => ({
          id: r.pool.id,
          slug: r.pool.slug,
          name: r.pool.name,
          logoUrl: r.pool.logoUrl,
          accessType: r.pool.accessType,
          description: r.pool.description ?? null,
          tournamentName: r.tournamentName ?? null,
          ownerName: r.ownerName ?? null,
          memberCount: Number(r.memberCount),
          isMember: Number(r.isMember) > 0,
          totalGames: Number(r.totalGames),
          finishedGames: Number(r.finishedGames),
          nextMatchDate: r.nextMatchDate ?? null,
        })),
        total: rows.length,
      };
    }),

  // ── Preview de bolão por token de convite (público) ───────────────────────
  previewByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const pool = await getPoolByInviteToken(input.token);
      if (!pool || pool.status !== "active") return null;
      const tournament = await getTournamentById(pool.tournamentId);
      const owner = await (await import("../db")).getUserById(pool.ownerId);
      const memberCount = await countPoolMembers(pool.id);
      return {
        slug: pool.slug,
        name: pool.name,
        logoUrl: pool.logoUrl,
        tournament: tournament ? { name: tournament.name } : null,
        memberCount,
        ownerName: owner?.name ?? null,
        entryFee: pool.entryFee ? Number(pool.entryFee) : null,
        entryQrCodeUrl: pool.entryQrCodeUrl ?? null,
        pixKey: (pool as any).pixKey ?? null,
      };
    }),

  // ── Entrar no bolão via token de convite ──────────────────────────────────
  joinByToken: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolByInviteToken(input.token);
      if (!pool) throw PoolErr.invalidInvite();
      if (pool.status !== "active") throw PoolErr.notActive();
      const existing = await getPoolMember(pool.id, ctx.user.id);
      if (existing) return { poolId: pool.id, slug: pool.slug, alreadyMember: true };
      const settings = await getPlatformSettings();
      const freeMax = settings?.freeMaxParticipants ?? 50;
      const memberCount = await countPoolMembers(pool.id);
      const { canAddMember } = await import("../db");
      const canAdd = await canAddMember(pool.id, pool.ownerId);
      if (!canAdd.allowed) {
        throw Err.forbidden(canAdd.reason ?? `Este bolão atingiu o limite de participantes do plano gratuito.`);
      }
      await addPoolMember(pool.id, ctx.user.id, "participant");
      await createNotification({
        userId: pool.ownerId,
        poolId: pool.id,
        type: "system",
        title: "Novo participante",
        message: `${ctx.user.name ?? "Um usuário"} entrou no bolão "${pool.name}".`,
      });
      // [LOG E3] Usuário entrou no bolão via token/link
      await createAdminLog(ctx.user.id, "pool_joined", "pool", pool.id, {
        poolName: pool.name, channel: "invite_link",
      }, pool.id, { level: "info" });
      // [Badges] Verificar badges após entrar em bolão (ex: Veterano, Barra Brava)
      import("../badges")
        .then(({ calculateAndAssignBadges }) => calculateAndAssignBadges(ctx.user.id).catch(() => {}))
        .catch(() => {});
      return { poolId: pool.id, slug: pool.slug, alreadyMember: false };
    }),

  // ── Entrar em bolão público ────────────────────────────────────────────────
  joinPublic: protectedProcedure
    .input(z.object({ slug: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolBySlug(input.slug);
      if (!pool) throw PoolErr.notFound();
      if (pool.status !== "active") throw PoolErr.notActive();
      if (pool.accessType !== "public") throw PoolErr.notPublic();
      const existing = await getPoolMember(pool.id, ctx.user.id);
      if (existing) return { poolId: pool.id, slug: pool.slug, alreadyMember: true };
      const settings = await getPlatformSettings();
      const freeMax = settings?.freeMaxParticipants ?? 50;
      const memberCount = await countPoolMembers(pool.id);
      const { canAddMember: canAddMemberPublic } = await import("../db");
      const canAddPublic = await canAddMemberPublic(pool.id, pool.ownerId);
      if (!canAddPublic.allowed) {
        throw Err.forbidden(canAddPublic.reason ?? `Este bolão atingiu o limite de participantes.`);
      }
      await addPoolMember(pool.id, ctx.user.id, "participant");
      await createNotification({
        userId: pool.ownerId,
        poolId: pool.id,
        type: "system",
        title: "Novo participante",
        message: `${ctx.user.name ?? "Um usuário"} entrou no bolão "${pool.name}".`,
      });
      // [LOG E3] Usuário entrou no bolão público
      await createAdminLog(ctx.user.id, "pool_joined", "pool", pool.id, {
        poolName: pool.name, channel: "public",
      }, pool.id, { level: "info" });
      // [Badges] Verificar badges após entrar em bolão público (ex: Veterano, Barra Brava)
      import("../badges")
        .then(({ calculateAndAssignBadges }) => calculateAndAssignBadges(ctx.user.id).catch(() => {}))
        .catch(() => {});
      return { poolId: pool.id, slug: pool.slug, alreadyMember: false };
    }),

  // ── Atualizar bolão ────────────────────────────────────────────────────────
  update: protectedProcedure
    .input(z.object({
      poolId: z.number(),
      name: z.string().max(100).optional(),
      description: z.string().max(1000).optional(), // [SEC] limite de payload
      logoUrl: z.string().url().max(2048).optional(), // [SEC] limite de URL
      accessType: z.enum(["public", "private_link"]).optional(),
      invitePermission: z.enum(["organizer_only", "all_members"]).optional(),
      tournamentId: z.number().optional(),
      entryFee: z.number().nullable().optional(),
      entryQrCodeUrl: z.string().url().max(2048).nullable().optional(),
      pixKey: z.string().max(100).nullable().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { poolId, entryFee, entryQrCodeUrl, pixKey, ...rest } = input;
      const member = await getPoolMember(poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw Err.forbidden();
      }
      // Validar plano Pro para taxa de inscrição
      if (entryFee !== undefined && entryFee !== null && entryFee > 0) {
        const { getUserPlanTier } = await import("../db");
        const tier = await getUserPlanTier(ctx.user.id);
        if (tier !== "pro") throw Err.forbidden("Taxa de inscrição é uma funcionalidade exclusiva do plano Pro.");
      }
      // Drizzle usa string para decimal, converter
      const data: any = { ...rest };
      if (entryFee !== undefined) data.entryFee = entryFee !== null ? String(entryFee) : null;
      if (entryQrCodeUrl !== undefined) data.entryQrCodeUrl = entryQrCodeUrl;
      if (pixKey !== undefined) data.pixKey = pixKey;
      await updatePool(poolId, data);
      return { success: true };
    }),

  // ── Excluir bolão ──────────────────────────────────────────────────────────
  delete: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { pools: poolsT, poolMembers } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const [pool] = await db.select().from(poolsT).where(eq(poolsT.id, input.poolId)).limit(1);
      if (!pool) throw PoolErr.notFound();
      const isAdmin = ctx.user.role === "admin";
      const isOwner = pool.ownerId === ctx.user.id;
      if (!isAdmin && !isOwner) throw Err.forbidden("Apenas o organizador ou um administrador pode excluir este bolão.");
      const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, input.poolId));
      for (const member of members) {
        if (member.userId === ctx.user.id) continue;
        await createNotification({ userId: member.userId, type: "system", title: "Bolão excluído",
          message: `O bolão "${pool.name}" foi excluído pelo organizador. Todos os seus palpites foram removidos.` });
      }
      await db.update(poolsT).set({ status: "deleted" }).where(eq(poolsT.id, input.poolId));
      await createAdminLog(ctx.user.id, "delete_pool", "pool", input.poolId, { name: pool.name, memberCount: members.length });
      return { success: true };
    }),

  // ── Encerrar bolão (organizador) ───────────────────────────────────────────
  closePool: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      if (!member || (member.role !== "organizer" && ctx.user.role !== "admin")) {
        throw PoolErr.organizerOnly();
      }
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      if (pool.status === "finished") throw Err.precondition("O bolão já está encerrado.");
      const ranking = await getPoolRanking(input.poolId);
      const top3 = ranking.slice(0, 3);
      await updatePool(input.poolId, { status: "finished", finishedAt: new Date() });
      // [LOG] Registrar posições finais no histórico permanente
      const tournament = await getTournamentById(pool.tournamentId);
      await saveFinalPositions(
        input.poolId,
        pool.name,
        tournament?.name ?? null,
        ranking.map((r, idx) => ({
          userId: r.user.id,
          position: idx + 1,
          totalPoints: r.stats.totalPoints,
        }))
      );
      const db = await (await import("../db")).getDb();
      if (db) {
        const { poolMembers } = await import("../../drizzle/schema");
        const { eq } = await import("drizzle-orm");
        const members = await db.select({ userId: poolMembers.userId }).from(poolMembers).where(eq(poolMembers.poolId, input.poolId));
        for (const m of members) {
          const pos = ranking.findIndex((r) => r.user.id === m.userId);
          const medal = pos === 0 ? "🥇" : pos === 1 ? "🥈" : pos === 2 ? "🥉" : "";
          await createNotification({
            userId: m.userId,
            type: "result_available",
            title: `${medal} ${pool.name} foi encerrado!`,
            message: pos >= 0 ? `Você terminou em ${pos + 1}º lugar com ${ranking[pos].stats.totalPoints} pontos.` : `O bolão "${pool.name}" foi encerrado pelo organizador.`,
            actionUrl: `/pool/${pool.slug}`,
            actionLabel: "Ver resultado final",
            priority: "high",
          });
        }
      }
      await createAdminLog(ctx.user.id, "close_pool", "pool", input.poolId, { name: pool.name, top3: top3.map((r) => ({ name: r.user.name, points: r.stats.totalPoints })) });
      return { success: true, top3 };
    }),

  // ── Confirmar encerramento do bolão (organizador ou admin) ────────────────
  concludePool: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");

      const member = await getPoolMember(input.poolId, ctx.user.id);
      const isOrganizer = member?.role === "organizer" || pool.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";
      if (!isOrganizer && !isAdmin) throw Err.forbidden();

      if (pool.status !== "awaiting_conclusion" && !isAdmin) {
        throw Err.precondition("O bolão não está aguardando confirmação de encerramento.");
      }

      const { concludePool: doConclude } = await import("../archival");
      await doConclude(input.poolId, ctx.user.id, isAdmin ? "admin" : "organizer");

      await createAdminLog(ctx.user.id, "pool.conclude", "pool", input.poolId, {
        source: isAdmin ? "admin" : "organizer",
      });

      return { success: true };
    }),

  // ── Buscar bracket/fases do torneio do bolão ──────────────────────────────
  getBracket: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const member = await getPoolMember(input.poolId, ctx.user.id);
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Recurso");
      if (!member && ctx.user.role !== "admin" && pool.accessType !== "public") {
        throw Err.forbidden();
      }
      const phases = await getTournamentPhases(pool.tournamentId);
      const games = await getGamesByTournament(pool.tournamentId);
      const phaseKeyMap = new Map<string, typeof games>();
      for (const game of games) {
        const key = game.phase ?? "group_stage";
        if (!phaseKeyMap.has(key)) phaseKeyMap.set(key, []);
        phaseKeyMap.get(key)!.push(game);
      }
      const result = phases.map((phase) => ({
        phase,
        games: (phaseKeyMap.get(phase.key) ?? []).sort((a, b) => (a.matchNumber ?? 0) - (b.matchNumber ?? 0)),
      }));
      const knownKeys = new Set(phases.map((p) => p.key));
      const orphanGames = games.filter((g) => !knownKeys.has(g.phase ?? ""));
      if (orphanGames.length > 0) {
        result.unshift({ phase: { id: 0, tournamentId: pool.tournamentId, key: "group_stage", label: "Fase de Grupos", enabled: true, order: 0, slots: null, isKnockout: false, updatedAt: new Date() }, games: orphanGames });
      }
      return result;
    }),

  // ── Onboarding checklist ────────────────────────────────────────────────────
  getOnboardingStatus: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .query(async ({ input, ctx }) => {
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Bolão");
      if (pool.ownerId !== ctx.user.id && ctx.user.role !== "admin") throw Err.forbidden();

      const dismissed = !!pool.onboardingDismissedAt;

      // Etapas derivadas dos dados do próprio pool (sem tabela extra)
      const steps = {
        appearance: !!(pool.logoUrl || pool.description),
        access: pool.accessType === "public" || !!(pool.inviteToken),
        entryFee: pool.entryFee !== null && Number(pool.entryFee) > 0,
      };

      const allDone = Object.values(steps).every(Boolean);
      return { dismissed, steps, allDone };
    }),

  dismissOnboarding: protectedProcedure
    .input(z.object({ poolId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const pool = await getPoolById(input.poolId);
      if (!pool) throw Err.notFound("Bolão");
      if (pool.ownerId !== ctx.user.id && ctx.user.role !== "admin") throw Err.forbidden();

      const { getDb } = await import("../db");
      const { pools: poolsTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const db = await getDb();
      if (!db) throw Err.internal();
      await db.update(poolsTable).set({ onboardingDismissedAt: new Date() }).where(eq(poolsTable.id, input.poolId));
      return { ok: true };
    }),
});
