/**
 * Serviço de Retrospectiva do Bolão
 *
 * Responsável por:
 * 1. Calcular os dados agregados de cada participante ao concluir um bolão
 * 2. Gerar os 5 slides da retrospectiva (estilo Spotify Wrapped) como PNG via SVG→sharp
 * 3. Gerar o card de compartilhamento (pódio ou participante) como PNG
 * 4. Fazer upload dos PNGs para S3 e salvar URLs no banco
 * 5. Gerar a frase de encerramento via LLM
 */

import sharp from "sharp";
import { getDb, createNotification } from "./db";
import {
  pools,
  poolMembers,
  poolMemberStats,
  bets,
  games,
  tournaments,
  userBadges,
  badges,
  poolRetrospectives,
  userShareCards,
  users,
  poolFinalPositions,
} from "../drizzle/schema";
import { eq, and, desc, count, sql } from "drizzle-orm";
import { storagePut } from "./storage";
import { invokeLLM } from "./_core/llm";

// ─── TIPOS ───────────────────────────────────────────────────────────────────

export interface RetrospectiveData {
  userId: number;
  userName: string;
  userAvatar: string | null;
  poolName: string;
  tournamentName: string | null;
  poolStartDate: Date | null;
  poolEndDate: Date | null;
  totalParticipants: number;
  totalBets: number;
  exactScoreCount: number;
  correctResultCount: number;
  zebraCount: number;
  totalPoints: number;
  finalPosition: number;
  accuracyPct: number;
  bestMomentType: "exact_score" | "rank_jump" | "badge" | "zebra";
  bestMomentData: Record<string, unknown>;
  badgeEarnedName: string | null;
  badgeEarnedEmoji: string | null;
  closingPhrase: string;
}

// ─── CÁLCULO DOS DADOS ────────────────────────────────────────────────────────

