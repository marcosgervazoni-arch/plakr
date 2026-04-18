/**
 * Módulo de Inteligência Esportiva — Geração de textos via LLM
 *
 * Responsabilidades:
 * - generateGameSummary: resumo narrativo pós-jogo (chamado pelo syncResults)
 * - generateBetAnalysis: análise do palpite do usuário (chamado pelo syncResults)
 * - buildAiPrediction: monta o objeto aiPrediction a partir dos dados da API-Football
 *
 * Regra crítica: a posição do usuário no bolão SÓ é incluída no contexto
 * quando todos os jogos da rodada estiverem finalizados e pontuados.
 */

import { invokeLLM } from "../_core/llm";
import type { FixtureEvent, FixtureStatistic } from "./client";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface GameSummaryContext {
  homeTeam: string;
  awayTeam: string;
  scoreA: number;
  scoreB: number;
  goalsTimeline: Array<{ min: string; team: "home" | "away"; player: string; type: string }>;
  statistics?: {
    homePossession: number; awayPossession: number;
    homeShots: number; awayShots: number;
  } | null;
}

export interface BetAnalysisContext {
  homeTeam: string;
  awayTeam: string;
  scoreA: number;
  scoreB: number;
  predictedA: number;
  predictedB: number;
  resultType: "exact" | "correct_result" | "wrong";
  totalPoints: number;
  isZebra: boolean;
  // Contexto do bolão — sempre buscar para gerar comentário comparativo
  poolContext?: {
    totalParticipants: number;
    exactCount: number;       // quantos acertaram o placar exato nesse jogo
    correctCount: number;     // quantos acertaram o resultado nesse jogo
    totalBets: number;        // total de palpites nesse jogo nesse bolão
    userRank: number;         // posição do usuário no ranking do bolão
  } | null;
}

// ── Helpers de parsing da API-Football ───────────────────────────────────────

/**
 * Converte os eventos da API-Football em goalsTimeline normalizado.
 *
 * VALIDAÇÃO DE CONSISTÊNCIA: se o número de gols na timeline não bater
 * com o placar final (scoreA + scoreB), retorna array vazio para evitar
 * que a IA gere resumos com gols que não aconteceram (ex: cartão classificado
 * erroneamente como gol pela API).
 */
export function parseGoalsTimeline(
  events: FixtureEvent[],
  homeTeamName: string,
  scoreA?: number | null,
  scoreB?: number | null,
): Array<{ min: string; team: "home" | "away"; player: string; type: "goal" | "own_goal" | "penalty" }> {
  const goals = events
    .filter(e => e.type === "Goal")
    .map(e => ({
      min: String(e.time.elapsed) + (e.time.extra ? `+${e.time.extra}` : "") + "'",
      team: e.team.name === homeTeamName ? "home" : "away" as "home" | "away",
      player: e.player.name,
      type: (e.detail === "Own Goal" ? "own_goal"
          : e.detail === "Penalty" ? "penalty"
          : "goal") as "goal" | "own_goal" | "penalty",
    }));

  // Validação: se placar conhecido, verificar consistência
  if (scoreA !== null && scoreA !== undefined && scoreB !== null && scoreB !== undefined) {
    const expectedTotal = scoreA + scoreB;
    const actualTotal = goals.length;
    if (actualTotal !== expectedTotal) {
      // Timeline inconsistente com o placar — descartar para evitar desinformação
      return [];
    }
  }

  return goals;
}

/**
 * Converte as estatísticas da API-Football em matchStatistics normalizado.
 */
