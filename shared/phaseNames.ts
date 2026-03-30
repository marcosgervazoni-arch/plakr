/**
 * Plakr! — Utilitário compartilhado de nomes amigáveis de fase
 *
 * Mapa canônico de chaves de fase (usadas internamente no banco) para
 * nomes legíveis em português, exibidos na UI para os usuários.
 *
 * Usado em:
 *  - server/api-football/sync.ts  (criação automática de tournament_phases)
 *  - server/routers/integrations.ts  (painel de seleção de fases)
 *  - client/src/pages/PoolPage.tsx  (cabeçalhos de grupo de jogos)
 *  - client/src/pages/admin/AdminTournamentDetail.tsx  (gestão de fases)
 */

export const PHASE_NAME_MAP: Record<string, string> = {
  // Fases numeradas (campeonatos com múltiplas fases de grupos)
  "1st_phase":       "1ª Fase",
  "2nd_phase":       "2ª Fase",
  "3rd_phase":       "3ª Fase",

  // Fase de grupos genérica
  "group_stage":     "Fase de Grupos",

  // Temporadas regulares
  "regular_season":  "Temporada Regular",
  "apertura":        "Apertura",
  "clausura":        "Clausura",

  // Mata-mata
  "round_of_16":     "Oitavas de Final",
  "quarter_finals":  "Quartas de Final",
  "semi_finals":     "Semifinais",
  "third_place":     "3º Lugar",
  "final":           "Final",
};

/**
 * Retorna o nome legível de uma chave de fase.
 * Se a chave não for reconhecida, retorna a própria chave formatada.
 */
export function getPhaseLabel(phaseKey: string): string {
  if (PHASE_NAME_MAP[phaseKey]) return PHASE_NAME_MAP[phaseKey];
  // Fallback: formatar a chave como título legível
  return phaseKey
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Ordem canônica das fases para exibição e ordenação.
 * Fases não listadas recebem ordem 999.
 */
export const PHASE_ORDER: Record<string, number> = {
  "1st_phase":      1,
  "2nd_phase":      2,
  "3rd_phase":      3,
  "group_stage":    4,
  "regular_season": 5,
  "apertura":       6,
  "clausura":       7,
  "round_of_16":    8,
  "quarter_finals": 9,
  "semi_finals":    10,
  "third_place":    11,
  "final":          12,
};

/**
 * Retorna a ordem canônica de uma chave de fase.
 */
export function getPhaseOrder(phaseKey: string): number {
  return PHASE_ORDER[phaseKey] ?? 999;
}

/**
 * Indica se uma fase é eliminatória (mata-mata).
 */
export function isKnockoutPhase(phaseKey: string): boolean {
  return ["round_of_16", "quarter_finals", "semi_finals", "third_place", "final"].includes(phaseKey);
}
