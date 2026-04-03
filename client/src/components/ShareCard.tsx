/**
 * ShareCard — geração de imagem de compartilhamento via Canvas 2D API
 * Formato Stories 9:16 (1080×1920) com 5 estados emocionais
 * Não depende de captura DOM — funciona em qualquer browser/mobile
 *
 * Layout vertical (1920px de altura):
 *   0–14    : faixa dourada topo
 *   14–230  : header (logo Plakr! + campeonato)
 *   230–490 : banner emocional (emoji + título do estado)
 *   490–780 : área de times (escudos + nomes) — SEM placar sobreposto
 *   780–960 : placar grande / VS + data — zona exclusiva
 *   960–1180: palpite do usuário
 *  1180–1360: pontuação + badges de critérios
 *  1360–1580: copy emocional
 *  1580–1680: nome do bolão
 *  1680–1906: rodapé dourado (assinatura)
 *  1906–1920: faixa escura final
 */
import { useRef, useCallback } from "react";
import { DEFAULT_SHARE_CARD_CONFIG } from "../../../drizzle/schema";
import type { ShareCardStateConfig } from "../../../drizzle/schema";

export interface ShareCardData {
  teamAName: string;
  teamBName: string;
  teamAFlag?: string | null;
  teamBFlag?: string | null;
  scoreA?: number | null;
  scoreB?: number | null;
  matchDate: Date;
  status: string; // "scheduled" | "live" | "finished"
  roundName?: string | null;
  tournamentName?: string | null;
  poolName?: string | null;
  // Palpite do usuário
  predictedScoreA?: number | null;
  predictedScoreB?: number | null;
  pointsEarned?: number | null;
  // Config personalizada (do super admin)
  shareCardConfig?: ShareCardStateConfig | null;
}

interface UseShareCardReturn {
  cardRef: React.RefObject<HTMLDivElement | null>;
  captureImage: (data?: ShareCardData) => Promise<string | null>;
  captureBlob: (data?: ShareCardData) => Promise<Blob | null>;
  downloadImage: (data?: ShareCardData, filename?: string) => Promise<void>;
  downloadImageFromBlob: (blob: Blob, filename?: string) => Promise<void>;
  shareToInstagram: (data?: ShareCardData) => Promise<void>;
  shareToInstagramFromBlob: (blob: Blob) => Promise<void>;
  shareToWhatsApp: (text: string, data?: ShareCardData) => Promise<void>;
  shareToWhatsAppFromBlob: (blob: Blob, text: string) => Promise<void>;
  shareToOthers: (text: string, data?: ShareCardData) => Promise<void>;
  shareToOthersFromBlob: (blob: Blob, text: string) => Promise<void>;
}

// ─── Utilitários Canvas ───────────────────────────────────────────────────────

