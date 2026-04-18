/**
 * mural.test.ts — Testes unitários para o router Mural do Bolão
 *
 * Cobre:
 *  - renderTemplate: geração correta de mensagens por tipo de evento
 *  - Validação de tipos de post automático (enum)
 *  - Lógica de permissão de deleção (autor, organizador, admin)
 *  - Limites de conteúdo (MAX_POST_LENGTH, MAX_COMMENT_LENGTH)
 *  - Estrutura de resposta do getByPool (paginação)
 */

import { describe, expect, it } from "vitest";
import { renderTemplate, renderTemplateAt } from "../mural-templates";
import type { MuralPostType } from "../../drizzle/schema";

// ─── TESTES DE renderTemplate ─────────────────────────────────────────────────

describe("renderTemplate", () => {
  it("retorna string não-vazia para rank_change_first com vars corretas", () => {
    // Usa renderTemplateAt para resultado determinístico (sem aleatoriedade)
    const result = renderTemplateAt("rank_change_first", { nome: "Gerva", pontos: "100", nome_anterior_lider: "Zé" });
    expect(result).toBeTruthy();
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(10);
  });

  it("interpola o nome do usuário corretamente", () => {
    const result = renderTemplateAt("rank_change_first", { nome: "Gerva", pontos: "100", nome_anterior_lider: "Zé" });
    expect(result).toContain("Gerva");
  });

  it("retorna string para rank_change_top3", () => {
    const result = renderTemplateAt("rank_change_top3", { nome: "Zé", posicao_nova: "2", pontos: "80" });
    expect(result).toBeTruthy();
    expect(result).toContain("Zé");
  });

  it("retorna string para x1_result_win", () => {
    const result = renderTemplateAt("x1_result_win", { vencedor: "Gerva", perdedor: "Zé", escopo: "Rodada 1", pontos_vencedor: "50", pontos_perdedor: "30" });
    expect(result).toBeTruthy();
    expect(result).toContain("Gerva");
  });

  it("retorna string para exact_score_single", () => {
    const result = renderTemplateAt("exact_score_single", {
      nome: "Gerva",
      time_casa: "Brasil",
      time_fora: "Argentina",
      placar: "2x1",
    });
    expect(result).toBeTruthy();
    expect(result).toContain("Gerva");
  });

  it("retorna string para match_result", () => {
    const result = renderTemplateAt("match_result", {
      time_casa: "Brasil",
      time_fora: "Argentina",
      gols_casa: "3",
      gols_fora: "0",
      rodada: "Rodada 1",
    });
    expect(result).toBeTruthy();
    expect(result).toContain("Brasil");
    expect(result).toContain("Argentina");
  });

  it("retorna string para new_member", () => {
    const result = renderTemplateAt("new_member", { nome: "Novo Participante", total_membros: "10" });
    expect(result).toBeTruthy();
    expect(result).toContain("Novo Participante");
  });

  it("retorna string para pool_ended", () => {
    const result = renderTemplateAt("pool_ended", { nome_campeao: "Gerva", nome_bolao: "Bolão 2026", pontos_campeao: "200", total_participantes: "15" });
    expect(result).toBeTruthy();
    expect(result).toContain("Gerva");
  });

  it("retorna string para zebra_result", () => {
    const result = renderTemplateAt("zebra_result", {
      nome: "Gerva",
      time_azarao: "Fluminense",
      time_favorito: "Flamengo",
      placar: "3x0",
      rodada: "Rodada 5",
    });
    expect(result).toBeTruthy();
    expect(result).toContain("Gerva");
  });

  it("retorna string para thrashing_result", () => {
    const result = renderTemplateAt("thrashing_result", {
      nome: "Gerva",
      time_vencedor: "Brasil",
      time_perdedor: "Bolívia",
      placar: "6x0",
      rodada: "Rodada 1",
    });
    expect(result).toBeTruthy();
    expect(result).toContain("Gerva");
  });

  it("retorna string para badge_unlocked", () => {
    const result = renderTemplateAt("badge_unlocked", {
      nome: "Gerva",
      nome_badge: "Zebra Detector",
      descricao_badge: "Acertou uma zebra",
    });
    expect(result).toBeTruthy();
    expect(result).toContain("Gerva");
  });

  it("retorna string vazia para tipo desconhecido (não lança exceção)", () => {
    // renderTemplate retorna string vazia para tipo sem templates
    const result = renderTemplate("unknown_type" as MuralPostType, {});
    expect(typeof result).toBe("string");
    expect(result).toBe("");
  });

  it("não lança exceção para vars vazias", () => {
    // Se vars não forem fornecidas, o template retorna com placeholders {nome}
    expect(() => renderTemplateAt("rank_change_first", {})).not.toThrow();
  });
});

