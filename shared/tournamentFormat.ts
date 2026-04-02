/**
 * Plakr! — Utilitário de Inferência de Formato de Torneio
 *
 * Determina o formato correto de um torneio com base nos rounds disponíveis
 * na API-Football. Esta é a fonte única de verdade para o campo `format`
 * da tabela `tournaments`.
 *
 * Formatos possíveis:
 *  - "league"           → Pontos corridos puro (Brasileirão, Premier League)
 *  - "cup"              → Mata-mata puro sem fase de grupos (Copa do Brasil)
 *  - "groups_knockout"  → Fase de grupos + eliminatórias (Libertadores, Copa do Mundo)
 *  - "custom"           → Torneio manual criado pelo organizador
 *
 * Estratégia de detecção (em ordem de prioridade):
 *  1. Lista de IDs conhecidos (overrides explícitos para ligas ambíguas)
 *  2. Análise dos rounds disponíveis na API
 *  3. Fallback conservador: "league"
 */

// ─── IDs conhecidos com formato explícito ─────────────────────────────────────
// Usado quando a API ainda não publicou todos os rounds (ex: torneio futuro)
// ou quando os rounds são ambíguos.
//
// Formato: { [leagueId]: "league" | "cup" | "groups_knockout" }
// Fonte: https://www.api-football.com/documentation-v3#tag/Leagues
export const KNOWN_LEAGUE_FORMATS: Record<number, "league" | "cup" | "groups_knockout"> = {
  // ── Copa do Mundo / Seleções ──────────────────────────────────────────────
  1:    "groups_knockout", // World Cup
  4:    "groups_knockout", // Euro Championship
  9:    "groups_knockout", // Copa América
  10:   "groups_knockout", // AFC Asian Cup
  29:   "groups_knockout", // Africa Cup of Nations
  30:   "groups_knockout", // Gold Cup (CONCACAF)
  34:   "groups_knockout", // FIFA Club World Cup
  531:  "groups_knockout", // UEFA Nations League
  667:  "groups_knockout", // Olympic Games (Men)
  668:  "groups_knockout", // Olympic Games (Women)

  // ── Clubes — Internacionais ───────────────────────────────────────────────
  2:    "groups_knockout", // UEFA Champions League
  3:    "groups_knockout", // UEFA Europa League
  848:  "groups_knockout", // UEFA Conference League
  11:   "groups_knockout", // CONMEBOL Sudamericana
  13:   "groups_knockout", // CONMEBOL Libertadores
  21:   "groups_knockout", // AFC Champions League
  20:   "groups_knockout", // CAF Champions League

  // ── Copa do Brasil e copas nacionais (mata-mata puro) ─────────────────────
  73:   "cup",             // Copa do Brasil
  66:   "cup",             // FA Cup (England)
  137:  "cup",             // Coppa Italia
  143:  "cup",             // Copa del Rey (Spain)
  160:  "cup",             // DFB Pokal (Germany)
  65:   "cup",             // EFL Cup (England)
  526:  "cup",             // Supercopa de España
  529:  "cup",             // Supercopa de Italia
  556:  "cup",             // UEFA Su  // ── Ligas de pontos corridos (Brasil) ───────────────────────────────────────────────
  71:   "league",          // Série A
  72:   "league",          // Série B
  75:   "league",          // Série C
  76:   "league",          // Série D
  1223: "league",          // Copa Norte (liga regional)
  1224: "groups_knockout", // Copa Sul-Sudeste
  1225: "groups_knockout", // Copa Centro-Oeste

  // ── Campeonatos Estaduais Brasileiros ──────────────────────────────────────────
  // Formato: grupos + mata-mata (fase de grupos + semifinais + final)
  74:   "groups_knockout", // Campeonato Paulista (São Paulo)
  77:   "groups_knockout", // Campeonato Gaúcho (Rio Grande do Sul)
  79:   "groups_knockout", // Campeonato Carioca (Rio de Janeiro)
  80:   "groups_knockout", // Campeonato Mineiro (Minas Gerais)
  81:   "groups_knockout", // Campeonato Baiano (Bahia)
  82:   "groups_knockout", // Campeonato Paranaense (Paraná)
  83:   "groups_knockout", // Campeonato Pernambucano (Pernambuco)
  84:   "groups_knockout", // Campeonato Cearense (Ceará)
  85:   "groups_knockout", // Campeonato Goiano (Goiás)
  86:   "groups_knockout", // Campeonato Catarinense (Santa Catarina)
  87:   "groups_knockout", // Campeonato Capixaba (Espírito Santo)
  475:  "groups_knockout", // Campeonato Alagoano (Alagoas)
  476:  "groups_knockout", // Campeonato Amazonense (Amazonas)
  477:  "groups_knockout", // Campeonato Maranhense (Maranhão)
  478:  "groups_knockout", // Campeonato Mato-Grossense (Mato Grosso)
  479:  "groups_knockout", // Campeonato Mato-Grossense do Sul
  480:  "groups_knockout", // Campeonato Paraibano (Paraíba)
  481:  "groups_knockout", // Campeonato Paraense (Pará)
  482:  "groups_knockout", // Campeonato Piauiense (Piauí)
  483:  "groups_knockout", // Campeonato Potiguar (Rio Grande do Norte)
  484:  "groups_knockout", // Campeonato Rondoniense (Rondônia)
  485:  "groups_knockout", // Campeonato Sergipano (Sergipe)
  486:  "groups_knockout", // Campeonato Tocantinense (Tocantins)
  487:  "groups_knockout", // Campeonato Acreano (Acre)
  488:  "groups_knockout", // Campeonato Amapaense (Amapá)
  489:  "groups_knockout", // Campeonato Roraimense (Roraima)
  // ── Ligas de pontos corridos (Internacionais) ─────────────────────────────
  39:   "league",          // Premier League
  140:  "league",          // La Liga
  78:   "league",          // Bundesliga
  135:  "league",          // Serie A (Italy)
  61:   "league",          // Ligue 1
  94:   "league",          // Primeira Liga (Portugal)
  88:   "league",          // Eredivisie
  103:  "league",          // Eliteserien (Norway)
  113:  "league",          // Allsvenskan (Sweden)
  119:  "league",          // Superliga (Denmark)
  144:  "league",          // Jupiler Pro League (Belgium)
  197:  "league",          // Super League (Greece)
  203:  "league",          // Süper Lig (Turkey)
  235:  "league",          // Russian Premier League
  262:  "league",          // Liga MX
  253:  "league",          // MLS
};