export function parseMatchStatistics(
  stats: FixtureStatistic[],
  homeTeamName: string
): {
  homePossession: number; awayPossession: number;
  homeShots: number; awayShots: number;
  homeCorners: number; awayCorners: number;
  homeYellow: number; awayYellow: number;
  homeRed: number; awayRed: number;
} | null {
  if (!stats || stats.length < 2) return null;

  const homeStats = stats.find(s => s.team.name === homeTeamName)?.statistics ?? [];
  const awayStats = stats.find(s => s.team.name !== homeTeamName)?.statistics ?? [];

  const getStat = (arr: typeof homeStats, type: string): number => {
    const val = arr.find(s => s.type === type)?.value;
    if (val === null || val === undefined) return 0;
    if (typeof val === "string" && val.endsWith("%")) return parseInt(val);
    return Number(val) || 0;
  };

  return {
    homePossession: getStat(homeStats, "Ball Possession"),
    awayPossession: getStat(awayStats, "Ball Possession"),
    homeShots: getStat(homeStats, "Total Shots"),
    awayShots: getStat(awayStats, "Total Shots"),
    homeCorners: getStat(homeStats, "Corner Kicks"),
    awayCorners: getStat(awayStats, "Corner Kicks"),
    homeYellow: getStat(homeStats, "Yellow Cards"),
    awayYellow: getStat(awayStats, "Yellow Cards"),
    homeRed: getStat(homeStats, "Red Cards"),
    awayRed: getStat(awayStats, "Red Cards"),
  };
}

// ── Geração de textos via LLM ─────────────────────────────────────────────────

/**
 * Gera um resumo narrativo da partida após o jogo finalizar.
 * Chamado pelo syncResults. Texto salvo em games.aiSummary.
 */