async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    setTimeout(() => resolve(null), 4000);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen - 1) + "…" : str;
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number,
  maxWidth: number, lineHeight: number
): number {
  const words = text.split(" ");
  let line = "";
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + " ";
    if (ctx.measureText(testLine).width > maxWidth && line !== "") {
      ctx.fillText(line.trim(), x, currentY);
      line = word + " ";
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

/** Formata chave de fase para exibição amigável */
function formatPhaseLabel(phase: string | null | undefined): string {
  if (!phase) return "";
  const map: Record<string, string> = {
    regular_season: "Temporada Regular",
    group_stage: "Fase de Grupos",
    "1st_phase": "1ª Fase",
    "2nd_phase": "2ª Fase",
    "3rd_phase": "3ª Fase",
    round_of_32: "16 Avos de Final",
    round_of_16: "Oitavas de Final",
    quarter_finals: "Quartas de Final",
    semi_finals: "Semifinais",
    third_place: "3º Lugar",
    final: "Final",
    apertura: "Apertura",
    clausura: "Clausura",
  };
  return map[phase] ?? phase.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Determinar estado emocional ──────────────────────────────────────────────

type CardState = "future" | "exactHit" | "correctResult" | "miss" | "noBet";

function getCardState(data: ShareCardData): CardState {
  const finished = data.status === "finished";
  const hasBet = data.predictedScoreA != null && data.predictedScoreB != null;
  const hasResult = data.scoreA != null && data.scoreB != null;

  if (!finished) return "future";
  if (!hasBet) return "noBet";
  if (!hasResult) return "noBet";

  const predA = data.predictedScoreA!;
  const predB = data.predictedScoreB!;
  const realA = data.scoreA!;
  const realB = data.scoreB!;

  if (predA === realA && predB === realB) return "exactHit";

  const predResult = predA > predB ? "A" : predA < predB ? "B" : "X";
  const realResult = realA > realB ? "A" : realA < realB ? "B" : "X";
  if (predResult === realResult) return "correctResult";

  return "miss";
}

// ─── Gerador principal do card Stories ───────────────────────────────────────

export async function generateStoriesCanvas(data: ShareCardData): Promise<HTMLCanvasElement> {
  const W = 1080;
  const H = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  const cfg = data.shareCardConfig ?? DEFAULT_SHARE_CARD_CONFIG;
  const state = getCardState(data);
  const stateItem = cfg[state];
  const finished = data.status === "finished";
  const hasBet = data.predictedScoreA != null && data.predictedScoreB != null;
  const hasResult = data.scoreA != null && data.scoreB != null;

  // ── 1. Fundo escuro com gradiente ─────────────────────────────────────────
  const bgGrad = ctx.createLinearGradient(0, 0, 0, H);
  bgGrad.addColorStop(0, "#0B0F1A");
  bgGrad.addColorStop(0.5, "#111827");
  bgGrad.addColorStop(1, "#0B0F1A");
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, W, H);

  // ── 2. Textura sutil (linhas diagonais) ───────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.018)";
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 80) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }

  // ── 3. Faixa dourada topo ─────────────────────────────────────────────────
  const topBarGrad = ctx.createLinearGradient(0, 0, W, 0);
  topBarGrad.addColorStop(0, "#FFB800");
  topBarGrad.addColorStop(0.5, "#FFD700");
  topBarGrad.addColorStop(1, "#FFB800");
  ctx.fillStyle = topBarGrad;
  ctx.fillRect(0, 0, W, 14);

  // ── 4. Header: Logo Plakr! + campeonato ──────────────────────────────────
  // Zona: y=14 até y=230 (altura 216px)
  const headerCenterY = 14 + 108; // centro vertical da zona header

  // Badge P!
  const badgeSize = 96;
  const badgeX = 60;
  const badgeY = headerCenterY - badgeSize / 2;
  ctx.fillStyle = "#FFB800";
  roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 22);
  ctx.fill();
  ctx.fillStyle = "#0B0F1A";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P!", badgeX + badgeSize / 2, badgeY + 66);

  // Nome Plakr!
  ctx.fillStyle = "#FFB800";
  ctx.font = "bold 54px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Plakr!", badgeX + badgeSize + 20, headerCenterY + 18);

  // Campeonato (direita)
  const rawPhase = formatPhaseLabel(data.roundName);
  const tournamentLabel = [data.tournamentName, rawPhase].filter(Boolean).join(" · ");
  if (tournamentLabel) {
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "34px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(truncate(tournamentLabel, 26), W - 60, headerCenterY + 18);
  }

  // Linha separadora sutil
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(40, 230);
  ctx.lineTo(W - 40, 230);
  ctx.stroke();

  // ── 5. Banner emocional (estado) ──────────────────────────────────────────
  // Zona: y=250 até y=490 (altura 240px)
  const bannerY = 250;
  const bannerH = 240;

  // Fundo do banner com cor do estado
  ctx.fillStyle = stateItem.bgColor;
  roundRect(ctx, 40, bannerY, W - 80, bannerH, 32);
  ctx.fill();

  // Overlay escuro sutil para profundidade
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  roundRect(ctx, 40, bannerY, W - 80, bannerH, 32);
  ctx.fill();

  // Emoji grande
  ctx.font = "100px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(stateItem.emoji, 80, bannerY + 154);

  // Título do estado
  ctx.fillStyle = stateItem.textColor;
  ctx.font = "bold 68px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(stateItem.title, 220, bannerY + 148);

  // ── 6. Área de times — APENAS escudos + nomes, SEM placar ─────────────────
  // Zona: y=510 até y=780 (altura 270px)
  const teamsAreaY = 510;
  const shieldSize = 220;
  const teamAX = W / 4;      // 270px do centro esquerdo
  const teamBX = (W * 3) / 4; // 810px do centro direito

  const [imgA, imgB] = await Promise.all([
    data.teamAFlag ? loadImage(data.teamAFlag) : Promise.resolve(null),
    data.teamBFlag ? loadImage(data.teamBFlag) : Promise.resolve(null),
  ]);

  // Escudo time A (centrado em teamAX, sem sobrepor o centro)
  if (imgA) {
    ctx.drawImage(imgA, teamAX - shieldSize / 2, teamsAreaY, shieldSize, shieldSize);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(teamAX, teamsAreaY + shieldSize / 2, shieldSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 80px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.teamAName.substring(0, 2).toUpperCase(), teamAX, teamsAreaY + shieldSize / 2 + 28);
  }

  // Escudo time B
  if (imgB) {
    ctx.drawImage(imgB, teamBX - shieldSize / 2, teamsAreaY, shieldSize, shieldSize);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    ctx.beginPath();
    ctx.arc(teamBX, teamsAreaY + shieldSize / 2, shieldSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 80px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(data.teamBName.substring(0, 2).toUpperCase(), teamBX, teamsAreaY + shieldSize / 2 + 28);
  }

  // Nomes dos times (abaixo dos escudos)
  ctx.fillStyle = "rgba(255,255,255,0.9)";
  ctx.font = "bold 46px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(truncate(data.teamAName, 13), teamAX, teamsAreaY + shieldSize + 56);
  ctx.fillText(truncate(data.teamBName, 13), teamBX, teamsAreaY + shieldSize + 56);

  // ── 7. Placar / VS — zona exclusiva, abaixo dos times ─────────────────────
  // Zona: y=800 até y=980 (altura 180px)
  const scoreZoneY = 800;
  const scoreCenterX = W / 2;

  if (finished && hasResult) {
    // Placar real — números grandes no centro, separados dos escudos
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 180px Arial, sans-serif";
    ctx.textAlign = "center";
    // Número A (esquerda do centro)
    ctx.fillText(`${data.scoreA}`, scoreCenterX - 160, scoreZoneY + 150);
    // Separador ×
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.font = "bold 100px Arial, sans-serif";
    ctx.fillText("×", scoreCenterX, scoreZoneY + 130);
    // Número B (direita do centro)
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 180px Arial, sans-serif";
    ctx.fillText(`${data.scoreB}`, scoreCenterX + 160, scoreZoneY + 150);
  } else {
    // VS com data do jogo
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "bold 90px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VS", scoreCenterX, scoreZoneY + 100);
    const dateStr = new Date(data.matchDate).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
    ctx.fillStyle = "#FFB800";
    ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillText(dateStr, scoreCenterX, scoreZoneY + 162);
  }

  // ── 8. Palpite do usuário ─────────────────────────────────────────────────
  // Zona: y=1020 até y=1240 (altura 220px)
  const betBoxY = 1020;
  if (hasBet) {
    // Fundo do box
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    roundRect(ctx, 80, betBoxY, W - 160, 220, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,184,0,0.4)";
    ctx.lineWidth = 2;
    roundRect(ctx, 80, betBoxY, W - 160, 220, 28);
    ctx.stroke();

    // Label
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MEU PALPITE", W / 2, betBoxY + 60);

    // Placar do palpite
    ctx.fillStyle = "#FFB800";
    ctx.font = "bold 110px Arial, sans-serif";
    ctx.fillText(`${data.predictedScoreA}  ×  ${data.predictedScoreB}`, W / 2, betBoxY + 180);
  }

  // ── 9. Pontuação total (apenas em jogos finalizados) ──────────────────────
  // Zona: y=1280 até y=1460 (altura 180px) — quando não há palpite, começa em 1060
  const ptsZoneY = hasBet ? 1280 : 1060;
  if (finished && data.pointsEarned != null && data.pointsEarned >= 0) {
    const ptsColor = state === "exactHit" ? "#00FF88" : state === "correctResult" ? "#FFB800" : state === "miss" ? "#FF6B6B" : "rgba(255,255,255,0.5)";

    // Badge de pontuação total
    const ptsLabel = data.pointsEarned > 0 ? `+${data.pointsEarned} pts` : "0 pts";
    ctx.fillStyle = ptsColor;
    ctx.font = "bold 88px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(ptsLabel, W / 2, ptsZoneY + 88);

    // Descrição do resultado
    const resultDesc =
      state === "exactHit" ? "Placar exato! 🎯" :
      state === "correctResult" ? "Resultado correto!" :
      state === "miss" ? "Não foi dessa vez..." :
      state === "noBet" ? "Sem palpite nesta partida" : "";
    if (resultDesc) {
      ctx.fillStyle = "rgba(255,255,255,0.45)";
      ctx.font = "40px Arial, sans-serif";
      ctx.fillText(resultDesc, W / 2, ptsZoneY + 148);
    }
  }

  // ── 10. Copy emocional ────────────────────────────────────────────────────
  // Posição dinâmica: abaixo da pontuação (se houver) ou do palpite
  let copyZoneY: number;
  if (finished && data.pointsEarned != null && data.pointsEarned >= 0) {
    copyZoneY = ptsZoneY + 220;
  } else if (hasBet) {
    copyZoneY = betBoxY + 280;
  } else {
    copyZoneY = 1060;
  }
  // Garantir que o copy não ultrapasse a zona do bolão
  copyZoneY = Math.min(copyZoneY, 1500);

  ctx.fillStyle = "rgba(255,255,255,0.8)";
  ctx.font = "48px Arial, sans-serif";
  ctx.textAlign = "center";
  wrapText(ctx, stateItem.copy, W / 2, copyZoneY + 50, W - 160, 70);

  // ── 11. Nome do bolão ─────────────────────────────────────────────────────
  // Fixo acima do rodapé
  if (data.poolName) {
    ctx.fillStyle = "rgba(255,255,255,0.1)";
    roundRect(ctx, W / 2 - 320, 1680, 640, 72, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(truncate(data.poolName, 30), W / 2, 1728);
  }

  // ── 12. Faixa de assinatura (rodapé) ─────────────────────────────────────
  // Zona: y=1780 até y=1906 (altura 126px)
  const footerY = 1780;
  const footerH = 126;
  const footerGrad = ctx.createLinearGradient(0, footerY, W, footerY + footerH);
  footerGrad.addColorStop(0, "#FFB800");
  footerGrad.addColorStop(1, "#FFD700");
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, footerY, W, footerH);

  // Overlay escuro sutil
  ctx.fillStyle = "rgba(0,0,0,0.10)";
  ctx.fillRect(0, footerY, W, footerH);

  // Badge P! no rodapé
  const footerBadgeSize = 72;
  ctx.fillStyle = "#0B0F1A";
  roundRect(ctx, 60, footerY + (footerH - footerBadgeSize) / 2, footerBadgeSize, footerBadgeSize, 14);
  ctx.fill();
  ctx.fillStyle = "#FFB800";
  ctx.font = "bold 36px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P!", 60 + footerBadgeSize / 2, footerY + (footerH - footerBadgeSize) / 2 + 50);

  // Texto assinatura
  ctx.fillStyle = "#0B0F1A";
  ctx.font = "bold 50px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(cfg.signatureText, 60 + footerBadgeSize + 18, footerY + footerH / 2 + 18);

  // ── 13. Faixa escura final ────────────────────────────────────────────────
  ctx.fillStyle = "#0B0F1A";
  ctx.fillRect(0, H - 14, W, 14);

  return canvas;
}