// ─── Rounds que indicam fase de grupos ────────────────────────────────────────
const GROUP_STAGE_PATTERNS = [
  /^group stage/i,
  /^group [a-z]$/i,
  /^fase de grupos/i,
];

// ─── Rounds que indicam mata-mata ─────────────────────────────────────────────
const KNOCKOUT_PATTERNS = [
  /round of 32/i,
  /last 32/i,
  /round of 16/i,
  /last 16/i,
  /quarter.?final/i,
  /semi.?final/i,
  /\bfinal\b/i,
  /^knockout/i,
  /1\/256.?final/i,
  /1\/128.?final/i,
  /1\/64.?final/i,
  /1\/32.?final/i,
  /1\/16.?final/i,
  /round of 64/i,
  /round of 128/i,
];

// ─── Rounds que indicam liga de pontos corridos ───────────────────────────────
const REGULAR_SEASON_PATTERNS = [
  /^regular season/i,
  /^matchday/i,
  /^jornada/i,
  /^rodada/i,
  /^week/i,
];

/**
 * Verifica se um round corresponde a uma fase de grupos.
 */
function isGroupStageRound(round: string): boolean {
  return GROUP_STAGE_PATTERNS.some(p => p.test(round));
}

/**
 * Verifica se um round corresponde a uma fase eliminatória.
 */
function isKnockoutRound(round: string): boolean {
  return KNOCKOUT_PATTERNS.some(p => p.test(round));
}

/**
 * Verifica se um round corresponde a uma temporada regular.
 */
function isRegularSeasonRound(round: string): boolean {
  return REGULAR_SEASON_PATTERNS.some(p => p.test(round));
}

/**
 * Infere o formato de um torneio com base nos rounds disponíveis.
 *
 * @param rounds - Lista de rounds retornados pela API-Football
 * @param leagueId - ID da liga na API-Football (opcional, para usar overrides conhecidos)
 * @returns O formato inferido do torneio
 */
export function inferTournamentFormat(
  rounds: string[],
  leagueId?: number
): "league" | "cup" | "groups_knockout" {
  // 1. Override explícito por ID de liga conhecida
  if (leagueId !== undefined && KNOWN_LEAGUE_FORMATS[leagueId]) {
    return KNOWN_LEAGUE_FORMATS[leagueId];
  }

  // 2. Análise dos rounds disponíveis
  const hasGroupStage = rounds.some(isGroupStageRound);
  const hasKnockout = rounds.some(isKnockoutRound);
  const hasRegularSeason = rounds.some(isRegularSeasonRound);

  // Grupos + eliminatórias = groups_knockout
  if (hasGroupStage && hasKnockout) return "groups_knockout";

  // Só eliminatórias = cup
  if (hasKnockout && !hasGroupStage && !hasRegularSeason) return "cup";

  // Só fase de grupos (sem mata-mata ainda publicado) — heurística:
  // Se tem "Group Stage" mas sem mata-mata, provavelmente é groups_knockout
  // (a API ainda não publicou os rounds eliminatórios)
  // Marcamos como groups_knockout para garantir funcionalidade de duelos de fases previstas
  if (hasGroupStage && !hasKnockout) return "groups_knockout";

  // Temporada regular = league
  if (hasRegularSeason) return "league";

  // 3. Fallback conservador
  return "league";
}

/**
 * Infere o formato de um torneio a partir dos jogos já importados no banco.
 * Usado para recalcular torneios existentes sem consultar a API.
 *
 * @param phases - Lista de fases (phase) dos jogos do torneio
 * @param leagueId - ID da liga na API-Football (opcional)
 */
export function inferTournamentFormatFromPhases(
  phases: string[],
  leagueId?: number
): "league" | "cup" | "groups_knockout" {
  // 1. Override explícito por ID de liga conhecida
  if (leagueId !== undefined && KNOWN_LEAGUE_FORMATS[leagueId]) {
    return KNOWN_LEAGUE_FORMATS[leagueId];
  }

  const knockoutPhases = ["round_of_32", "round_of_16", "quarter_finals", "semi_finals", "final"];
  const groupPhases = ["group_stage", "1st_phase", "2nd_phase", "3rd_phase"];
  const regularPhases = ["regular_season", "apertura", "clausura"];

  const hasGroupPhase = phases.some(p => groupPhases.includes(p));
  const hasKnockout = phases.some(p => knockoutPhases.includes(p));
  const hasRegular = phases.some(p => regularPhases.includes(p));

  if (hasGroupPhase && hasKnockout) return "groups_knockout";
  if (hasKnockout && !hasGroupPhase && !hasRegular) return "cup";
  if (hasGroupPhase && !hasKnockout) return "groups_knockout";
  if (hasRegular) return "league";

  return "league";
}