export async function generateGameSummary(ctx: GameSummaryContext): Promise<string> {
  const goalsText = ctx.goalsTimeline.length > 0
    ? ctx.goalsTimeline
        .map(g => `${g.min} ${g.player} (${g.team === "home" ? ctx.homeTeam : ctx.awayTeam})${g.type === "own_goal" ? " (contra)" : g.type === "penalty" ? " (pênalti)" : ""}`)
        .join(", ")
    : "sem gols registrados";

  const statsText = ctx.statistics
    ? `Posse: ${ctx.statistics.homePossession}% × ${ctx.statistics.awayPossession}%. Finalizações: ${ctx.statistics.homeShots} × ${ctx.statistics.awayShots}.`
    : "";

  const prompt = `Escreva um resumo animado de uma partida de futebol em português brasileiro. Máximo 4 linhas. Tom de narrador empolgado estilo transmissão ao vivo — energético, direto, com personalidade. Comente o que rolou em campo: gols, quem dominou, algum momento marcante. NÃO sugira apostas, NÃO mencione odds. Deixe o leitor com vontade de ter assistido. Sem emojis.

Dados da partida:
- ${ctx.homeTeam} ${ctx.scoreA} × ${ctx.scoreB} ${ctx.awayTeam}
- Gols: ${goalsText}
${statsText ? `- Estatísticas: ${statsText}` : ""}

Escreva apenas o resumo, sem título ou introdução.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um narrador de futebol brasileiro com energia de transmissão ao vivo — estilo CazéTV. Escreve resumos animados e envolventes de partidas, focando no que aconteceu em campo. NUNCA menciona apostas, odds ou recomendações de resultado. Escreve em português brasileiro, sem emojis." },
        { role: "user", content: prompt },
      ],
    });
    const text = (response as any)?.choices?.[0]?.message?.content ?? "";
    return text.trim().slice(0, 600); // limite de segurança
  } catch {
    return `${ctx.homeTeam} ${ctx.scoreA} × ${ctx.scoreB} ${ctx.awayTeam}.`;
  }
}

/**
 * Gera a análise do palpite do usuário após o jogo finalizar.
 * Chamado pelo syncResults. Texto salvo em game_bet_analyses.
 *
 * REGRA: poolContext só é passado quando todos os jogos da rodada estiverem finalizados.
 */
export async function generateBetAnalysis(ctx: BetAnalysisContext): Promise<string> {
  const resultLabel = ctx.resultType === "exact" ? "placar exato"
    : ctx.resultType === "correct_result" ? "resultado correto"
    : "resultado errado";

  // Monta o bloco de contexto comparativo do bolão de forma narrativa
  // A IA recebe os números brutos mas é instruida a usá-los de forma implícita
  let poolBlock = "";
  if (ctx.poolContext) {
    const p = ctx.poolContext;
    const totalBets = p.totalBets || p.totalParticipants;
    const exactRatio = totalBets > 0 ? p.exactCount / totalBets : 0;
    const correctRatio = totalBets > 0 ? p.correctCount / totalBets : 0;

    // Classifica a raridade do acerto para guiar o tom da IA
    let raridadeExato = "";
    if (p.exactCount === 0) raridadeExato = "ninguem acertou o placar exato";
    else if (p.exactCount === 1 && ctx.resultType === "exact") raridadeExato = "apenas o usuario acertou o placar exato (unico no bolao)";
    else if (exactRatio <= 0.1) raridadeExato = "muito poucos acertaram o placar exato";
    else if (exactRatio <= 0.3) raridadeExato = "poucos acertaram o placar exato";
    else raridadeExato = "varios acertaram o placar exato";

    let raridadeResultado = "";
    if (p.correctCount === 0) raridadeResultado = "ninguem acertou o resultado";
    else if (correctRatio <= 0.2) raridadeResultado = "muito poucos acertaram o resultado";
    else if (correctRatio <= 0.5) raridadeResultado = "menos da metade acertou o resultado";
    else raridadeResultado = "a maioria acertou o resultado";

    poolBlock = `
Contexto do bolão (use de forma natural, sem citar números diretamente):
- Total de palpites nesse jogo: ${totalBets}
- Placar exato: ${p.exactCount} acertaram (${raridadeExato})
- Resultado correto: ${p.correctCount} acertaram (${raridadeResultado})
- Posição do usuário no ranking do bolão: ${p.userRank}º de ${p.totalParticipants}
- Dica de tom: use expressões como "você foi o único", "poucos viram essa", "quase ninguém pegou", "a galera errou" em vez de citar números brutos`;
  }

  const zebraLine = ctx.isZebra ? "- O resultado foi uma zebra \u2014 a maioria apostou no outro lado." : "";

  const prompt = `Analise o palpite do usuário para o jogo:
- Time da casa: ${ctx.homeTeam}
- Time visitante: ${ctx.awayTeam}
- Placar final: ${ctx.scoreA} x ${ctx.scoreB}
- Palpite: ${ctx.predictedA} x ${ctx.predictedB}
- Tipo de resultado: ${resultLabel}
- Pontos ganhos: ${ctx.totalPoints}
${zebraLine}
${poolBlock}

Escreva apenas a análise, sem título, sem emojis.`;

  const systemPrompt = `Você é um comentarista esportivo com o tom da CazéTV: casual, animado e direto, como um amigo que entende de bola.

Regras:
- Use o contexto do bolão para tornar o comentário comparativo e relevante: mencione se o usuário foi o único, se poucos acertaram, se a galera errou, a posição no ranking
- Não cite números brutos ("1 de 10 pessoas") — use linguagem natural ("você foi o único", "quase ninguém viu essa")
- Evite bajulação exagerada — reconheça acertos de forma natural, sem exagero
- Para placar exato: destaque a raridade do acerto no contexto do bolão
- Para resultado correto: reconheça sem exaltar, mencione se foi fácil ou difícil no bolão
- Para resultado errado: bom humor sem drama, mencione que a galera também errou (se for o caso)
- Máximo 2-3 frases curtas
- NUNCA mencione odds, apostas financeiras ou sugira resultado
- Escreva em português brasileiro, sem emojis`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });
    const text = (response as any)?.choices?.[0]?.message?.content ?? "";
    return text.trim().slice(0, 500);
  } catch {
    return ctx.resultType === "exact"
      ? `Placar exato. ${ctx.totalPoints} pontos conquistados.`
      : ctx.resultType === "correct_result"
      ? `Resultado correto. ${ctx.totalPoints} pontos conquistados.`
      : `Desta vez não foi. Continue apostando.`;
  }
}

/**
 * Gera um comentário do narrador sobre o jogo para usuários que NÃO apostaram.
 * Tom de narrador de estádio: comenta o resultado e a ausência do apostador.
 * Salvo em games.aiNarration.
 */
export async function generateGameNarration(ctx: {
  homeTeam: string;
  awayTeam: string;
  scoreA: number;
  scoreB: number;
  goalsTimeline: Array<{ min: string; team: "home" | "away"; player: string; type: string }>;
}): Promise<string> {
  const goalsText = ctx.goalsTimeline.length > 0
    ? ctx.goalsTimeline
        .map(g => `${g.min} ${g.player} (${g.team === "home" ? ctx.homeTeam : ctx.awayTeam})`)
        .join(", ")
    : "sem gols registrados";

  const prompt = `Escreva um comentário curto de narrador de estádio sobre uma partida de futebol que o apostador NÃO apostou. Máximo 2 linhas. Tom animado e divertido, sem exagero. Comente o resultado e faça uma referência leve à ausência do apostador — sem ser agressivo, com bom humor. Sem emojis.

Dados:
- Jogo: ${ctx.homeTeam} ${ctx.scoreA} × ${ctx.scoreB} ${ctx.awayTeam}
- Gols: ${goalsText}

Escreva apenas o comentário, sem título.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um narrador de estádio brasileiro com personalidade: animado, divertido e com um toque de humor natural. Quando o apostador não apostou num jogo, você comenta o resultado com entusiasmo e faz uma referência bem-humorada à ausência dele. Nunca exagera. Escreve em português brasileiro, sem emojis." },
        { role: "user", content: prompt },
      ],
    });
    const text = (response as any)?.choices?.[0]?.message?.content ?? "";
    return text.trim().slice(0, 400);
  } catch {
    const winner = ctx.scoreA > ctx.scoreB ? ctx.homeTeam : ctx.scoreB > ctx.scoreA ? ctx.awayTeam : null;
    return winner
      ? `${ctx.homeTeam} ${ctx.scoreA} × ${ctx.scoreB} ${ctx.awayTeam}. Você perdeu esse!`
      : `Empate em ${ctx.scoreA} × ${ctx.scoreB}. Você não apostou nesse.`;
  }
}

