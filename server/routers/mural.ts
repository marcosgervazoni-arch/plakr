/**
 * Mural Router — Feed Social do Bolão
 *
 * Procedures:
 *  - getByPool       → feed paginado (posts + comentários + autor)
 *  - createPost      → post manual (membro autenticado)
 *  - createComment   → comentário em post
 *  - deletePost      → soft delete (autor ou organizador)
 *  - deleteComment   → soft delete (autor ou organizador)
 *  - createAutoEvent → procedure interna para eventos automáticos (sem auth de usuário)
 *  - getMembers      → lista membros do bolão para autocomplete de menções
 */

import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import logger from "../logger";
import { renderTemplate } from "../mural-templates";
import type { MuralPostType } from "../../drizzle/schema";

// ─── LIMITES ──────────────────────────────────────────────────────────────────
const MAX_POST_LENGTH = 500;
const MAX_COMMENT_LENGTH = 280;
const PAGE_SIZE = 20;

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

/** Verifica se o usuário é membro ativo do bolão e retorna o membro */
async function assertMembership(poolId: number, userId: number) {
  const db = await getDb();
  const { poolMembers } = await getSchema();
  const { eq, and, inArray } = await import("drizzle-orm");
  const member = await db
    .select()
    .from(poolMembers)
    .where(
      and(
        eq(poolMembers.poolId, poolId),
        eq(poolMembers.userId, userId),
        inArray(poolMembers.memberStatus, ["active"])
      )
    )
    .limit(1);
  if (!member.length) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Você não é membro ativo deste bolão." });
  }
  return member[0];
}

/** Resolve poolId a partir do slug do bolão */
async function getPoolBySlug(slug: string) {
  const db = await getDb();
  const { pools } = await getSchema();
  const { eq } = await import("drizzle-orm");
  const pool = await db
    .select({ id: pools.id, ownerId: pools.ownerId, name: pools.name })
    .from(pools)
    .where(eq(pools.slug, slug))
    .limit(1);
  if (!pool.length) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Bolão não encontrado." });
  }
  return pool[0];
}

/** Extrai menções @nome do conteúdo e retorna lista de usernames */
function extractMentions(content: string): string[] {
  const matches = content.match(/@([\w\u00C0-\u017F]+)/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1)))];
}

/** Persiste menções em mural_mentions */
async function saveMentions(
  postId: number | null,
  commentId: number | null,
  poolId: number,
  content: string
) {
  const db = await getDb();
  const { muralMentions, poolMembers, users } = await getSchema();
  const { eq, and, inArray } = await import("drizzle-orm");

  const names = extractMentions(content);
  if (!names.length) return;

  // Busca usuários do bolão cujo nome corresponde às menções
  const members = await db
    .select({ userId: poolMembers.userId, name: users.name })
    .from(poolMembers)
    .innerJoin(users, eq(users.id, poolMembers.userId))
    .where(
      and(
        eq(poolMembers.poolId, poolId),
        inArray(poolMembers.memberStatus, ["active"])
      )
    );

  const mentioned = members.filter((m) =>
    names.some(
      (n) => m.name?.toLowerCase().startsWith(n.toLowerCase())
    )
  );

  for (const m of mentioned) {
    await db.insert(muralMentions).values({
      postId: postId ?? undefined,
      commentId: commentId ?? undefined,
      mentionedUserId: m.userId,
    });
  }
}

// ─── ROUTER ──────────────────────────────────────────────────────────────────

