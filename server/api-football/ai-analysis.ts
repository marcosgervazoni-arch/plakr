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
  // Probabilidades da API-Football (opcional — pode não estar disponível no plano Free)
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
 * Estratégia:
 *  1. Se a API-Football retornou probabilidades, usa-as diretamente.
 *  2. Caso contrário, pede ao LLM para estimar probabilidades + forma + recomendação.
 *  3. Sempre gera o texto de recomendação via LLM para garantir qualidade.
 *
 * Salvo em games.aiPrediction.
 */
export async function buildAiPrediction(ctx: AiPredictionContext): Promise<AiPredictionResult> {
  const dateStr = new Date(ctx.matchDate).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "long", year: "numeric", timeZone: "America/Sao_Paulo",
  });

  // Se temos probabilidades da API, usamos elas e só pedimos o texto ao LLM
  if (ctx.apiPercent) {
    const { home, draw, away } = ctx.apiPercent;

    const prompt = `Escreva uma análise pré-jogo concisa para apostadores de bolão. Máximo 3 linhas. Tom de especialista esportivo brasileiro: direto, informativo, com personalidade — sem clichês. Mencione as probabilidades e dê uma dica de aposta. Sem emojis.

Jogo: ${ctx.homeTeam} × ${ctx.awayTeam}
Competição: ${ctx.competition}
Data: ${dateStr}
Probabilidades: ${ctx.homeTeam} vence ${home}% | Empate ${draw}% | ${ctx.awayTeam} vence ${away}%
${ctx.apiAdvice ? `Conselho da API: ${ctx.apiAdvice}` : ""}

Escreva apenas a análise, sem título.`;

    let aiRecommendation = `${ctx.homeTeam} × ${ctx.awayTeam}: probabilidades apontam para ${home > away ? ctx.homeTeam : away > home ? ctx.awayTeam : "equilíbrio"}.`;
    try {
      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Você é um analista esportivo brasileiro especializado em futebol. Escreve análises pré-jogo concisas e úteis para apostadores de bolão, sem exageros e sem emojis." },
          { role: "user", content: prompt },
        ],
      });
      const text = (response as any)?.choices?.[0]?.message?.content ?? "";
      if (text.trim()) aiRecommendation = text.trim().slice(0, 400);
    } catch { /* usa fallback */ }

    return { homeWin: home, draw, awayWin: away, homeForm: [], awayForm: [], aiRecommendation };
  }

  // Sem dados da API: pede ao LLM probabilidades + forma + recomendação em JSON estruturado
  const prompt = `Você é um analista de futebol brasileiro. Analise o confronto abaixo e retorne um JSON com:
- homeWin: probabilidade de vitória do mandante (0-100, inteiro)
- draw: probabilidade de empate (0-100, inteiro)
- awayWin: probabilidade de vitória do visitante (0-100, inteiro)
- homeForm: últimos 5 resultados do mandante como array de "W", "D" ou "L" (do mais recente ao mais antigo)
- awayForm: últimos 5 resultados do visitante como array de "W", "D" ou "L"
- aiRecommendation: análise de 2-3 linhas para apostadores, tom direto e informativo

IMPORTANTE: homeWin + draw + awayWin deve somar exatamente 100.

Jogo: ${ctx.homeTeam} × ${ctx.awayTeam}
Competição: ${ctx.competition}
Data: ${dateStr}`;

  try {
    const response = await invokeLLM({
      messages: [
        { role: "system", content: "Você é um analista de futebol brasileiro. Responda APENAS com JSON válido, sem markdown, sem explicações." },
        { role: "user", content: prompt },
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "ai_prediction",
          strict: true,
          schema: {
            type: "object",
            properties: {
              homeWin: { type: "integer" },
              draw: { type: "integer" },
              awayWin: { type: "integer" },
              homeForm: { type: "array", items: { type: "string" } },
              awayForm: { type: "array", items: { type: "string" } },
              aiRecommendation: { type: "string" },
            },
            required: ["homeWin", "draw", "awayWin", "homeForm", "awayForm", "aiRecommendation"],
            additionalProperties: false,
          },
        },
      },
    });

    const raw = (response as any)?.choices?.[0]?.message?.content ?? "{}";
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;

    // Normalizar para garantir que soma = 100
    const total = (parsed.homeWin ?? 0) + (parsed.draw ?? 0) + (parsed.awayWin ?? 0);
    const normalize = (v: number) => total > 0 ? Math.round((v / total) * 100) : 33;

    return {
      homeWin: normalize(parsed.homeWin ?? 40),
      draw: normalize(parsed.draw ?? 30),
      awayWin: normalize(parsed.awayWin ?? 30),
      homeForm: (parsed.homeForm ?? []).slice(0, 5),
      awayForm: (parsed.awayForm ?? []).slice(0, 5),
      aiRecommendation: (parsed.aiRecommendation ?? "").slice(0, 400),
    };
  } catch {
    // Fallback neutro
    return {
      homeWin: 40,
      draw: 30,
      awayWin: 30,
      homeForm: [],
      awayForm: [],
      aiRecommendation: `${ctx.homeTeam} recebe ${ctx.awayTeam} em jogo válido pelo ${ctx.competition}. Análise indisponível no momento.`,
    };
  }
}