// ── Análise pré-jogo ──────────────────────────────────────────────────────────

// Jogador ausente/questionável para o prompt do LLM
export interface AbsentPlayer {
  name: string;
  team: string; // nome do time
  type: "Missing Fixture" | "Questionable" | string;
  reason: string;
}

// Resumo de estatísticas da temporada para o prompt do LLM
export interface TeamStatsSummary {
  teamName: string;
  played: number;
  wins: number;
  draws: number;
  loses: number;
  goalsFor: number;
  goalsAgainst: number;
  avgGoalsFor: string;    // ex: "1.8"
  avgGoalsAgainst: string;
  cleanSheets: number;
  failedToScore: number;
  biggestWin: string | null;
  biggestLoss: string | null;
  currentStreak: { wins: number; draws: number; loses: number };
}

export interface AiPredictionContext {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  matchDate: string; // ISO string
  // Probabilidades do modelo simplificado da API (3 buckets fixos)
  apiPercent?: { home: number; draw: number; away: number } | null;
  apiAdvice?: string | null;
  // Forma recente dos times (plano Pro — /fixtures?team=X&last=5&status=FT)
  homeForm?: string[];
  awayForm?: string[];
  // Dados ricos de comparação únicos por jogo (comparison da API-Football)
  apiComparison?: {
    total?: { home: string; away: string } | null;
    poisson?: { home: string; away: string } | null;
    forme?: { home: string; away: string } | null;
    att?: { home: string; away: string } | null;
    def?: { home: string; away: string } | null;
    h2h?: { home: string; away: string } | null;
    goals?: { home: string; away: string } | null;
  } | null;
  // Lesionados, suspensos e questionáveis (/injuries?fixture=X)
  injuries?: AbsentPlayer[];
  // Estatísticas da temporada dos dois times (/teams/statistics)
  homeStats?: TeamStatsSummary | null;
  awayStats?: TeamStatsSummary | null;
}

