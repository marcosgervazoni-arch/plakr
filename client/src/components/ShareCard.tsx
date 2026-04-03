/**
 * ShareCard — geração de imagem de compartilhamento via Canvas 2D API
 * Não depende de captura DOM (html2canvas / html-to-image) — funciona em qualquer browser/mobile
 */
import { useRef, useCallback } from "react";

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
  // Palpite do usuário
  predictedScoreA?: number | null;
  predictedScoreB?: number | null;
  pointsEarned?: number | null;
  // Análise IA
  aiSummary?: string | null;
  // Gols
  goalsTimeline?: Array<{ min: number; player: string; team: "home" | "away" }> | null;
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

// Carrega uma imagem de URL como HTMLImageElement
async function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
    // Timeout de 3s para imagens lentas
    setTimeout(() => resolve(null), 3000);
  });
}

// Desenha texto com quebra de linha automática
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  const words = text.split(' ');
  let line = '';
  let currentY = y;
  for (const word of words) {
    const testLine = line + word + ' ';
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && line !== '') {
      ctx.fillText(line.trim(), x, currentY);
      line = word + ' ';
      currentY += lineHeight;
    } else {
      line = testLine;
    }
  }
  ctx.fillText(line.trim(), x, currentY);
  return currentY;
}

// Gera o card de compartilhamento via Canvas 2D API
async function generateCardCanvas(data: ShareCardData): Promise<HTMLCanvasElement> {
  const W = 720; // 360px * 2x
  const H = 540; // 270px * 2x
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;

  // ── Fundo com gradiente ──────────────────────────────────────────────────
  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#0f1117");
  grad.addColorStop(1, "#1a1f2e");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, H);

  // ── Borda sutil ──────────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, W - 2, H - 2);

  // ── Header: logo Plakr! ──────────────────────────────────────────────────
  // Logo badge
  ctx.fillStyle = "#f5c518";
  roundRect(ctx, 40, 32, 56, 56, 16);
  ctx.fill();
  ctx.fillStyle = "#000";
  ctx.font = "bold 28px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("P!", 68, 68);

  // Nome Plakr!
  ctx.fillStyle = "#f5c518";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("Plakr!", 108, 68);

  // Campeonato / rodada
  const tournamentLabel = [data.tournamentName, data.roundName].filter(Boolean).join(" · ") || "Bolão";
  ctx.fillStyle = "rgba(255,255,255,0.5)";
  ctx.font = "22px Arial, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(tournamentLabel, W - 40, 68);

  // ── Linha separadora ─────────────────────────────────────────────────────
  ctx.strokeStyle = "rgba(255,255,255,0.08)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(40, 108);
  ctx.lineTo(W - 40, 108);
  ctx.stroke();

  // ── Times ────────────────────────────────────────────────────────────────
  const centerY = 260;
  const teamAX = 180;
  const teamBX = W - 180;

  // Carregar escudos em paralelo
  const [imgA, imgB] = await Promise.all([
    data.teamAFlag ? loadImage(data.teamAFlag) : Promise.resolve(null),
    data.teamBFlag ? loadImage(data.teamBFlag) : Promise.resolve(null),
  ]);

  // Escudo time A
  if (imgA) {
    ctx.drawImage(imgA, teamAX - 48, centerY - 100, 96, 96);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(teamAX, centerY - 52, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  // Escudo time B
  if (imgB) {
    ctx.drawImage(imgB, teamBX - 48, centerY - 100, 96, 96);
  } else {
    ctx.fillStyle = "rgba(255,255,255,0.15)";
    ctx.beginPath();
    ctx.arc(teamBX, centerY - 52, 48, 0, Math.PI * 2);
    ctx.fill();
  }

  // Nome time A
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 26px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(truncate(data.teamAName, 12), teamAX, centerY + 16);

  // Nome time B
  ctx.fillText(truncate(data.teamBName, 12), teamBX, centerY + 16);

  // ── Placar ───────────────────────────────────────────────────────────────
  const hasResult = data.scoreA != null && data.scoreB != null;
  const finished = data.status === "finished";

  if (hasResult && finished) {
    // Placar real
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`${data.scoreA}`, teamAX + 80, centerY + 20);
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.fillText("×", W / 2, centerY + 20);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 72px Arial, sans-serif";
    ctx.fillText(`${data.scoreB}`, teamBX - 80, centerY + 20);
  } else {
    // VS
    ctx.fillStyle = "rgba(255,255,255,0.3)";
    ctx.font = "bold 48px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("VS", W / 2, centerY + 16);
  }

  // ── Palpite do usuário ───────────────────────────────────────────────────
  const hasBet = data.predictedScoreA != null && data.predictedScoreB != null;
  if (hasBet) {
    const betY = centerY + 60;
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    roundRect(ctx, W / 2 - 140, betY, 280, 52, 12);
    ctx.fill();

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "20px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("Meu palpite", W / 2, betY + 20);

    ctx.fillStyle = "#f5c518";
    ctx.font = "bold 24px Arial, sans-serif";
    ctx.fillText(`${data.predictedScoreA} × ${data.predictedScoreB}`, W / 2, betY + 44);
  }

  // ── Pontuação ────────────────────────────────────────────────────────────
  if (data.pointsEarned != null && data.pointsEarned > 0) {
    const ptsY = hasBet ? centerY + 128 : centerY + 72;
    ctx.fillStyle = "#22c55e";
    ctx.font = "bold 28px Arial, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(`+${data.pointsEarned} pts`, W / 2, ptsY);
  }

  // ── Data do jogo ─────────────────────────────────────────────────────────
  const dateStr = new Date(data.matchDate).toLocaleDateString("pt-BR", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
  ctx.fillStyle = "rgba(255,255,255,0.35)";
  ctx.font = "20px Arial, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText(dateStr, W / 2, H - 36);

  return canvas;
}

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.substring(0, maxLen - 1) + "…" : str;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
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

export function useShareCard(): UseShareCardReturn {
  const cardRef = useRef<HTMLDivElement | null>(null);
  // Dados do card atual (preenchidos pelo PoolPage via captureBlob(data))
  const dataRef = useRef<ShareCardData | null>(null);

  const captureBlob = useCallback(async (data?: ShareCardData): Promise<Blob | null> => {
    const d = data ?? dataRef.current;
    if (!d) {
      console.warn("[ShareCard] Nenhum dado disponível para gerar o card");
      return null;
    }
    console.log("[ShareCard] Gerando card via Canvas 2D...");
    try {
      const canvas = await generateCardCanvas(d);
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
      // 1ª tentativa: File System Access API (Chrome desktop)
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
      // 2ª tentativa: link download
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
    // Fallback: download
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
    // Fallback: link WhatsApp
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
    // Fallback: download
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
 * ShareCardVisual — componente visual (mantido para compatibilidade)
 * Agora é apenas decorativo — a imagem real é gerada via Canvas 2D
 */
export function ShareCardVisual({
  data,
  cardRef,
}: {
  data: ShareCardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const finished = data.status === "finished";
  const hasBet = data.predictedScoreA != null && data.predictedScoreB != null;
  const hasResult = data.scoreA != null && data.scoreB != null;
  const matchDateStr = new Date(data.matchDate).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div
      ref={cardRef}
      style={{
        position: "fixed",
        left: "-9999px",
        top: "0",
        width: "360px",
        opacity: 0,
        pointerEvents: "none",
        background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)",
        borderRadius: "16px",
        padding: "20px",
        fontFamily: "'Inter', 'Syne', sans-serif",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "#f5c518", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: "900", color: "#000",
          }}>P!</div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#f5c518" }}>Plakr!</span>
        </div>
        <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)" }}>
          {[data.tournamentName, data.roundName].filter(Boolean).join(" · ")}
        </span>
      </div>
      {/* Times */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
        <div style={{ textAlign: "center" }}>
          {data.teamAFlag && <img src={data.teamAFlag} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", marginBottom: "4px" }} crossOrigin="anonymous" />}
          <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, lineHeight: 1.2 }}>{data.teamAName}</p>
        </div>
        <div style={{ textAlign: "center", minWidth: "60px" }}>
          {hasResult && finished ? (
            <span style={{ fontSize: "28px", fontWeight: "900" }}>{data.scoreA} × {data.scoreB}</span>
          ) : (
            <span style={{ fontSize: "18px", color: "rgba(255,255,255,0.3)" }}>VS</span>
          )}
        </div>
        <div style={{ textAlign: "center" }}>
          {data.teamBFlag && <img src={data.teamBFlag} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", marginBottom: "4px" }} crossOrigin="anonymous" />}
          <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, lineHeight: 1.2 }}>{data.teamBName}</p>
        </div>
      </div>
      {/* Palpite */}
      {hasBet && (
        <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "8px", padding: "8px", textAlign: "center", marginBottom: "8px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: "0 0 2px" }}>Meu palpite</p>
          <p style={{ fontSize: "18px", fontWeight: "700", color: "#f5c518", margin: 0 }}>
            {data.predictedScoreA} × {data.predictedScoreB}
          </p>
        </div>
      )}
      {/* Pontuação */}
      {data.pointsEarned != null && data.pointsEarned > 0 && (
        <p style={{ textAlign: "center", fontSize: "14px", fontWeight: "700", color: "#22c55e", margin: "4px 0" }}>
          +{data.pointsEarned} pts
        </p>
      )}
      {/* Data */}
      <p style={{ textAlign: "center", fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "8px 0 0" }}>{matchDateStr}</p>
    </div>
  );
}