export async function calculateRetrospectiveData(
  poolId: number,
  userId: number
): Promise<RetrospectiveData | null> {
  const db = await getDb();
  if (!db) return null;

  // Dados do bolão
  const [pool] = await db
    .select({
      id: pools.id,
      name: pools.name,
      createdAt: pools.createdAt,
      concludedAt: pools.concludedAt,
      tournamentId: pools.tournamentId,
    })
    .from(pools)
    .where(eq(pools.id, poolId))
    .limit(1);

  if (!pool) return null;

  // Dados do usuário
  const [user] = await db
    .select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!user) return null;

  // Torneio
  let tournamentName: string | null = null;
  if (pool.tournamentId) {
    const [tournament] = await db
      .select({ name: tournaments.name })
      .from(tournaments)
      .where(eq(tournaments.id, pool.tournamentId))
      .limit(1);
    tournamentName = tournament?.name ?? null;
  }

  // Total de participantes
  const [{ total }] = await db
    .select({ total: count() })
    .from(poolMembers)
    .where(eq(poolMembers.poolId, poolId));

  // Stats do membro (campos reais: exactScoreCount, correctResultCount, zebraCount, totalBets, totalPoints)
  const [stats] = await db
    .select()
    .from(poolMemberStats)
    .where(and(eq(poolMemberStats.poolId, poolId), eq(poolMemberStats.userId, userId)))
    .limit(1);

  const totalBets = stats?.totalBets ?? 0;
  const exactScoreCount = stats?.exactScoreCount ?? 0;
  const correctResultCount = stats?.correctResultCount ?? 0;
  const zebraCount = stats?.zebraCount ?? 0;
  const totalPoints = stats?.totalPoints ?? 0;
  const accuracyPct = totalBets > 0 ? Math.round((correctResultCount / totalBets) * 100) : 0;

  // Posição final
  const [finalPos] = await db
    .select({ position: poolFinalPositions.position })
    .from(poolFinalPositions)
    .where(and(eq(poolFinalPositions.poolId, poolId), eq(poolFinalPositions.userId, userId)))
    .limit(1);

  const finalPosition = finalPos?.position ?? 0;

  // Melhor momento — dinâmico
  let bestMomentType: RetrospectiveData["bestMomentType"] = "exact_score";
  let bestMomentData: Record<string, unknown> = {};

  // 1. Melhor palpite com placar exato (resultType === "exact")
  const exactBets = await db
    .select({
      predictedScoreA: bets.predictedScoreA,
      predictedScoreB: bets.predictedScoreB,
      pointsEarned: bets.pointsEarned,
      gameId: bets.gameId,
    })
    .from(bets)
    .where(
      and(
        eq(bets.poolId, poolId),
        eq(bets.userId, userId),
        eq(bets.resultType, "exact")
      )
    )
    .orderBy(desc(bets.pointsEarned))
    .limit(1);

  if (exactBets.length > 0) {
    const bet = exactBets[0];
    const [game] = await db
      .select({ teamAName: games.teamAName, teamBName: games.teamBName })
      .from(games)
      .where(eq(games.id, bet.gameId))
      .limit(1);

    bestMomentType = "exact_score";
    bestMomentData = {
      homeScore: bet.predictedScoreA,
      awayScore: bet.predictedScoreB,
      points: bet.pointsEarned,
      homeTeam: game?.teamAName ?? "Time A",
      awayTeam: game?.teamBName ?? "Time B",
    };
  }

  // 2. Se não teve placar exato, verificar zebra acertada
  if (exactBets.length === 0 && zebraCount > 0) {
    const zebraBet = await db
      .select({
        predictedScoreA: bets.predictedScoreA,
        predictedScoreB: bets.predictedScoreB,
        pointsEarned: bets.pointsEarned,
        gameId: bets.gameId,
      })
      .from(bets)
      .innerJoin(games, eq(bets.gameId, games.id))
      .where(
        and(
          eq(bets.poolId, poolId),
          eq(bets.userId, userId),
          eq(games.isZebraResult, true),
          eq(bets.resultType, "correct_result")
        )
      )
      .orderBy(desc(bets.pointsEarned))
      .limit(1);

    if (zebraBet.length > 0) {
      const bet = zebraBet[0];
      const [game] = await db
        .select({ teamAName: games.teamAName, teamBName: games.teamBName })
        .from(games)
        .where(eq(games.id, bet.gameId))
        .limit(1);

      bestMomentType = "zebra";
      bestMomentData = {
        homeScore: bet.predictedScoreA,
        awayScore: bet.predictedScoreB,
        points: bet.pointsEarned,
        homeTeam: game?.teamAName ?? "Time A",
        awayTeam: game?.teamBName ?? "Time B",
      };
    }
  }

  // 3. Se não teve nenhum dos anteriores, verificar badge conquistado
  if (bestMomentType === "exact_score" && exactBets.length === 0 && zebraCount === 0) {
    const earnedBadge = await db
      .select({ name: badges.name, emoji: badges.emoji, earnedAt: userBadges.earnedAt })
      .from(userBadges)
      .innerJoin(badges, eq(userBadges.badgeId, badges.id))
      .where(eq(userBadges.userId, userId))
      .orderBy(desc(userBadges.earnedAt))
      .limit(1);

    if (earnedBadge.length > 0) {
      bestMomentType = "badge";
      bestMomentData = {
        badgeName: earnedBadge[0].name,
        badgeEmoji: earnedBadge[0].emoji,
      };
    }
  }

  // Badge conquistado mais recente
  const recentBadge = await db
    .select({ name: badges.name, emoji: badges.emoji })
    .from(userBadges)
    .innerJoin(badges, eq(userBadges.badgeId, badges.id))
    .where(eq(userBadges.userId, userId))
    .orderBy(desc(userBadges.earnedAt))
    .limit(1);

  const badgeEarnedName = recentBadge[0]?.name ?? null;
  const badgeEarnedEmoji = recentBadge[0]?.emoji ?? null;

  // Frase de encerramento via LLM
  const closingPhrase = await generateClosingPhrase({
    userName: user.name ?? "Participante",
    finalPosition,
    totalParticipants: Number(total),
    totalPoints,
    exactScoreCount,
    zebraCount,
    badgeEarnedName,
  });

  return {
    userId,
    userName: user.name ?? "Participante",
    userAvatar: user.avatarUrl,
    poolName: pool.name,
    tournamentName,
    poolStartDate: pool.createdAt,
    poolEndDate: pool.concludedAt,
    totalParticipants: Number(total),
    totalBets,
    exactScoreCount,
    correctResultCount,
    zebraCount,
    totalPoints,
    finalPosition,
    accuracyPct,
    bestMomentType,
    bestMomentData,
    badgeEarnedName,
    badgeEarnedEmoji,
    closingPhrase,
  };
}