// ─── Hook useShareCard ────────────────────────────────────────────────────────

export function useShareCard(): UseShareCardReturn {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const dataRef = useRef<ShareCardData | null>(null);

  const captureBlob = useCallback(async (data?: ShareCardData): Promise<Blob | null> => {
    const d = data ?? dataRef.current;
    if (!d) {
      console.warn("[ShareCard] Nenhum dado disponível para gerar o card");
      return null;
    }
    console.log("[ShareCard] Gerando card Stories via Canvas 2D...");
    try {
      const canvas = await generateStoriesCanvas(d);
      return new Promise<Blob | null>((resolve) => {
        canvas.toBlob((blob) => {
          console.log("[ShareCard] Blob gerado:", blob?.size, "bytes");
          resolve(blob);
        }, "image/png");
      });
    } catch (err) {
      console.error("[ShareCard] Erro ao gerar card:", err);
      return null;
    }
  }, []);

  const captureImage = useCallback(async (data?: ShareCardData): Promise<string | null> => {
    const blob = await captureBlob(data);
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [captureBlob]);

  const downloadImageFromBlob = useCallback(async (blob: Blob, filename = "plakr-card.png") => {
    try {
      if ("showSaveFilePicker" in window) {
        try {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: filename,
            types: [{ description: "PNG Image", accept: { "image/png": [".png"] } }],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return;
        } catch (e: any) {
          if (e.name === "AbortError") return;
        }
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error("[ShareCard] Erro ao baixar imagem:", err);
    }
  }, []);

  const downloadImage = useCallback(async (data?: ShareCardData, filename = "plakr-card.png") => {
    const blob = await captureBlob(data);
    if (!blob) return;
    await downloadImageFromBlob(blob, filename);
  }, [captureBlob, downloadImageFromBlob]);

  const shareToInstagramFromBlob = useCallback(async (blob: Blob) => {
    try {
      const file = new File([blob], "plakr-card.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Meu palpite no Plakr!" });
        return;
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
    await downloadImageFromBlob(blob, "plakr-instagram.png");
  }, [downloadImageFromBlob]);

  const shareToInstagram = useCallback(async (data?: ShareCardData) => {
    const blob = await captureBlob(data);
    if (!blob) return;
    await shareToInstagramFromBlob(blob);
  }, [captureBlob, shareToInstagramFromBlob]);

  const shareToWhatsAppFromBlob = useCallback(async (blob: Blob, text: string) => {
    try {
      const file = new File([blob], "plakr-card.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "Meu palpite no Plakr!" });
        return;
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, "_blank");
  }, []);

  const shareToWhatsApp = useCallback(async (text: string, data?: ShareCardData) => {
    const blob = await captureBlob(data);
    if (!blob) {
      const encoded = encodeURIComponent(text);
      window.open(`https://wa.me/?text=${encoded}`, "_blank");
      return;
    }
    await shareToWhatsAppFromBlob(blob, text);
  }, [captureBlob, shareToWhatsAppFromBlob]);

  const shareToOthersFromBlob = useCallback(async (blob: Blob, text: string) => {
    try {
      const file = new File([blob], "plakr-card.png", { type: "image/png" });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], text, title: "Meu palpite no Plakr!" });
        return;
      }
      if (navigator.share) {
        await navigator.share({ text, title: "Meu palpite no Plakr!" });
        return;
      }
    } catch (e: any) {
      if (e.name === "AbortError") return;
    }
    await downloadImageFromBlob(blob, "plakr-card.png");
  }, [downloadImageFromBlob]);

  const shareToOthers = useCallback(async (text: string, data?: ShareCardData) => {
    const blob = await captureBlob(data);
    if (!blob) {
      if (navigator.share) {
        try { await navigator.share({ text, title: "Meu palpite no Plakr!" }); } catch {}
      }
      return;
    }
    await shareToOthersFromBlob(blob, text);
  }, [captureBlob, shareToOthersFromBlob]);

  return {
    cardRef,
    captureImage,
    captureBlob,
    downloadImage,
    downloadImageFromBlob,
    shareToInstagram,
    shareToInstagramFromBlob,
    shareToWhatsApp,
    shareToWhatsAppFromBlob,
    shareToOthers,
    shareToOthersFromBlob,
  };
}

/**
 * ShareCardVisual — componente visual mantido para compatibilidade de ref
 * A imagem real é gerada via Canvas 2D (generateStoriesCanvas)
 */
export function ShareCardVisual({
  data,
  cardRef,
}: {
  data: ShareCardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "360px",
        height: "640px",
        opacity: 0,
        pointerEvents: "none",
      }}
    />
  );
}
