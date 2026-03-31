/**
 * ShareCard — componente visual para geração de imagem de compartilhamento
 * Renderizado fora da viewport e capturado via html2canvas
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
  captureImage: () => Promise<string | null>;
  downloadImage: (filename?: string) => Promise<void>;
  shareToInstagram: () => Promise<void>;
  shareToWhatsApp: (text: string) => Promise<void>;
  shareToOthers: (text: string) => Promise<void>;
}

export function useShareCard(): UseShareCardReturn {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Captura o card e retorna um Blob PNG (mais compatível que dataURL no Android)
  const captureBlob = useCallback(async (): Promise<Blob | null> => {
    if (!cardRef.current) return null;
    try {
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: "#0f1117",
        scale: 2,
        useCORS: true,
        allowTaint: false,
        logging: false,
        width: cardRef.current.offsetWidth,
        height: cardRef.current.offsetHeight,
      });
      return await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png"));
    } catch (err) {
      console.error("[ShareCard] Erro ao capturar imagem:", err);
      return null;
    }
  }, []);

  // Mantido para compatibilidade (retorna dataURL a partir do blob)
  const captureImage = useCallback(async (): Promise<string | null> => {
    const blob = await captureBlob();
    if (!blob) return null;
    return URL.createObjectURL(blob);
  }, [captureBlob]);

  const downloadImage = useCallback(async (filename = "plakr-card.png") => {
    const blob = await captureBlob();
    if (!blob) return;

    // 1ª tentativa: File System Access API — mostra caixa de diálogo nativa "Salvar como" no Chrome desktop
    if (typeof window !== "undefined" && "showSaveFilePicker" in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: filename,
          types: [{ description: "Imagem PNG", accept: { "image/png": [".png"] } }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (e: any) {
        // AbortError = usuário cancelou o diálogo — não é erro
        if (e?.name === "AbortError") return;
        // Outro erro — tenta fallback
      }
    }

    // 2ª tentativa: abrir blob em nova aba — funciona em todos os browsers
    // O usuário pode salvar com Ctrl+S ou clique direito → Salvar imagem
    const blobUrl = URL.createObjectURL(blob);
    const newTab = window.open(blobUrl, "_blank");
    if (newTab) {
      // Revoga o URL após 60s para liberar memória
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }

    // 3ª tentativa: link programático (pode ser bloqueado, mas vale tentar)
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = filename;
    link.style.display = "none";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 5_000);
  }, [captureBlob]);

  const shareToInstagram = useCallback(async () => {
    const blob = await captureBlob();
    if (!blob) return;
    const file = new File([blob], "plakr-card.png", { type: "image/png" });

    // Web Share API com arquivo — abre seletor nativo no Android/iOS
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Meu palpite no Plakr!" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
        // Outro erro — tenta fallback
      }
    }

    // Fallback: baixa a imagem via blob URL e abre Instagram Stories
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "plakr-card.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      window.open("https://www.instagram.com/stories/create", "_blank");
    }, 800);
  }, [captureBlob]);

  const shareToWhatsApp = useCallback(async (text: string) => {
    const blob = await captureBlob();
    if (!blob) return;
    const file = new File([blob], "plakr-card.png", { type: "image/png" });

    // Web Share API com arquivo + texto — abre seletor nativo no Android/iOS
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: "Plakr! — Bolão Esportivo" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // Fallback: baixa a imagem e abre WhatsApp Web com texto
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = "plakr-card.png";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => {
      URL.revokeObjectURL(blobUrl);
      window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
    }, 800);
  }, [captureBlob]);

  const shareToOthers = useCallback(async (text: string) => {
    const blob = await captureBlob();
    if (!blob) return;
    const file = new File([blob], "plakr-card.png", { type: "image/png" });

    // Web Share API com arquivo (abre seletor nativo de apps)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], text, title: "Plakr! — Bolão Esportivo" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    } else if (navigator.share) {
      try {
        await navigator.share({ text, title: "Plakr! — Bolão Esportivo" });
        return;
      } catch (e: any) {
        if (e?.name === "AbortError") return;
      }
    }

    // Fallback final: copia texto para área de transferência
    navigator.clipboard?.writeText(text);
  }, [captureBlob]);

  return { cardRef, captureImage, downloadImage, shareToInstagram, shareToWhatsApp, shareToOthers };
}

/**
 * Componente visual do card — renderizado fora da viewport para captura
 */
