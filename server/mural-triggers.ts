/**
 * mural-triggers.ts — Gatilhos automáticos do Mural do Bolão
 *
 * Este módulo é o ponto central de disparo de eventos automáticos para o feed
 * social de cada bolão. Cada função é chamada de forma não-bloqueante (fire-and-forget)
 * nos pontos certos do backend, garantindo que falhas no Mural nunca impactem
 * o fluxo principal.
 *
 * Padrão de uso:
 *   import { muralTrigger } from "../mural-triggers";
 *   muralTrigger.newMember({ poolId, userName, totalMembers }).catch(() => {});
 *
 * Aprovado pelos 40 especialistas em 18/04/2026.
 */

import logger from "./logger";
import { renderTemplate } from "./mural-templates";
import type { MuralPostType } from "../drizzle/schema";

// ─── HELPER INTERNO ───────────────────────────────────────────────────────────

async function createMuralEvent(
  poolId: number,
  type: MuralPostType,
  vars: Record<string, string>,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    const content = renderTemplate(type, vars);
    if (!content) return; // tipo sem template (ex: manual)

    const { getDb } = await import("./db");
    const db = await getDb();
    if (!db) return;

    const { muralPosts } = await import("../drizzle/schema");
    await db.insert(muralPosts).values({
      poolId,
      authorId: null, // evento automático do sistema
      type,
      content,
      eventMeta: metadata as Record<string, string> | undefined,
      isDeleted: false,
    });

    logger.debug({ poolId, type }, "[Mural] Auto event created");
  } catch (err) {
    // Nunca propagar erro — o Mural é não-crítico
    logger.warn({ poolId, type, err }, "[Mural] Failed to create auto event (non-critical)");
  }
}

// ─── GATILHOS PÚBLICOS ────────────────────────────────────────────────────────