export const muralRouter = router({
  /**
   * Feed paginado do Mural de um bolão.
   * Retorna posts não deletados com autor e comentários não deletados.
   * cursor = id do último post recebido (para paginação keyset).
   */
  getByPool: protectedProcedure
    .input(
      z.object({
        poolSlug: z.string(),
        cursor: z.number().optional(),
        limit: z.number().min(1).max(50).default(PAGE_SIZE),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { muralPosts, muralComments, users, pools, poolMembers } = await getSchema();
      const { eq, and, lt, desc, inArray, isNull, or } = await import("drizzle-orm");

      const pool = await getPoolBySlug(input.poolSlug);

      // Verifica se o usuário é membro ativo
      await assertMembership(pool.id, ctx.user.id);

      // Busca posts paginados (keyset por id desc)
      const where = input.cursor
        ? and(eq(muralPosts.poolId, pool.id), eq(muralPosts.isDeleted, false), lt(muralPosts.id, input.cursor))
        : and(eq(muralPosts.poolId, pool.id), eq(muralPosts.isDeleted, false));

      const posts = await db
        .select({
          id: muralPosts.id,
          type: muralPosts.type,
          content: muralPosts.content,
          eventMeta: muralPosts.eventMeta,
          createdAt: muralPosts.createdAt,
          authorId: muralPosts.authorId,
          authorName: users.name,
          authorAvatar: users.avatarUrl,
        })
        .from(muralPosts)
        .leftJoin(users, eq(users.id, muralPosts.authorId))
        .where(where)
        .orderBy(desc(muralPosts.id))
        .limit(input.limit + 1);

      const hasMore = posts.length > input.limit;
      const items = hasMore ? posts.slice(0, input.limit) : posts;
      const nextCursor = hasMore ? items[items.length - 1].id : undefined;

      // Busca comentários dos posts retornados
      const postIds = items.map((p) => p.id);
      const comments =
        postIds.length > 0
          ? await db
              .select({
                id: muralComments.id,
                postId: muralComments.postId,
                content: muralComments.content,
                createdAt: muralComments.createdAt,
                authorId: muralComments.authorId,
                authorName: users.name,
                authorAvatar: users.avatarUrl,
              })
              .from(muralComments)
              .leftJoin(users, eq(users.id, muralComments.authorId))
              .where(
                and(
                  inArray(muralComments.postId, postIds),
                  eq(muralComments.isDeleted, false)
                )
              )
              .orderBy(muralComments.createdAt)
          : [];

      // Agrupa comentários por postId
      const commentsByPost: Record<number, typeof comments> = {};
      for (const c of comments) {
        if (!commentsByPost[c.postId]) commentsByPost[c.postId] = [];
        commentsByPost[c.postId].push(c);
      }

      return {
        posts: items.map((p) => ({
          ...p,
          comments: commentsByPost[p.id] ?? [],
        })),
        nextCursor,
        hasMore,
      };
    }),

  /**
   * Cria um post manual no Mural.
   * Apenas membros ativos podem postar.
   */
  createPost: protectedProcedure
    .input(
      z.object({
        poolSlug: z.string(),
        content: z.string().min(1).max(MAX_POST_LENGTH).trim(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { muralPosts } = await getSchema();

      const pool = await getPoolBySlug(input.poolSlug);
      await assertMembership(pool.id, ctx.user.id);

      const [result] = await db.insert(muralPosts).values({
        poolId: pool.id,
        authorId: ctx.user.id,
        type: "manual",
        content: input.content,
      });

      const postId = (result as any).insertId as number;

      // Processa menções
      await saveMentions(postId, null, pool.id, input.content);

      logger.info({ postId, poolId: pool.id, userId: ctx.user.id }, "mural:post_created");

      return { id: postId };
    }),

  /**
   * Cria um comentário em um post do Mural.
   * Apenas membros ativos podem comentar.
   */
  createComment: protectedProcedure
    .input(
      z.object({
        postId: z.number().int().positive(),
        content: z.string().min(1).max(MAX_COMMENT_LENGTH).trim(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { muralComments, muralPosts } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      // Verifica se o post existe e não foi deletado
      const post = await db
        .select({ id: muralPosts.id, poolId: muralPosts.poolId })
        .from(muralPosts)
        .where(and(eq(muralPosts.id, input.postId), eq(muralPosts.isDeleted, false)))
        .limit(1);

      if (!post.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post não encontrado." });
      }

      await assertMembership(post[0].poolId, ctx.user.id);

      const [result] = await db.insert(muralComments).values({
        postId: input.postId,
        authorId: ctx.user.id,
        content: input.content,
      });

      const commentId = (result as any).insertId as number;

      // Processa menções
      await saveMentions(null, commentId, post[0].poolId, input.content);

      logger.info({ commentId, postId: input.postId, userId: ctx.user.id }, "mural:comment_created");

      return { id: commentId };
    }),

  /**
   * Soft delete de um post.
   * Permitido para: autor do post ou organizador do bolão.
   */
  deletePost: protectedProcedure
    .input(z.object({ postId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { muralPosts, pools } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      const post = await db
        .select({ id: muralPosts.id, poolId: muralPosts.poolId, authorId: muralPosts.authorId })
        .from(muralPosts)
        .where(and(eq(muralPosts.id, input.postId), eq(muralPosts.isDeleted, false)))
        .limit(1);

      if (!post.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Post não encontrado." });
      }

      const pool = await db
        .select({ ownerId: pools.ownerId })
        .from(pools)
        .where(eq(pools.id, post[0].poolId))
        .limit(1);

      const isAuthor = post[0].authorId === ctx.user.id;
      const isOrganizer = pool[0]?.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      if (!isAuthor && !isOrganizer && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para deletar este post." });
      }

      await db
        .update(muralPosts)
        .set({ isDeleted: true })
        .where(eq(muralPosts.id, input.postId));

      logger.info({ postId: input.postId, deletedBy: ctx.user.id }, "mural:post_deleted");

      return { success: true };
    }),

  /**
   * Soft delete de um comentário.
   * Permitido para: autor do comentário ou organizador do bolão.
   */
  deleteComment: protectedProcedure
    .input(z.object({ commentId: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      const { muralComments, muralPosts, pools } = await getSchema();
      const { eq, and } = await import("drizzle-orm");

      const comment = await db
        .select({
          id: muralComments.id,
          postId: muralComments.postId,
          authorId: muralComments.authorId,
        })
        .from(muralComments)
        .where(and(eq(muralComments.id, input.commentId), eq(muralComments.isDeleted, false)))
        .limit(1);

      if (!comment.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Comentário não encontrado." });
      }

      const post = await db
        .select({ poolId: muralPosts.poolId })
        .from(muralPosts)
        .where(eq(muralPosts.id, comment[0].postId))
        .limit(1);

      const pool = await db
        .select({ ownerId: pools.ownerId })
        .from(pools)
        .where(eq(pools.id, post[0].poolId))
        .limit(1);

      const isAuthor = comment[0].authorId === ctx.user.id;
      const isOrganizer = pool[0]?.ownerId === ctx.user.id;
      const isAdmin = ctx.user.role === "admin";

      if (!isAuthor && !isOrganizer && !isAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Sem permissão para deletar este comentário." });
      }

      await db
        .update(muralComments)
        .set({ isDeleted: true })
        .where(eq(muralComments.id, input.commentId));

      logger.info({ commentId: input.commentId, deletedBy: ctx.user.id }, "mural:comment_deleted");

      return { success: true };
    }),

  /**
   * Cria um evento automático no Mural.
   * Chamado internamente pelo backend (jobs, routers de ranking, x1, etc.).
   * Não requer autenticação de usuário — usa publicProcedure com validação interna.
   *
   * ATENÇÃO: Esta procedure é interna. Nunca expor diretamente ao frontend.
   * O frontend não deve chamar esta procedure diretamente.
   */
  createAutoEvent: publicProcedure
    .input(
      z.object({
        poolId: z.number().int().positive(),
        type: z.enum([
          "rank_change_first",
          "rank_change_top3",
          "rank_change_up",
          "x1_result_win",
          "x1_result_draw",
          "exact_score_single",
          "exact_score_multi",
          "match_result",
          "new_member",
          "pool_ended",
          "badge_unlocked",
          "zebra_result",
          "thrashing_result",
        ] as const),
        vars: z.record(z.string(), z.string()),
        // Token interno para validar que a chamada vem do backend
        internalToken: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      const { muralPosts } = await getSchema();

      const content = renderTemplate(input.type as MuralPostType, input.vars as Record<string, string>);
      if (!content) {
        logger.warn({ type: input.type }, "mural:auto_event_no_template");
        return { id: null, skipped: true };
      }

      const [result] = await db.insert(muralPosts).values({
        poolId: input.poolId,
        authorId: null, // eventos automáticos não têm autor
        type: input.type as MuralPostType,
        content,
        eventMeta: input.vars,
      });

      const postId = (result as any).insertId as number;

      logger.info({ postId, poolId: input.poolId, type: input.type }, "mural:auto_event_created");

      return { id: postId, skipped: false };
    }),

  /**
   * Lista membros ativos do bolão para autocomplete de menções (@nome).
   */
  getMembersForMention: protectedProcedure
    .input(z.object({ poolSlug: z.string() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      const { poolMembers, users } = await getSchema();
      const { eq, and, inArray } = await import("drizzle-orm");

      const pool = await getPoolBySlug(input.poolSlug);
      await assertMembership(pool.id, ctx.user.id);

      const members = await db
        .select({
          id: users.id,
          name: users.name,
          avatarUrl: users.avatarUrl,
        })
        .from(poolMembers)
        .innerJoin(users, eq(users.id, poolMembers.userId))
        .where(
          and(
            eq(poolMembers.poolId, pool.id),
        inArray(poolMembers.memberStatus, ["active"])
      )
    )
    .orderBy(users.name);

      return members;
    }),
});