export interface AiPredictionResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeForm: string[];
  awayForm: string[];
  aiRecommendation: string;
  // Dados ricos de comparação únicos por jogo — usados para exibição na barra de probabilidade
  comparison?: {
    total?: { home: string; away: string } | null;
    poisson?: { home: string; away: string } | null;
    forme?: { home: string; away: string } | null;
    att?: { home: string; away: string } | null;
    def?: { home: string; away: string } | null;
    h2h?: { home: string; away: string } | null;
    goals?: { home: string; away: string } | null;
  } | null;
  // Lesionados/suspensos/questionáveis salvos para exibição futura
  injuries?: AbsentPlayer[];
  // Estatísticas da temporada dos dois times
  homeStats?: TeamStatsSummary | null;
  awayStats?: TeamStatsSummary | null;
}

/**
 * Gera o objeto aiPrediction para jogos pré-jogo.
 *
 * Regra crítica (plano Pro):
 *  - As probabilidades SEMPRE vêm da API-Football (/predictions).
 *  - O LLM é usado APENAS para redigir o texto narrativo da análise.
 *  - Se a API não retornar probabilidades, retorna null (sem análise exibida).
 *  - O LLM NUNCA estima ou inventa probabilidades.
 *
 * Salvo em games.aiPrediction.
 */
/**
 * Redistribui comparison.total (home/away sem empate) em 3 valores que somam 100%.
 *
 * Estratégia: usa o apiPercent original como âncora para o empate.
 * O empate é mantido do apiPercent, e home/away são redistribuídos proporcionalmente
 * usando comparison.total como peso relativo.
 *
 * Exemplo:
 *   apiPercent: home=10, draw=45, away=45
 *   comparison.total: home=39.8%, away=60.2%
 *   → pool disponível para home+away = 100 - 45 = 55%
 *   → homeWin = 55 * (39.8/100) ≈ 22%
 *   → awayWin = 55 * (60.2/100) ≈ 33%
 *   → draw = 45%
 */
function redistributeWithComparison(
  apiPercent: { home: number; draw: number; away: number },
  cmpTotal: { home: string; away: string } | null | undefined,
): { homeWin: number; draw: number; awayWin: number } {
  if (!cmpTotal) {
    return { homeWin: apiPercent.home, draw: apiPercent.draw, awayWin: apiPercent.away };
  }
  const cmpHome = parseFloat(cmpTotal.home);
  const cmpAway = parseFloat(cmpTotal.away);
  // Se comparison.total retornou zeros (API sem dados de comparação reais),
  // usar apiPercent diretamente — evita o fallback 50/50 que gera 34%/33%/33% em todos os jogos
  if (!cmpHome && !cmpAway) {
    return { homeWin: apiPercent.home, draw: apiPercent.draw, awayWin: apiPercent.away };
  }
  const cmpSum = cmpHome + cmpAway;
  const drawPct = apiPercent.draw;
  const pool = 100 - drawPct;
  const homeWin = Math.round((pool * cmpHome) / cmpSum);
  const awayWin = 100 - drawPct - homeWin;
  return { homeWin, draw: drawPct, awayWin };
}