export function ShareCardVisual({
  data,
  cardRef,
}: {
  data: ShareCardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
}) {
  const finished = data.status === "finished";
  const live = data.status === "live";
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
        background: "linear-gradient(135deg, #0f1117 0%, #1a1f2e 100%)",
        borderRadius: "16px",
        padding: "20px",
        fontFamily: "'Inter', 'Syne', sans-serif",
        color: "#ffffff",
        border: "1px solid rgba(255,255,255,0.08)",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header — logo + campeonato */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div style={{
            width: "28px", height: "28px", borderRadius: "8px",
            background: "#f5c518", display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "14px", fontWeight: "900", color: "#000",
          }}>P!</div>
          <span style={{ fontSize: "13px", fontWeight: "700", color: "#f5c518" }}>Plakr!</span>
        </div>
        <div style={{ textAlign: "right" }}>
          {data.tournamentName && (
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: 0 }}>{data.tournamentName}</p>
          )}
          {data.roundName && (
            <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", margin: 0 }}>{data.roundName}</p>
          )}
        </div>
      </div>

      {/* Status badge */}
      <div style={{ marginBottom: "12px" }}>
        <span style={{
          fontSize: "10px", fontWeight: "600", padding: "3px 8px", borderRadius: "20px",
          background: finished ? "rgba(34,197,94,0.15)" : live ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.08)",
          color: finished ? "#4ade80" : live ? "#f87171" : "rgba(255,255,255,0.5)",
          border: `1px solid ${finished ? "rgba(34,197,94,0.3)" : live ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.12)"}`,
        }}>
          {finished ? "Finalizado" : live ? "Ao vivo" : matchDateStr}
        </span>
      </div>

      {/* Times + placar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        {/* Time A */}
        <div style={{ textAlign: "center", flex: 1 }}>
          {data.teamAFlag && (
            <img src={data.teamAFlag} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", marginBottom: "4px" }} crossOrigin="anonymous" />
          )}
          <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, lineHeight: 1.2 }}>{data.teamAName}</p>
          {(finished || live) && hasResult && (
            <p style={{ fontSize: "32px", fontWeight: "900", margin: "4px 0 0", fontFamily: "monospace", color: "#f5c518" }}>{data.scoreA}</p>
          )}
        </div>

        {/* VS / Placar central */}
        <div style={{ textAlign: "center", padding: "0 12px" }}>
          {(finished || live) && hasResult ? (
            <span style={{ fontSize: "18px", fontWeight: "900", color: "rgba(255,255,255,0.3)" }}>×</span>
          ) : (
            <span style={{ fontSize: "13px", fontWeight: "700", color: "rgba(255,255,255,0.3)" }}>VS</span>
          )}
        </div>

        {/* Time B */}
        <div style={{ textAlign: "center", flex: 1 }}>
          {data.teamBFlag && (
            <img src={data.teamBFlag} alt="" style={{ width: "36px", height: "36px", objectFit: "contain", marginBottom: "4px" }} crossOrigin="anonymous" />
          )}
          <p style={{ fontSize: "12px", fontWeight: "700", margin: 0, lineHeight: 1.2 }}>{data.teamBName}</p>
          {(finished || live) && hasResult && (
            <p style={{ fontSize: "32px", fontWeight: "900", margin: "4px 0 0", fontFamily: "monospace", color: "#f5c518" }}>{data.scoreB}</p>
          )}
        </div>
      </div>

      {/* Timeline de gols */}
      {(finished || live) && data.goalsTimeline && data.goalsTimeline.length > 0 && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "10px", marginBottom: "12px",
          display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px",
        }}>
          {data.goalsTimeline.map((g, i) => (
            <div key={i} style={{
              display: "flex", alignItems: "center", gap: "4px", fontSize: "10px",
              justifyContent: g.team === "home" ? "flex-start" : "flex-end",
              gridColumn: g.team === "home" ? 1 : 2,
            }}>
              {g.team === "home" ? (
                <>
                  <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 4px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>{g.min}'</span>
                  <span>⚽</span>
                  <span style={{ color: "rgba(255,255,255,0.7)", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.player}</span>
                </>
              ) : (
                <>
                  <span style={{ color: "rgba(255,255,255,0.7)", maxWidth: "80px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.player}</span>
                  <span>⚽</span>
                  <span style={{ background: "rgba(255,255,255,0.1)", borderRadius: "4px", padding: "1px 4px", fontFamily: "monospace", color: "rgba(255,255,255,0.5)" }}>{g.min}'</span>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Palpite do usuário */}
      {hasBet && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "12px", marginBottom: "12px",
        }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.4)", margin: "0 0 6px", textAlign: "center" }}>Meu palpite</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "12px" }}>
            <span style={{ fontSize: "24px", fontWeight: "900", fontFamily: "monospace", color: "#f5c518" }}>
              {data.predictedScoreA} × {data.predictedScoreB}
            </span>
            {finished && data.pointsEarned != null && (
              <span style={{
                fontSize: "13px", fontWeight: "700", padding: "3px 10px", borderRadius: "20px",
                background: (data.pointsEarned ?? 0) > 0 ? "rgba(245,197,24,0.15)" : "rgba(255,255,255,0.08)",
                color: (data.pointsEarned ?? 0) > 0 ? "#f5c518" : "rgba(255,255,255,0.4)",
                border: `1px solid ${(data.pointsEarned ?? 0) > 0 ? "rgba(245,197,24,0.3)" : "rgba(255,255,255,0.12)"}`,
              }}>
                +{data.pointsEarned} pts
              </span>
            )}
          </div>
        </div>
      )}

      {/* Resumo IA (pré-jogo apenas, curto) */}
      {!finished && !live && data.aiSummary && (
        <div style={{
          borderTop: "1px solid rgba(255,255,255,0.08)", paddingTop: "10px", marginBottom: "12px",
        }}>
          <p style={{ fontSize: "10px", color: "rgba(245,197,24,0.7)", margin: "0 0 4px", fontWeight: "600" }}>⚡ Análise IA</p>
          <p style={{
            fontSize: "10px", color: "rgba(255,255,255,0.5)", margin: 0, lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {data.aiSummary}
          </p>
        </div>
      )}

      {/* Footer */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: "10px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>plakr.io</span>
        <span style={{ fontSize: "10px", color: "rgba(255,255,255,0.25)" }}>Faça seu bolão grátis</span>
      </div>
    </div>
  );
}