// ─── GERAÇÃO DE FRASE VIA LLM ─────────────────────────────────────────────────

async function generateClosingPhrase(params: {
  userName: string;
  finalPosition: number;
  totalParticipants: number;
  totalPoints: number;
  exactScoreCount: number;
  zebraCount: number;
  badgeEarnedName: string | null;
}): Promise<string> {
  try {
    const response = await invokeLLM({
      messages: [
        {
          role: "system",
          content:
            "Você é o copywriter do Plakr!, uma plataforma de bolões esportivos brasileira. Escreva frases curtas, animadas e com personalidade — como um amigo que está comemorando junto. Use linguagem informal, brasileira. Máximo 2 frases. Sem emojis no texto.",
        },
        {
          role: "user",
          content: `Escreva uma frase de encerramento para ${params.userName} que ficou em ${params.finalPosition}º lugar de ${params.totalParticipants} participantes, fez ${params.totalPoints} pontos, acertou ${params.exactScoreCount} placares exatos e ${params.zebraCount} zebras.${params.badgeEarnedName ? ` Conquistou o badge "${params.badgeEarnedName}".` : ""} A frase deve terminar incentivando outras pessoas a se cadastrarem no Plakr! para fazer o seu próprio bolão.`,
        },
      ],
    });
    const content = response.choices?.[0]?.message?.content;
    return typeof content === "string" ? content : defaultClosingPhrase(params.finalPosition);
  } catch {
    return defaultClosingPhrase(params.finalPosition);
  }
}

function defaultClosingPhrase(position: number): string {
  if (position === 1) return "Você mandou muito bem! Agora convida os amigos para fazer o seu próprio bolão no Plakr!.";
  if (position <= 3) return "Pódio conquistado! Chama mais gente para o próximo bolão no Plakr!.";
  return "Foi uma boa batalha! Convida seus amigos para fazer o bolão de vocês no Plakr!.";
}

// ─── PALETA DE CORES ──────────────────────────────────────────────────────────

const C = {
  bg: "#0f0f1a",
  bgCard: "#1a1a2e",
  brand: "#6c63ff",
  brandLight: "#8b85ff",
  gold: "#fbbf24",
  silver: "#94a3b8",
  bronze: "#cd7c2f",
  green: "#22c55e",
  text: "#f1f5f9",
  muted: "#64748b",
  white: "#ffffff",
};

// ─── UTILITÁRIOS ──────────────────────────────────────────────────────────────

