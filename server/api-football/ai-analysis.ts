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
  // Contexto do bolão — só incluir quando a rodada estiver completamente finalizada
  poolContext?: {
    totalParticipants: number;
    exactCount: number;       // quantos acertaram o placar exato
    correctCount: number;     // quantos acertaram o resultado
    userRank: number;         // posição do usuário na rodada
  } | null;
}

// ── Helpers de parsing da API-Football ───────────────────────────────────────

/**
 * Converte os eventos da API-Football em goalsTimeline normalizado.
 */
export function parseGoalsTimeline(
  events: FixtureEvent[],
  homeTeamName: string
): Array<{ min: string; team: "home" | "away"; player: string; type: "goal" | "own_goal" | "penalty" }> {
  return events
    .filter(e => e.type === "Goal")
    .map(e => ({
      min: String(e.time.elapsed) + (e.time.extra ? `+${e.time.extra}` : "") + "'",
      team: e.team.name === homeTeamName ? "home" : "away",
      player: e.player.name,
      type: e.detail === "Own Goal" ? "own_goal"
          : e.detail === "Penalty" ? "penalty"
          : "goal",
    }));
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

  const prompt = `Escreva um resumo narrativo conciso de uma partida de futebol em português brasileiro. Máximo 4 linhas. Tom jornalístico, direto, sem clichês. Não use emojis.

Dados da partida:
- ${ctx.homeTeam} ${ctx.scoreA} × ${ctx.scoreB} ${ctx.awayTeam}
- Gols: ${goalsText}
${statsText ? `- Estatísticas: ${statsText}` : ""}

Escreva apenas o resumo, sem título ou introdução.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um jornalista esportivo brasileiro. Escreva resumos concisos e precisos de partidas de futebol." },
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

  const poolLine = ctx.poolContext
    ? `Dos ${ctx.poolContext.totalParticipants} participantes do bolão, ${ctx.poolContext.exactCount} acertaram o placar exato e ${ctx.poolContext.correctCount} acertaram o resultado. Você ficou em ${ctx.poolContext.userRank}º lugar nesta rodada.`
    : "";

  const zebraLine = ctx.isZebra ? "O resultado foi uma zebra — a maioria apostou no outro lado." : "";

  const prompt = `Escreva uma análise curta do palpite de um apostador em um bolão de futebol. Máximo 3 linhas. Tom de narrador de estádio brasileiro: animado, divertido, com personalidade — mas sem exagerar, sem ser forçado. Varie o estilo conforme o resultado: placar exato merece entusiasmo genuino, resultado correto merece reconhecimento, resultado errado merece um comentrio honesto e bem-humorado. Sem emojis. Sem repetir informações óbvias.

Dados:
- Jogo: ${ctx.homeTeam} ${ctx.scoreA} × ${ctx.scoreB} ${ctx.awayTeam}
- Palpite: ${ctx.predictedA} × ${ctx.predictedB}
- Resultado: ${resultLabel}
- Pontos conquistados: ${ctx.totalPoints}
${zebraLine}
${poolLine}

Escreva apenas a análise, sem título.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um narrador de estádio brasileiro com personalidade: animado, divertido e com um toque de humor natural. Analisa palpites de bolões como se estivesse comentando ao vivo — com entusiasmo quando o apostador acerta e com bom humor quando erra. Nunca exagera nem é forçado. Escreve em português brasileiro, sem emojis." },
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

export interface AiPredictionContext {
  homeTeam: string;
  awayTeam: string;
  competition: string;
  matchDate: string; // ISO string
  // Probabilidades da API-Football (plano Pro — obrigatórias para exibir análise)
  apiPercent?: { home: number; draw: number; away: number } | null;
  apiAdvice?: string | null;
}

export interface AiPredictionResult {
  homeWin: number;
  draw: number;
  awayWin: number;
  homeForm: string[];
  awayForm: string[];
  aiRecommendation: string;
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
export async function buildAiPrediction(ctx: AiPredictionContext): Promise<AiPredictionResult | null> {
  // Sem dados da API — não gera análise. Nunca inventar probabilidades.
  if (!ctx.apiPercent) {
    return null;
  }

  const { home, draw, away } = ctx.apiPercent;
  const dateStr = new Date(ctx.matchDate).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  });

  // LLM redige apenas o texto narrativo — com base nos dados reais da API
  const prompt = `Escreva uma análise pré-jogo concisa para apostadores de bolão. Máximo 3 linhas. Tom de especialista esportivo brasileiro: direto, informativo, com personalidade — sem clichês. Mencione as probabilidades e dê uma dica de aposta. Sem emojis.

Jogo: ${ctx.homeTeam} × ${ctx.awayTeam}
Competição: ${ctx.competition}
Data: ${dateStr}
Probabilidades (fonte: API-Football): ${ctx.homeTeam} vence ${home}% | Empate ${draw}% | ${ctx.awayTeam} vence ${away}%
${ctx.apiAdvice ? `Conselho da API: ${ctx.apiAdvice}` : ""}

Escreva apenas a análise, sem título.`;

  // Fallback de texto caso o LLM falhe — usa os dados reais da API
  const favorite = home > away ? ctx.homeTeam : away > home ? ctx.awayTeam : "nenhum favorito claro";
  let aiRecommendation = `${ctx.homeTeam} ${home}% | Empate ${draw}% | ${ctx.awayTeam} ${away}%. Favorito: ${favorite}.`;
  if (ctx.apiAdvice) aiRecommendation += ` ${ctx.apiAdvice}.`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um analista esportivo brasileiro especializado em futebol. Escreve análises pré-jogo concisas e úteis para apostadores de bolão, com base nos dados fornecidos. Não inventa informações. Sem emojis." },
        { role: "user", content: prompt },
      ],
    });
    const text = (response as any)?.choices?.[0]?.message?.content ?? "";
    if (text.trim()) aiRecommendation = text.trim().slice(0, 400);
  } catch { /* usa fallback com dados reais */ }

  return {
    homeWin: home,
    draw,
    awayWin: away,
    homeForm: [],
    awayForm: [],
    aiRecommendation,
  };
}