export const muralTrigger = {
  /**
   * Novo membro entrou no bolão (joinByToken, joinPublic, approveMember)
   */
  async newMember(params: {
    poolId: number;
    userName: string;
    totalMembers?: number;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "new_member",
      {
        nome: params.userName,
        total_membros: String(params.totalMembers ?? ""),
      },
      { userName: params.userName, totalMembers: params.totalMembers }
    );
  },

  /**
   * Resultado de duelo X1 encerrado (win ou draw)
   */
  async x1Result(params: {
    poolId: number;
    challengerName: string;
    challengedName: string;
    challengerPoints: number;
    challengedPoints: number;
    winnerId: number | null;
    scope: string; // ex: "Rodada 3" ou "Fase de Grupos"
  }): Promise<void> {
    const isDraw = params.winnerId === null;
    const type: MuralPostType = isDraw ? "x1_result_draw" : "x1_result_win";
    await createMuralEvent(
      params.poolId,
      type,
      {
        vencedor: isDraw ? params.challengerName : (params.winnerId === null ? params.challengerName : params.challengerName),
        perdedor: isDraw ? params.challengedName : params.challengedName,
        pontos_vencedor: String(params.challengerPoints),
        pontos_perdedor: String(params.challengedPoints),
        escopo: params.scope,
      },
      {
        challengerName: params.challengerName,
        challengedName: params.challengedName,
        challengerPoints: params.challengerPoints,
        challengedPoints: params.challengedPoints,
        isDraw,
      }
    );
  },

  /**
   * Resultado de jogo registrado (match_result)
   */
  async matchResult(params: {
    poolId: number;
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
    round: string;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "match_result",
      {
        time_casa: params.teamA,
        time_fora: params.teamB,
        gols_casa: String(params.scoreA),
        gols_fora: String(params.scoreB),
        rodada: params.round,
      },
      { teamA: params.teamA, teamB: params.teamB, scoreA: params.scoreA, scoreB: params.scoreB }
    );
  },

  /**
   * Placar exato acertado por um único participante
   */
  async exactScoreSingle(params: {
    poolId: number;
    userName: string;
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "exact_score_single",
      {
        nome: params.userName,
        time_casa: params.teamA,
        time_fora: params.teamB,
        placar: `${params.scoreA}x${params.scoreB}`,
      },
      { userName: params.userName, teamA: params.teamA, teamB: params.teamB }
    );
  },

  /**
   * Placar exato acertado por múltiplos participantes
   */
  async exactScoreMulti(params: {
    poolId: number;
    userNames: string[];
    teamA: string;
    teamB: string;
    scoreA: number;
    scoreB: number;
  }): Promise<void> {
    if (params.userNames.length === 0) return;
    if (params.userNames.length === 1) {
      return this.exactScoreSingle({
        poolId: params.poolId,
        userName: params.userNames[0]!,
        teamA: params.teamA,
        teamB: params.teamB,
        scoreA: params.scoreA,
        scoreB: params.scoreB,
      });
    }
    const nomesList = params.userNames.slice(0, 3).join(", ") +
      (params.userNames.length > 3 ? ` +${params.userNames.length - 3}` : "");
    await createMuralEvent(
      params.poolId,
      "exact_score_multi",
      {
        nomes_lista: nomesList,
        time_casa: params.teamA,
        time_fora: params.teamB,
        placar: `${params.scoreA}x${params.scoreB}`,
      },
      { userNames: params.userNames, teamA: params.teamA, teamB: params.teamB }
    );
  },

  /**
   * Zebra confirmada — azarão venceu e alguém apostou nisso
   */
  async zebraResult(params: {
    poolId: number;
    userName: string;
    underdogTeam: string;
    favoriteTeam: string;
    scoreA: number;
    scoreB: number;
    round: string;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "zebra_result",
      {
        nome: params.userName,
        time_azarao: params.underdogTeam,
        time_favorito: params.favoriteTeam,
        placar: `${params.scoreA}x${params.scoreB}`,
        rodada: params.round,
      },
      { userName: params.userName, underdogTeam: params.underdogTeam }
    );
  },

  /**
   * Goleada confirmada — e alguém apostou nisso
   */
  async thrashingResult(params: {
    poolId: number;
    userName: string;
    winnerTeam: string;
    loserTeam: string;
    scoreA: number;
    scoreB: number;
    round: string;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "thrashing_result",
      {
        nome: params.userName,
        time_vencedor: params.winnerTeam,
        time_perdedor: params.loserTeam,
        placar: `${params.scoreA}x${params.scoreB}`,
        rodada: params.round,
      },
      { userName: params.userName, winnerTeam: params.winnerTeam }
    );
  },

  /**
   * Mudança de posição no ranking — assumiu 1º lugar
   */
  async rankChangeFirst(params: {
    poolId: number;
    userName: string;
    points: number;
    previousLeaderName: string;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "rank_change_first",
      {
        nome: params.userName,
        pontos: String(params.points),
        nome_anterior_lider: params.previousLeaderName,
      },
      { userName: params.userName, points: params.points }
    );
  },

  /**
   * Mudança de posição no ranking — entrou no top 3
   */
  async rankChangeTop3(params: {
    poolId: number;
    userName: string;
    newPosition: number;
    points: number;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "rank_change_top3",
      {
        nome: params.userName,
        posicao_nova: String(params.newPosition),
        pontos: String(params.points),
      },
      { userName: params.userName, newPosition: params.newPosition }
    );
  },

  /**
   * Mudança de posição no ranking — subiu 3+ posições
   */
  async rankChangeUp(params: {
    poolId: number;
    userName: string;
    oldPosition: number;
    newPosition: number;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "rank_change_up",
      {
        nome: params.userName,
        posicao_anterior: String(params.oldPosition),
        posicao_nova: String(params.newPosition),
      },
      { userName: params.userName, oldPosition: params.oldPosition, newPosition: params.newPosition }
    );
  },

  /**
   * Badge/conquista desbloqueada por um participante
   */
  async badgeUnlocked(params: {
    poolId: number;
    userName: string;
    badgeName: string;
    badgeDescription: string;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "badge_unlocked",
      {
        nome: params.userName,
        nome_badge: params.badgeName,
        descricao_badge: params.badgeDescription,
      },
      { userName: params.userName, badgeName: params.badgeName }
    );
  },

  /**
   * Bolão encerrado — campeão definido
   */
  async poolEnded(params: {
    poolId: number;
    winnerName: string;
    poolName: string;
    winnerPoints: number;
    totalParticipants: number;
  }): Promise<void> {
    await createMuralEvent(
      params.poolId,
      "pool_ended",
      {
        nome_campeao: params.winnerName,
        nome_bolao: params.poolName,
        pontos_campeao: String(params.winnerPoints),
        total_participantes: String(params.totalParticipants),
      },
      {
        winnerName: params.winnerName,
        winnerPoints: params.winnerPoints,
        totalParticipants: params.totalParticipants,
      }
    );
  },
};