export async function buildAiPrediction(ctx: AiPredictionContext): Promise<AiPredictionResult | null> {
  // Sem dados da API — não gera análise. Nunca inventar probabilidades.
  if (!ctx.apiPercent) {
    return null;
  }

  // Redistribuir percentuais usando comparison.total como peso único por jogo
  const { homeWin, draw, awayWin } = redistributeWithComparison(
    ctx.apiPercent,
    ctx.apiComparison?.total,
  );

  // Nota: home/away do apiPercent não são mais usados diretamente — use homeWin/awayWin redistribuídos

  const dateStr = new Date(ctx.matchDate).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  });

  // Forma recente: converte array de W/D/L em texto legível
  const formatForm = (form: string[], teamName: string): string => {
    if (!form || form.length === 0) return "";
    const results = form.slice(0, 5).map(r => r === "W" ? "V" : r === "D" ? "E" : "D").join("-");
    const wins = form.filter(r => r === "W").length;
    const draws = form.filter(r => r === "D").length;
    const losses = form.filter(r => r === "L").length;
    return `${teamName}: ${results} (${wins}V ${draws}E ${losses}D nos últimos ${form.length} jogos)`;
  };
  const homeFormText = formatForm(ctx.homeForm ?? [], ctx.homeTeam);
  const awayFormText = formatForm(ctx.awayForm ?? [], ctx.awayTeam);
  const formSection = (homeFormText || awayFormText)
    ? `Forma recente:\n${homeFormText ? `- ${homeFormText}` : ""}\n${awayFormText ? `- ${awayFormText}` : ""}`
    : "";

  // Dados de comparison únicos por jogo — enriquecem o contexto do LLM
  const cmp = ctx.apiComparison;
  const comparisonSection = cmp ? [
    cmp.total ? `Score combinado: ${ctx.homeTeam} ${cmp.total.home} / ${ctx.awayTeam} ${cmp.total.away}` : "",
    cmp.poisson ? `Distribuição Poisson: ${ctx.homeTeam} ${cmp.poisson.home} / ${ctx.awayTeam} ${cmp.poisson.away}` : "",
    cmp.forme ? `Aproveitamento recente: ${ctx.homeTeam} ${cmp.forme.home} / ${ctx.awayTeam} ${cmp.forme.away}` : "",
    cmp.att ? `Força de ataque: ${ctx.homeTeam} ${cmp.att.home} / ${ctx.awayTeam} ${cmp.att.away}` : "",
    cmp.def ? `Força de defesa: ${ctx.homeTeam} ${cmp.def.home} / ${ctx.awayTeam} ${cmp.def.away}` : "",
    cmp.h2h ? `Histórico H2H: ${ctx.homeTeam} ${cmp.h2h.home} / ${ctx.awayTeam} ${cmp.h2h.away}` : "",
  ].filter(Boolean).join("\n") : "";

  // Seção de lesionados/suspensos/questionáveis
  const injuriesSection = (() => {
    const list = ctx.injuries ?? [];
    if (list.length === 0) return "";
    const missing = list.filter(p => p.type === "Missing Fixture");
    const questionable = list.filter(p => p.type === "Questionable");
    const lines: string[] = [];
    if (missing.length > 0) {
      lines.push(`Desfalques confirmados: ${missing.map(p => `${p.name} (${p.team} — ${p.reason})`).join(", ")}`);
    }
    if (questionable.length > 0) {
      lines.push(`Questionáveis: ${questionable.map(p => `${p.name} (${p.team} — ${p.reason})`).join(", ")}`);
    }
    return lines.length > 0 ? `Situação dos elencos:\n${lines.join("\n")}` : "";
  })();

  // Seção de estatísticas da temporada
  const formatStats = (s: typeof ctx.homeStats): string => {
    if (!s) return "";
    const pct = s.played > 0 ? Math.round((s.wins / s.played) * 100) : 0;
    return [
      `${s.teamName}: ${s.wins}V ${s.draws}E ${s.loses}D em ${s.played} jogos (${pct}% aproveitamento)`,
      `  Média de gols: ${s.avgGoalsFor} marcados / ${s.avgGoalsAgainst} sofridos por jogo`,
      s.cleanSheets > 0 ? `  ${s.cleanSheets} clean sheet${s.cleanSheets > 1 ? "s" : ""} na temporada` : "",
      s.biggestWin ? `  Maior vitória: ${s.biggestWin}` : "",
      s.currentStreak.wins >= 3 ? `  Série atual: ${s.currentStreak.wins} vitórias seguidas` : "",
      s.currentStreak.loses >= 3 ? `  Série atual: ${s.currentStreak.loses} derrotas seguidas` : "",
    ].filter(Boolean).join("\n");
  };
  const homeStatsText = formatStats(ctx.homeStats);
  const awayStatsText = formatStats(ctx.awayStats);
  const statsSection = (homeStatsText || awayStatsText)
    ? `Estatísticas da temporada:\n${homeStatsText ? homeStatsText : ""}${awayStatsText ? "\n" + awayStatsText : ""}`
    : "";

  // LLM redige apenas o texto narrativo — com base nos dados reais da API
  const favoriteLabel = homeWin > awayWin ? ctx.homeTeam : awayWin > homeWin ? ctx.awayTeam : "equilíbrio";
  const prompt = `Escreva uma análise pré-jogo animada para um bolão de futebol. Máximo 3 linhas. Tom de narrador empolgado estilo CazéTV — energético, com personalidade, sem clichês. Use os dados abaixo para comentar quem está em melhor momento, o que esperar do confronto, o que pode ser decisivo. Se houver desfalques importantes, mencione-os de forma natural na narrativa. NÃO sugira apostas, NÃO mencione odds ou percentuais diretamente, NÃO diga qual time apostar. NUNCA use expressões temporais relativas como "hoje", "amanhã", "agora", "neste momento" — o jogo pode ser em dias ou semanas. Deixe o leitor animado para fazer o próprio palpite. Sem emojis.
Jogo: ${ctx.homeTeam} × ${ctx.awayTeam}
Competição: ${ctx.competition}
Data: ${dateStr}
${formSection}
${statsSection ? statsSection + "\n" : ""}
${injuriesSection ? injuriesSection + "\n" : ""}
${comparisonSection ? `Análise estatística:\n${comparisonSection}` : ""}
Contexto de probabilidade (use para embasar a narrativa, NÃO mencione os números): ${ctx.homeTeam} ${homeWin}% de chance de vitória | Empate ${draw}% | ${ctx.awayTeam} ${awayWin}%
Escreva apenas a análise, sem título.`;

  // Fallback de texto caso o LLM falhe — narrativo, sem expor percentuais brutos
  let aiRecommendation = favoriteLabel !== "equilíbrio"
    ? `${favoriteLabel} chega como favorito para esse confronto. Análise baseada em dados estatísticos da temporada.`
    : `Jogo equilibrado entre ${ctx.homeTeam} e ${ctx.awayTeam}. Qualquer resultado é possível.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um narrador de futebol brasileiro com energia de transmissão ao vivo — estilo CazéTV. Escreve análises pré-jogo animadas e envolventes para bolões de palpites. Foca no contexto esportivo: momento dos times, o que esperar do jogo, o que pode ser decisivo. NUNCA sugere apostas, NUNCA menciona odds ou percentuais, NUNCA diz qual resultado escolher. NUNCA usa expressões temporais relativas como 'hoje', 'amanhã', 'agora', 'neste momento' — o texto será lido em datas diferentes da geração. O objetivo é deixar o usuário animado para fazer o próprio palpite. Escreve em português brasileiro, sem emojis." },
        { role: "user", content: prompt },
      ],
    });
    const text = (response as any)?.choices?.[0]?.message?.content ?? "";
    if (text.trim()) aiRecommendation = text.trim().slice(0, 400);
  } catch { /* usa fallback com dados reais */ }

  // Normalizar comparison para o formato de armazenamento
  const comparisonToSave = cmp ? {
    total: cmp.total ?? null,
    poisson: cmp.poisson ?? null,
    forme: cmp.forme ?? null,
    att: cmp.att ?? null,
    def: cmp.def ?? null,
    h2h: cmp.h2h ?? null,
    goals: cmp.goals ?? null,
  } : null;

  return {
    homeWin,
    draw,
    awayWin,
    homeForm: ctx.homeForm ?? [],
    awayForm: ctx.awayForm ?? [],
    aiRecommendation,
    comparison: comparisonToSave,
    injuries: ctx.injuries ?? [],
    homeStats: ctx.homeStats ?? null,
    awayStats: ctx.awayStats ?? null,
  };
}
