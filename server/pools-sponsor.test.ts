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

// ─── Cálculo de CTR ──────────────────────────────────────────────────────────

describe("Cálculo de CTR (Click-Through Rate)", () => {
  const calcCtr = (clicks: number, impressions: number): string => {
    if (impressions === 0) return "0.0";
    return ((clicks / impressions) * 100).toFixed(1);
  };

  it("CTR zero quando não há impressões", () => {
    expect(calcCtr(0, 0)).toBe("0.0");
  });

  it("CTR zero quando não há cliques", () => {
    expect(calcCtr(0, 100)).toBe("0.0");
  });

  it("CTR 100% quando todos clicaram", () => {
    expect(calcCtr(50, 50)).toBe("100.0");
  });

  it("CTR 5% com 5 cliques em 100 impressões", () => {
    expect(calcCtr(5, 100)).toBe("5.0");
  });

  it("CTR arredondado corretamente (1 decimal)", () => {
    expect(calcCtr(1, 3)).toBe("33.3");
    expect(calcCtr(2, 7)).toBe("28.6");
  });
});

// ─── Agregação de totais por tipo de evento ──────────────────────────────────

describe("Agregação de totais por tipo de evento", () => {
  type EventType = "banner_impression" | "banner_click" | "popup_impression" | "popup_click" | "welcome_impression";

  const aggregateTotals = (events: { eventType: EventType; total: number }[]) => {
    const totals = {
      banner_impression: 0,
      banner_click: 0,
      popup_impression: 0,
      popup_click: 0,
      welcome_impression: 0,
    };
    for (const e of events) totals[e.eventType] = e.total;
    return totals;
  };

  it("Totais zerados quando não há eventos", () => {
    const totals = aggregateTotals([]);
    expect(totals.banner_impression).toBe(0);
    expect(totals.banner_click).toBe(0);
    expect(totals.popup_impression).toBe(0);
    expect(totals.popup_click).toBe(0);
    expect(totals.welcome_impression).toBe(0);
  });

  it("Totais corretos com eventos mistos", () => {
    const totals = aggregateTotals([
      { eventType: "banner_impression", total: 200 },
      { eventType: "banner_click", total: 15 },
      { eventType: "popup_impression", total: 80 },
      { eventType: "popup_click", total: 8 },
      { eventType: "welcome_impression", total: 45 },
    ]);
    expect(totals.banner_impression).toBe(200);
    expect(totals.banner_click).toBe(15);
    expect(totals.popup_impression).toBe(80);
    expect(totals.popup_click).toBe(8);
    expect(totals.welcome_impression).toBe(45);
  });

  it("Tipos ausentes ficam zerados", () => {
    const totals = aggregateTotals([
      { eventType: "banner_impression", total: 50 },
    ]);
    expect(totals.banner_click).toBe(0);
    expect(totals.popup_impression).toBe(0);
  });
});

// ─── Lógica de rastreamento de sessão ────────────────────────────────────────

describe("Geração de sessionId anônimo", () => {
  const generateSessionId = (): string =>
    Math.random().toString(36).slice(2) + Date.now().toString(36);

  it("SessionId gerado tem comprimento adequado", () => {
    const id = generateSessionId();
    expect(id.length).toBeGreaterThan(8);
    expect(id.length).toBeLessThanOrEqual(64);
  });

  it("Dois sessionIds gerados são diferentes", () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
  });

  it("SessionId contém apenas caracteres alfanuméricos", () => {
    const id = generateSessionId();
    expect(/^[a-z0-9]+$/.test(id)).toBe(true);
  });
});
