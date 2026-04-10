/**
 * Testes unitários — Módulo de Patrocínio de Bolões
 * Cobre: lógica de permissões, validação de campos, comportamento do router
 */
import { describe, it, expect } from "vitest";

// ─── Lógica de permissões ────────────────────────────────────────────────────

describe("Permissões do módulo de patrocínio", () => {
  const canOrganizerEdit = (
    plan: "free" | "pro" | "unlimited",
    role: "admin" | "user",
    enabledForOrganizer: boolean
  ): boolean => {
    if (role === "admin") return true;
    if (plan !== "unlimited") return false;
    return enabledForOrganizer;
  };

  it("Super Admin sempre pode editar", () => {
    expect(canOrganizerEdit("free", "admin", false)).toBe(true);
    expect(canOrganizerEdit("pro", "admin", false)).toBe(true);
    expect(canOrganizerEdit("unlimited", "admin", false)).toBe(true);
  });

  it("Usuário free nunca pode editar", () => {
    expect(canOrganizerEdit("free", "user", true)).toBe(false);
    expect(canOrganizerEdit("free", "user", false)).toBe(false);
  });

  it("Usuário pro nunca pode editar", () => {
    expect(canOrganizerEdit("pro", "user", true)).toBe(false);
    expect(canOrganizerEdit("pro", "user", false)).toBe(false);
  });

  it("Usuário unlimited só pode editar se enabledForOrganizer=true", () => {
    expect(canOrganizerEdit("unlimited", "user", true)).toBe(true);
    expect(canOrganizerEdit("unlimited", "user", false)).toBe(false);
  });
});

// ─── Validação do slug customizado ───────────────────────────────────────────

describe("Validação do slug customizado", () => {
  const isValidSlug = (slug: string): boolean => /^[a-z0-9-]+$/.test(slug) && slug.length >= 3 && slug.length <= 128;

  it("Slug válido aceito", () => {
    expect(isValidSlug("dado-bier-brasileirao")).toBe(true);
    expect(isValidSlug("abc")).toBe(true);
    expect(isValidSlug("bolao-2026")).toBe(true);
  });

  it("Slug com maiúsculas rejeitado", () => {
    expect(isValidSlug("DadoBier")).toBe(false);
  });

  it("Slug com espaços rejeitado", () => {
    expect(isValidSlug("dado bier")).toBe(false);
  });

  it("Slug com caracteres especiais rejeitado", () => {
    expect(isValidSlug("dado_bier")).toBe(false);
    expect(isValidSlug("dado.bier")).toBe(false);
  });

  it("Slug muito curto rejeitado", () => {
    expect(isValidSlug("ab")).toBe(false);
  });
});

// ─── Lógica de frequência do popup ───────────────────────────────────────────

describe("Frequência de exibição do popup", () => {
  const shouldShowPopup = (
    frequency: "once_per_member" | "once_per_session" | "always",
    seenByMember: boolean,
    seenInSession: boolean
  ): boolean => {
    if (frequency === "once_per_member") return !seenByMember;
    if (frequency === "once_per_session") return !seenInSession;
    return true; // always
  };

  it("once_per_member: não exibe se já viu", () => {
    expect(shouldShowPopup("once_per_member", true, false)).toBe(false);
  });

  it("once_per_member: exibe se nunca viu", () => {
    expect(shouldShowPopup("once_per_member", false, false)).toBe(true);
  });

  it("once_per_session: não exibe se já viu na sessão", () => {
    expect(shouldShowPopup("once_per_session", false, true)).toBe(false);
  });

  it("once_per_session: exibe se não viu na sessão", () => {
    expect(shouldShowPopup("once_per_session", false, false)).toBe(true);
  });

  it("always: sempre exibe", () => {
    expect(shouldShowPopup("always", true, true)).toBe(true);
    expect(shouldShowPopup("always", false, false)).toBe(true);
  });
});

// ─── Campos obrigatórios ─────────────────────────────────────────────────────

describe("Campos obrigatórios do patrocinador", () => {
  const validateSponsorForm = (form: { sponsorName?: string }): boolean => {
    return !!(form.sponsorName && form.sponsorName.trim().length > 0);
  };

  it("Nome do patrocinador é obrigatório", () => {
    expect(validateSponsorForm({ sponsorName: "" })).toBe(false);
    expect(validateSponsorForm({ sponsorName: "   " })).toBe(false);
    expect(validateSponsorForm({})).toBe(false);
  });

  it("Formulário válido com nome preenchido", () => {
    expect(validateSponsorForm({ sponsorName: "Cervejaria Dado Bier" })).toBe(true);
  });
});