function x(str: string): string {
  return String(str ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function fmtDate(date: Date | null): string {
  if (!date) return "";
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    if ((cur + " " + word).trim().length <= maxChars) {
      cur = (cur + " " + word).trim();
    } else {
      if (cur) lines.push(cur);
      cur = word;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

function svgToPng(svgString: string): Promise<Buffer> {
  return sharp(Buffer.from(svgString)).png().toBuffer();
}

// ─── SLIDES SVG ───────────────────────────────────────────────────────────────

function slide1(d: RetrospectiveData): string {
  const period = d.poolStartDate && d.poolEndDate
    ? `${fmtDate(d.poolStartDate)} – ${fmtDate(d.poolEndDate)}`
    : d.poolStartDate ? `Desde ${fmtDate(d.poolStartDate)}` : "";

  return `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.bg}"/>
    <stop offset="100%" stop-color="#1a0a2e"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${C.brand}" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="${C.brand}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1920" fill="url(#bg)"/>
<circle cx="540" cy="700" r="500" fill="url(#glow)"/>
<circle cx="540" cy="700" r="300" fill="none" stroke="${C.brand}" stroke-width="2" stroke-opacity="0.3"/>
<text x="540" y="200" font-family="Arial,sans-serif" font-size="48" font-weight="bold" fill="${C.brand}" text-anchor="middle">Plakr!</text>
<text x="540" y="560" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}" text-anchor="middle">Retrospectiva do Bolão</text>
<text x="540" y="680" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.poolName)}</text>
${d.tournamentName ? `<text x="540" y="780" font-family="Arial,sans-serif" font-size="40" fill="${C.brandLight}" text-anchor="middle">${x(d.tournamentName)}</text>` : ""}
${period ? `<text x="540" y="860" font-family="Arial,sans-serif" font-size="32" fill="${C.muted}" text-anchor="middle">${x(period)}</text>` : ""}
<rect x="340" y="1000" width="400" height="140" rx="16" fill="${C.bgCard}"/>
<text x="540" y="1055" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">participantes</text>
<text x="540" y="1120" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="${C.brand}" text-anchor="middle">${d.totalParticipants}</text>
<text x="540" y="1350" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}" text-anchor="middle">a retrospectiva de</text>
<text x="540" y="1430" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.userName)}</text>
<text x="540" y="1860" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br</text>
</svg>`;
}

function slide2(d: RetrospectiveData): string {
  return `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.bg}"/>
    <stop offset="100%" stop-color="#0a1a2e"/>
  </linearGradient>
</defs>
<rect width="1080" height="1920" fill="url(#bg)"/>
<text x="540" y="160" font-family="Arial,sans-serif" font-size="40" fill="${C.muted}" text-anchor="middle">Seus números</text>
<text x="540" y="240" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.poolName)}</text>
<line x1="140" y1="290" x2="940" y2="290" stroke="${C.brand}" stroke-width="2" stroke-opacity="0.4"/>
<rect x="100" y="360" width="880" height="160" rx="20" fill="${C.bgCard}"/>
<text x="200" y="430" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}">Total de palpites</text>
<text x="880" y="450" font-family="Arial,sans-serif" font-size="80" font-weight="bold" fill="${C.brand}" text-anchor="end">${d.totalBets}</text>
<rect x="100" y="560" width="880" height="160" rx="20" fill="${C.bgCard}"/>
<text x="200" y="630" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}">Taxa de acerto</text>
<text x="880" y="650" font-family="Arial,sans-serif" font-size="80" font-weight="bold" fill="${C.green}" text-anchor="end">${d.accuracyPct}%</text>
<rect x="100" y="760" width="880" height="160" rx="20" fill="${C.bgCard}"/>
<text x="200" y="830" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}">Placares exatos</text>
<text x="880" y="850" font-family="Arial,sans-serif" font-size="80" font-weight="bold" fill="${C.gold}" text-anchor="end">${d.exactScoreCount}</text>
<rect x="100" y="960" width="880" height="160" rx="20" fill="${C.bgCard}"/>
<text x="200" y="1030" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}">Zebras acertadas</text>
<text x="880" y="1050" font-family="Arial,sans-serif" font-size="80" font-weight="bold" fill="${C.brandLight}" text-anchor="end">${d.zebraCount}</text>
<rect x="100" y="1160" width="880" height="160" rx="20" fill="${C.bgCard}"/>
<text x="200" y="1230" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}">Total de pontos</text>
<text x="880" y="1250" font-family="Arial,sans-serif" font-size="80" font-weight="bold" fill="${C.text}" text-anchor="end">${d.totalPoints}</text>
<text x="540" y="1860" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br</text>
</svg>`;
}

function slide3(d: RetrospectiveData): string {
  let title = "", value = "", detail = "", color = C.gold;

  if (d.bestMomentType === "exact_score") {
    const bd = d.bestMomentData as { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; points: number };
    title = "Placar Exato"; value = `${bd.homeScore} x ${bd.awayScore}`; detail = `${bd.homeTeam} vs ${bd.awayTeam} · +${bd.points} pts`; color = C.gold;
  } else if (d.bestMomentType === "zebra") {
    const bd = d.bestMomentData as { homeTeam: string; awayTeam: string; homeScore: number; awayScore: number; points: number };
    title = "Zebra Acertada"; value = `${bd.homeScore} x ${bd.awayScore}`; detail = `${bd.homeTeam} vs ${bd.awayTeam} · +${bd.points} pts`; color = C.brandLight;
  } else if (d.bestMomentType === "badge") {
    const bd = d.bestMomentData as { badgeName: string; badgeEmoji: string };
    title = "Badge Conquistado"; value = bd.badgeEmoji ?? "🏅"; detail = bd.badgeName; color = C.brand;
  } else {
    title = "Subida no Ranking"; value = "↑"; detail = "Maior subida do bolão"; color = C.green;
  }

  return `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.bg}"/>
    <stop offset="100%" stop-color="#1a1000"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${color}" stop-opacity="0.2"/>
    <stop offset="100%" stop-color="${color}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1920" fill="url(#bg)"/>
<circle cx="540" cy="960" r="600" fill="url(#glow)"/>
<text x="540" y="160" font-family="Arial,sans-serif" font-size="40" fill="${C.muted}" text-anchor="middle">Seu melhor momento</text>
<text x="540" y="240" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.poolName)}</text>
<line x1="140" y1="290" x2="940" y2="290" stroke="${color}" stroke-width="2" stroke-opacity="0.4"/>
<text x="540" y="600" font-family="Arial,sans-serif" font-size="44" fill="${color}" text-anchor="middle" font-weight="bold">${x(title)}</text>
<text x="540" y="850" font-family="Arial,sans-serif" font-size="160" font-weight="bold" fill="${color}" text-anchor="middle">${x(value)}</text>
<text x="540" y="1000" font-family="Arial,sans-serif" font-size="40" fill="${C.text}" text-anchor="middle">${x(detail)}</text>
<text x="540" y="1860" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br</text>
</svg>`;
}

function slide4(d: RetrospectiveData): string {
  const posColor = d.finalPosition === 1 ? C.gold : d.finalPosition === 2 ? C.silver : d.finalPosition === 3 ? C.bronze : C.brand;
  const posLabel = d.finalPosition === 1 ? "Campeão" : d.finalPosition === 2 ? "Vice-campeão" : d.finalPosition === 3 ? "3º lugar" : `${d.finalPosition}º lugar`;

  return `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.bg}"/>
    <stop offset="100%" stop-color="#0a0a0a"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${posColor}" stop-opacity="0.25"/>
    <stop offset="100%" stop-color="${posColor}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1920" fill="url(#bg)"/>
<circle cx="540" cy="900" r="550" fill="url(#glow)"/>
<text x="540" y="160" font-family="Arial,sans-serif" font-size="40" fill="${C.muted}" text-anchor="middle">Posição final</text>
<text x="540" y="240" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.poolName)}</text>
<line x1="140" y1="290" x2="940" y2="290" stroke="${posColor}" stroke-width="2" stroke-opacity="0.4"/>
<text x="540" y="700" font-family="Arial,sans-serif" font-size="52" fill="${C.muted}" text-anchor="middle">você ficou em</text>
<text x="540" y="900" font-family="Arial,sans-serif" font-size="200" font-weight="bold" fill="${posColor}" text-anchor="middle">${d.finalPosition}º</text>
<text x="540" y="1000" font-family="Arial,sans-serif" font-size="48" fill="${posColor}" text-anchor="middle">${x(posLabel)}</text>
<text x="540" y="1080" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}" text-anchor="middle">de ${d.totalParticipants} participantes</text>
<rect x="290" y="1160" width="500" height="140" rx="16" fill="${C.bgCard}"/>
<text x="540" y="1215" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">pontos totais</text>
<text x="540" y="1280" font-family="Arial,sans-serif" font-size="60" font-weight="bold" fill="${C.text}" text-anchor="middle">${d.totalPoints}</text>
${d.badgeEarnedName ? `
<text x="540" y="1420" font-family="Arial,sans-serif" font-size="32" fill="${C.muted}" text-anchor="middle">badge conquistado</text>
<text x="540" y="1510" font-family="Arial,sans-serif" font-size="64" text-anchor="middle">${x(d.badgeEarnedEmoji ?? "🏅")}</text>
<text x="540" y="1580" font-family="Arial,sans-serif" font-size="36" fill="${C.brandLight}" text-anchor="middle">${x(d.badgeEarnedName)}</text>
` : ""}
<text x="540" y="1860" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br</text>
</svg>`;
}

function slide5(d: RetrospectiveData): string {
  const lines = wrapText(d.closingPhrase, 28);
  return `<svg width="1080" height="1920" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="#1a0a2e"/>
    <stop offset="100%" stop-color="${C.bg}"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${C.brand}" stop-opacity="0.3"/>
    <stop offset="100%" stop-color="${C.brand}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1920" fill="url(#bg)"/>
<circle cx="540" cy="960" r="600" fill="url(#glow)"/>
<text x="540" y="200" font-family="Arial,sans-serif" font-size="56" font-weight="bold" fill="${C.brand}" text-anchor="middle">Plakr!</text>
${lines.map((line, i) => `<text x="540" y="${700 + i * 80}" font-family="Arial,sans-serif" font-size="44" fill="${C.text}" text-anchor="middle">${x(line)}</text>`).join("\n")}
<rect x="140" y="1300" width="800" height="120" rx="60" fill="${C.brand}"/>
<text x="540" y="1375" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="${C.white}" text-anchor="middle">Crie o seu bolão em plakr.com.br</text>
<text x="540" y="1860" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br</text>
</svg>`;
}

// ─── CARDS ────────────────────────────────────────────────────────────────────

function podiumCard(d: RetrospectiveData): string {
  const posColor = d.finalPosition === 1 ? C.gold : d.finalPosition === 2 ? C.silver : C.bronze;
  const posEmoji = d.finalPosition === 1 ? "🥇" : d.finalPosition === 2 ? "🥈" : "🥉";

  return `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.bg}"/>
    <stop offset="100%" stop-color="#1a0a2e"/>
  </linearGradient>
  <radialGradient id="glow" cx="50%" cy="50%" r="50%">
    <stop offset="0%" stop-color="${posColor}" stop-opacity="0.3"/>
    <stop offset="100%" stop-color="${posColor}" stop-opacity="0"/>
  </radialGradient>
</defs>
<rect width="1080" height="1080" fill="url(#bg)"/>
<circle cx="540" cy="540" r="500" fill="url(#glow)"/>
<rect x="20" y="20" width="1040" height="1040" rx="32" fill="none" stroke="${posColor}" stroke-width="4" stroke-opacity="0.6"/>
<text x="540" y="100" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="${C.brand}" text-anchor="middle">Plakr!</text>
<text x="540" y="340" font-family="Arial,sans-serif" font-size="160" text-anchor="middle">${posEmoji}</text>
<text x="540" y="500" font-family="Arial,sans-serif" font-size="64" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.userName)}</text>
<text x="540" y="580" font-family="Arial,sans-serif" font-size="40" fill="${posColor}" text-anchor="middle">${d.finalPosition}º lugar · ${d.totalPoints} pts</text>
<text x="540" y="660" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}" text-anchor="middle">${x(d.poolName)}</text>
<rect x="100" y="720" width="260" height="120" rx="16" fill="${C.bgCard}"/>
<text x="230" y="770" font-family="Arial,sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">exatos</text>
<text x="230" y="820" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${C.gold}" text-anchor="middle">${d.exactScoreCount}</text>
<rect x="410" y="720" width="260" height="120" rx="16" fill="${C.bgCard}"/>
<text x="540" y="770" font-family="Arial,sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">zebras</text>
<text x="540" y="820" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${C.brandLight}" text-anchor="middle">${d.zebraCount}</text>
<rect x="720" y="720" width="260" height="120" rx="16" fill="${C.bgCard}"/>
<text x="850" y="770" font-family="Arial,sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">acerto</text>
<text x="850" y="820" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${C.green}" text-anchor="middle">${d.accuracyPct}%</text>
<text x="540" y="1020" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br · Crie o seu bolão</text>
</svg>`;
}

function participantCard(d: RetrospectiveData): string {
  return `<svg width="1080" height="1080" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0%" stop-color="${C.bg}"/>
    <stop offset="100%" stop-color="#0f1a2e"/>
  </linearGradient>
</defs>
<rect width="1080" height="1080" fill="url(#bg)"/>
<rect x="20" y="20" width="1040" height="1040" rx="32" fill="none" stroke="${C.brand}" stroke-width="2" stroke-opacity="0.4"/>
<text x="540" y="100" font-family="Arial,sans-serif" font-size="36" font-weight="bold" fill="${C.brand}" text-anchor="middle">Plakr!</text>
<text x="540" y="320" font-family="Arial,sans-serif" font-size="72" font-weight="bold" fill="${C.text}" text-anchor="middle">${x(d.userName)}</text>
<text x="540" y="420" font-family="Arial,sans-serif" font-size="44" fill="${C.brand}" text-anchor="middle">${d.finalPosition}º de ${d.totalParticipants} · ${d.totalPoints} pts</text>
<text x="540" y="500" font-family="Arial,sans-serif" font-size="36" fill="${C.muted}" text-anchor="middle">${x(d.poolName)}</text>
<rect x="100" y="580" width="260" height="120" rx="16" fill="${C.bgCard}"/>
<text x="230" y="630" font-family="Arial,sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">palpites</text>
<text x="230" y="680" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${C.text}" text-anchor="middle">${d.totalBets}</text>
<rect x="410" y="580" width="260" height="120" rx="16" fill="${C.bgCard}"/>
<text x="540" y="630" font-family="Arial,sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">exatos</text>
<text x="540" y="680" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${C.gold}" text-anchor="middle">${d.exactScoreCount}</text>
<rect x="720" y="580" width="260" height="120" rx="16" fill="${C.bgCard}"/>
<text x="850" y="630" font-family="Arial,sans-serif" font-size="24" fill="${C.muted}" text-anchor="middle">acerto</text>
<text x="850" y="680" font-family="Arial,sans-serif" font-size="52" font-weight="bold" fill="${C.green}" text-anchor="middle">${d.accuracyPct}%</text>
<rect x="140" y="820" width="800" height="100" rx="50" fill="${C.brand}"/>
<text x="540" y="882" font-family="Arial,sans-serif" font-size="32" font-weight="bold" fill="${C.white}" text-anchor="middle">Crie o seu bolão em plakr.com.br</text>
<text x="540" y="1020" font-family="Arial,sans-serif" font-size="28" fill="${C.muted}" text-anchor="middle">plakr.com.br</text>
</svg>`;
}

// ─── GERAÇÃO E UPLOAD ─────────────────────────────────────────────────────────

export async function generateAndUploadRetrospective(
  poolId: number,
  userId: number
): Promise<{ retrospectiveId: number; shareCardUrl: string } | null> {
  const data = await calculateRetrospectiveData(poolId, userId);
  if (!data) return null;

  const suffix = `${poolId}-${userId}-${Date.now()}`;

  // Gerar os 5 slides como PNG em paralelo
  const [s1, s2, s3, s4, s5] = await Promise.all([
    svgToPng(slide1(data)).then((buf) => storagePut(`retrospectives/${suffix}-slide1.png`, buf, "image/png")),
    svgToPng(slide2(data)).then((buf) => storagePut(`retrospectives/${suffix}-slide2.png`, buf, "image/png")),
    svgToPng(slide3(data)).then((buf) => storagePut(`retrospectives/${suffix}-slide3.png`, buf, "image/png")),
    svgToPng(slide4(data)).then((buf) => storagePut(`retrospectives/${suffix}-slide4.png`, buf, "image/png")),
    svgToPng(slide5(data)).then((buf) => storagePut(`retrospectives/${suffix}-slide5.png`, buf, "image/png")),
  ]);

  // Gerar card de compartilhamento
  const isPodium = data.finalPosition <= 3;
  const cardPng = await svgToPng(isPodium ? podiumCard(data) : participantCard(data));
  const cardResult = await storagePut(`share-cards/${suffix}-card.png`, cardPng, "image/png");

  const db = await getDb();
  if (!db) return null;

  // Salvar retrospectiva no banco
  const retroResult = await db
    .insert(poolRetrospectives)
    .values({
      poolId,
      userId,
      poolName: data.poolName,
      tournamentName: data.tournamentName ?? undefined,
      poolStartDate: data.poolStartDate ?? undefined,
      poolEndDate: data.poolEndDate ?? undefined,
      totalParticipants: data.totalParticipants,
      totalBets: data.totalBets,
      exactScoreCount: data.exactScoreCount,
      correctResultCount: data.correctResultCount,
      zebraCount: data.zebraCount,
      totalPoints: data.totalPoints,
      finalPosition: data.finalPosition,
      accuracyPct: data.accuracyPct,
      bestMomentType: data.bestMomentType,
      bestMomentData: {
        ...data.bestMomentData,
        slide1Url: s1.url,
        slide2Url: s2.url,
        slide3Url: s3.url,
        slide4Url: s4.url,
        slide5Url: s5.url,
      },
      closingPhrase: data.closingPhrase,
    });

  // Obter o ID inserido via select (MySQL não retorna insertId diretamente no Drizzle)
  const [latestRetro] = await db
    .select({ id: poolRetrospectives.id })
    .from(poolRetrospectives)
    .where(and(eq(poolRetrospectives.poolId, poolId), eq(poolRetrospectives.userId, userId)))
    .orderBy(desc(poolRetrospectives.generatedAt))
    .limit(1);

  const retrospectiveId = latestRetro?.id ?? 0;

  // Salvar card no banco
  await db
    .insert(userShareCards).values({
      poolId,
      userId,
      cardType: isPodium ? "podium" : "participant",
      position: data.finalPosition,
      imageUrl: cardResult.url,
      imageKey: cardResult.key,
    })
    .onDuplicateKeyUpdate({
      set: {
        imageUrl: cardResult.url,
        imageKey: cardResult.key,
        cardType: isPodium ? "podium" : "participant",
        position: data.finalPosition,
        generatedAt: sql`now()`,
      },
    });

  // Notificar o usuário
  try {
    await createNotification({
      userId,
      poolId,
      type: "pool_concluded",
      title: "Sua retrospectiva está pronta! 🎉",
      message: `O bolão "${data.poolName}" foi encerrado. Veja como foi a sua jornada e compartilhe com seus amigos!`,
      actionUrl: `/pool/${poolId}/retrospectiva`,
      actionLabel: "Ver retrospectiva",
      priority: "high",
    });
  } catch {
    // Notificação não crítica
  }

  return {
    retrospectiveId,
    shareCardUrl: cardResult.url,
  };
}