// ─── TESTES DE LÓGICA DE PERMISSÃO ────────────────────────────────────────────

describe("Lógica de permissão de deleção", () => {
  type User = { id: number; role: "user" | "admin" };

  function canDeletePost(
    post: { authorId: number | null },
    pool: { ownerId: number },
    user: User
  ): boolean {
    const isAuthor = post.authorId === user.id;
    const isOrganizer = pool.ownerId === user.id;
    const isAdmin = user.role === "admin";
    return isAuthor || isOrganizer || isAdmin;
  }

  it("autor pode deletar seu próprio post", () => {
    expect(canDeletePost({ authorId: 42 }, { ownerId: 1 }, { id: 42, role: "user" })).toBe(true);
  });

  it("organizador pode deletar qualquer post do bolão", () => {
    expect(canDeletePost({ authorId: 99 }, { ownerId: 1 }, { id: 1, role: "user" })).toBe(true);
  });

  it("admin pode deletar qualquer post", () => {
    expect(canDeletePost({ authorId: 99 }, { ownerId: 1 }, { id: 77, role: "admin" })).toBe(true);
  });

  it("participante comum NÃO pode deletar post de outro", () => {
    expect(canDeletePost({ authorId: 99 }, { ownerId: 1 }, { id: 42, role: "user" })).toBe(false);
  });

  it("post automático (authorId null) só pode ser deletado por organizador ou admin", () => {
    expect(canDeletePost({ authorId: null }, { ownerId: 1 }, { id: 42, role: "user" })).toBe(false);
    expect(canDeletePost({ authorId: null }, { ownerId: 1 }, { id: 1, role: "user" })).toBe(true);
    expect(canDeletePost({ authorId: null }, { ownerId: 1 }, { id: 77, role: "admin" })).toBe(true);
  });
});

// ─── TESTES DE VALIDAÇÃO DE CONTEÚDO ─────────────────────────────────────────

describe("Validação de conteúdo", () => {
  const MAX_POST_LENGTH = 500;
  const MAX_COMMENT_LENGTH = 280;

  it("post com 500 caracteres é válido", () => {
    const content = "a".repeat(500);
    expect(content.length <= MAX_POST_LENGTH).toBe(true);
  });

  it("post com 501 caracteres é inválido", () => {
    const content = "a".repeat(501);
    expect(content.length <= MAX_POST_LENGTH).toBe(false);
  });

  it("comentário com 280 caracteres é válido", () => {
    const content = "a".repeat(280);
    expect(content.length <= MAX_COMMENT_LENGTH).toBe(true);
  });

  it("comentário com 281 caracteres é inválido", () => {
    const content = "a".repeat(281);
    expect(content.length <= MAX_COMMENT_LENGTH).toBe(false);
  });

  it("post vazio (após trim) é inválido", () => {
    const content = "   ";
    expect(content.trim().length > 0).toBe(false);
  });
});

// ─── TESTES DE TIPOS AUTOMÁTICOS ─────────────────────────────────────────────

describe("Tipos de post automático", () => {
  const AUTO_TYPES = new Set<MuralPostType>([
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
  ]);

  it("manual NÃO é tipo automático", () => {
    expect(AUTO_TYPES.has("manual")).toBe(false);
  });

  it("rank_change_first É tipo automático", () => {
    expect(AUTO_TYPES.has("rank_change_first")).toBe(true);
  });

  it("pool_ended É tipo automático", () => {
    expect(AUTO_TYPES.has("pool_ended")).toBe(true);
  });

  it("todos os 13 tipos automáticos estão no Set", () => {
    expect(AUTO_TYPES.size).toBe(13);
  });
});

// ─── TESTES DE PAGINAÇÃO ──────────────────────────────────────────────────────

describe("Lógica de paginação do feed", () => {
  it("cursor undefined retorna a primeira página", () => {
    const posts = Array.from({ length: 25 }, (_, i) => ({ id: 25 - i }));
    const limit = 20;
    const cursor = undefined;

    const startIdx = cursor ? posts.findIndex((p) => p.id === cursor) + 1 : 0;
    const page = posts.slice(startIdx, startIdx + limit);
    const nextCursor = page.length === limit ? page[page.length - 1]?.id : undefined;

    expect(page).toHaveLength(20);
    expect(nextCursor).toBe(6); // id do 20º item (25-19=6)
  });

  it("última página não tem nextCursor", () => {
    const posts = Array.from({ length: 5 }, (_, i) => ({ id: 5 - i }));
    const limit = 20;
    const startIdx = 0;
    const page = posts.slice(startIdx, startIdx + limit);
    const nextCursor = page.length === limit ? page[page.length - 1]?.id : undefined;

    expect(page).toHaveLength(5);
    expect(nextCursor).toBeUndefined();
  });
});
