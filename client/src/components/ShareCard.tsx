/**
 * ShareCard — geração de imagem de compartilhamento via Canvas 2D API
 * Formato Stories 9:16 (1080×1920) com 5 estados emocionais
 * Não depende de captura DOM — funciona em qualquer browser/mobile
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
  ctx.strokeStyle = "rgba(255,255,255,0.025)";
  ctx.lineWidth = 1;
  for (let i = -H; i < W + H; i += 60) {
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

  // ── 4. Header: Logo Plakr! ────────────────────────────────────────────────
  const headerY = 80;

  // Badge P!
  ctx.fillStyle = "#FFB800";
  roundRect(ctx, 60, headerY, 100, 100, 24);
  ctx.fill();
  ctx.fillStyle = "#0B0F1A";
  ctx.font = "bold 52px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P!", 110, headerY + 68);

  // Nome Plakr!
  ctx.fillStyle = "#FFB800";
  ctx.font = "bold 56px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Plakr!", 180, headerY + 68);

  // Campeonato
  const tournamentLabel = [data.tournamentName, data.roundName].filter(Boolean).join(" · ");
  if (tournamentLabel) {
    ctx.fillStyle = "rgba(255,255,255,0.45)";
    ctx.font = "36px Arial, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(truncate(tournamentLabel, 28), W - 60, headerY + 68);
  }

  // ── 5. Banner emocional (estado) ──────────────────────────────────────────
  const bannerY = 240;
  const bannerH = 200;

  // Fundo do banner com cor do estado
  ctx.fillStyle = stateItem.bgColor;
  roundRect(ctx, 40, bannerY, W - 80, bannerH, 32);
  ctx.fill();

  // Overlay escuro sutil para profundidade
  ctx.fillStyle = "rgba(0,0,0,0.15)";
  roundRect(ctx, 40, bannerY, W - 80, bannerH, 32);
  ctx.fill();

  // Emoji grande
  ctx.font = "80px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(stateItem.emoji, 80, bannerY + 118);

  // Título do estado
  ctx.fillStyle = stateItem.textColor;
  ctx.font = "bold 60px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(stateItem.title, 200, bannerY + 108);

  // ── 6. Área de times ──────────────────────────────────────────────────────
  const teamsAreaY = 510;
  const teamAX = W / 4;
  const teamBX = (W * 3) / 4;
  const shieldSize = 200;

  const [imgA, imgB] = await Promise.all([
    data.teamAFlag ? loadImage(data.teamAFlag) : Promise.resolve(null),
    data.teamBFlag ? loadImage(data.teamBFlag) : Promise.resolve(null),
  ]);

  // Escudo time A
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

  // Nomes dos times
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "bold 48px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(truncate(data.teamAName, 14), teamAX, teamsAreaY + shieldSize + 60);
  ctx.fillText(truncate(data.teamBName, 14), teamBX, teamsAreaY + shieldSize + 60);

  // ── 7. Placar / VS ────────────────────────────────────────────────────────
  const scoreCenterY = teamsAreaY + shieldSize / 2 + 30;

  if (finished && hasResult) {
    // Placar real grande
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 160px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${data.scoreA}`, teamAX + 120, scoreCenterY + 60);
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "bold 100px Arial, sans-serif";
    ctx.fillText("×", W / 2, scoreCenterY + 50);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = "bold 160px Arial, sans-serif";
    ctx.fillText(`${data.scoreB}`, teamBX - 120, scoreCenterY + 60);
  } else {
    // VS com data
    ctx.fillStyle = "rgba(255,255,255,0.25)";
    ctx.font = "bold 80px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VS", W / 2, scoreCenterY + 40);
    const dateStr = new Date(data.matchDate).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
    });
    ctx.fillStyle = "#FFB800";
    ctx.font = "bold 44px Arial, sans-serif";
    ctx.fillText(dateStr, W / 2, scoreCenterY + 110);
  }

  // ── 8. Palpite do usuário ─────────────────────────────────────────────────
  const betBoxY = teamsAreaY + shieldSize + 100;

  if (hasBet) {
    // Box do palpite
    ctx.fillStyle = "rgba(255,255,255,0.07)";
    roundRect(ctx, 80, betBoxY, W - 160, 180, 28);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,184,0,0.35)";
    ctx.lineWidth = 2;
    roundRect(ctx, 80, betBoxY, W - 160, 180, 28);
    ctx.stroke();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MEU PALPITE", W / 2, betBoxY + 52);

    ctx.fillStyle = "#FFB800";
    ctx.font = "bold 88px Arial, sans-serif";
    ctx.fillText(`${data.predictedScoreA}  ×  ${data.predictedScoreB}`, W / 2, betBoxY + 148);
  }

  // ── 9. Pontuação ──────────────────────────────────────────────────────────
  if (data.pointsEarned != null && data.pointsEarned > 0) {
    const ptsY = betBoxY + (hasBet ? 220 : 20);
    const ptsColor = state === "exactHit" ? "#00FF88" : state === "correctResult" ? "#FFB800" : "#FFFFFF";
    ctx.fillStyle = ptsColor;
    ctx.font = "bold 72px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`+${data.pointsEarned} pts`, W / 2, ptsY);
  }

  // ── 10. Copy emocional ────────────────────────────────────────────────────
  const copyBaseY = betBoxY + (hasBet ? 260 : 60);
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "44px Arial, sans-serif";
  ctx.textAlign = "center";
  wrapText(ctx, stateItem.copy, W / 2, copyBaseY, W - 160, 62);

  // ── 11. Nome do bolão (se disponível) ─────────────────────────────────────
  if (data.poolName) {
    const poolY = H - 260;
    ctx.fillStyle = "rgba(255,255,255,0.12)";
    roundRect(ctx, W / 2 - 300, poolY - 48, 600, 68, 18);
    ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "36px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(truncate(data.poolName, 32), W / 2, poolY);
  }

  // ── 12. Faixa de assinatura (rodapé) ─────────────────────────────────────
  const footerY = H - 160;
  const footerGrad = ctx.createLinearGradient(0, footerY, W, footerY + 160);
  footerGrad.addColorStop(0, "#FFB800");
  footerGrad.addColorStop(1, "#FFD700");
  ctx.fillStyle = footerGrad;
  ctx.fillRect(0, footerY, W, 160);

  // Overlay escuro sutil
  ctx.fillStyle = "rgba(0,0,0,0.12)";
  ctx.fillRect(0, footerY, W, 160);

  // Badge P! no rodapé
  ctx.fillStyle = "#0B0F1A";
  roundRect(ctx, 60, footerY + 30, 80, 80, 16);
  ctx.fill();
  ctx.fillStyle = "#FFB800";
  ctx.font = "bold 40px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P!", 100, footerY + 82);

  // Texto assinatura
  ctx.fillStyle = "#0B0F1A";
  ctx.font = "bold 52px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(cfg.signatureText, 160, footerY + 90);

  // Faixa escura no final
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
