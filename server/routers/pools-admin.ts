/**
 * Plakr! — Sub-router: Bolões (Admin)
 * Procedures: adminList, adminUpdatePool, adminCreate
 */
import { z } from "zod";
import {
  addPoolMember,
  createAdminLog,
  createPool,
  getPlatformSettings,
  upsertPoolScoringRules,
} from "../db";
import { adminProcedure, router } from "../_core/trpc";
import { Err } from "../errors";
import { nanoid } from "nanoid";

export const poolsAdminRouter = router({
  // Admin: listar todos os bolões
  adminList: adminProcedure
    .input(z.object({ limit: z.number().default(100) }))
    .query(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) return [];
      const { pools: poolsTable, userPlans } = await import("../../drizzle/schema");
      const { desc, sql, eq } = await import("drizzle-orm");
      const rows = await db
        .select({
          id: poolsTable.id,
          name: poolsTable.name,
          slug: poolsTable.slug,
          status: poolsTable.status,
          accessType: poolsTable.accessType,
          logoUrl: poolsTable.logoUrl,
          createdAt: poolsTable.createdAt,
          ownerId: poolsTable.ownerId,
          tournamentId: poolsTable.tournamentId,
          description: poolsTable.description,
          memberCount: sql<number>`(SELECT COUNT(*) FROM pool_members pm WHERE pm.\`poolId\` = pools.id AND pm.\`isBlocked\` = 0 AND (pm.\`memberStatus\` IS NULL OR pm.\`memberStatus\` = 'active'))`,
          ownerPlan: userPlans.plan,
        })
        .from(poolsTable)
        .leftJoin(userPlans, eq(userPlans.userId, poolsTable.ownerId))
        .orderBy(desc(poolsTable.createdAt))
        .limit(input.limit);
      return rows.map(r => ({ ...r, memberCount: Number(r.memberCount), ownerPlan: r.ownerPlan ?? "free" }));
    }),

  adminUpdatePool: adminProcedure
    .input(z.object({
      poolId: z.number(),
      status: z.enum(["active", "finished", "deleted"]).optional(),
      accessType: z.enum(["public", "private_link"]).optional(),
      name: z.string().min(3).max(100).optional(),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw Err.internal();
      const { pools: poolsTable } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      const updates: Record<string, unknown> = {};
      if (input.status !== undefined) updates.status = input.status;
      if (input.accessType !== undefined) updates.accessType = input.accessType;
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      await db.update(poolsTable).set(updates).where(eq(poolsTable.id, input.poolId));
      await createAdminLog(ctx.user.id, "update_pool", "pool", input.poolId, updates);
      return { success: true };
    }),

  adminCreate: adminProcedure
    .input(z.object({
      name: z.string().min(3).max(100),
      tournamentId: z.number(),
      accessType: z.enum(["public", "private_link"]).default("public"),
      invitePermission: z.enum(["organizer_only", "all_members"]).default("organizer_only"),
      description: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const slug = `${input.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${nanoid(6)}`;
      const inviteToken = nanoid(32);
      const inviteCode = nanoid(8).toUpperCase();
      const poolId = await createPool({
        name: input.name,
        tournamentId: input.tournamentId,
        accessType: input.accessType,
        description: input.description,
        slug,
        inviteToken,
        inviteCode,
        ownerId: ctx.user.id,
      });
      await addPoolMember(poolId, ctx.user.id, "organizer");
      // Congela os defaults vigentes da plataforma no momento da criação
      // Admin tem acesso Pro completo, mas não customiza regras nesta tela
      const settings = await getPlatformSettings();
      await upsertPoolScoringRules(poolId, {
        exactScorePoints:       settings?.defaultScoringExact          ?? 10,
        correctResultPoints:    settings?.defaultScoringCorrect         ?? 5,
        totalGoalsPoints:       settings?.defaultScoringBonusGoals      ?? 3,
        goalDiffPoints:         settings?.defaultScoringBonusDiff       ?? 3,
        oneTeamGoalsPoints:     (settings as any)?.defaultScoringBonusOneTeam    ?? 2,
        landslidePoints:        (settings as any)?.defaultScoringBonusLandslide  ?? 5,
        landslideMinDiff:       (settings as any)?.defaultLandslideMinDiff        ?? 4,
        zebraPoints:            settings?.defaultScoringBonusUpset      ?? 1,
        zebraThreshold:         (settings as any)?.defaultZebraThreshold          ?? 75,
        bettingDeadlineMinutes: 60,
      }, ctx.user.id);
      await createAdminLog(ctx.user.id, "admin_create_pool", "pool", poolId, { name: input.name });
      return { poolId, slug, inviteToken };
    }),
});
