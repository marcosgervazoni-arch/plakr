/**
 * GameCard — Card de jogo para a PoolPage
 *
 * Extraído de PoolPage.tsx (C1) para reduzir o tamanho do arquivo principal.
 * Contém: GoalEvent, MatchStats, GameCardProps, GameCard
 */
import { useShareCard, ShareCardVisual } from "@/components/ShareCard";
import { getPhaseLabel } from "@shared/phaseNames";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Check,
  ChevronDown,
  Copy,
  Download,
  Loader2,
  Lock,
  RefreshCw,
  ScrollText,
  Share2,
  Sparkles,
} from "lucide-react";
import { useState, useRef } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import BetBreakdownBadges from "@/components/BetBreakdownBadges";

export interface GoalEvent {
  min: string;
  team: "home" | "away";
  player: string;
  type: string;
}
export interface MatchStats {
  homePossession?: number;
  awayPossession?: number;
  homeShots?: number;
  awayShots?: number;
  homeShotsOnTarget?: number;
  awayShotsOnTarget?: number;
  homeCorners?: number;
  awayCorners?: number;
  homeYellow?: number;
  awayYellow?: number;
  homeRed?: number;
  awayRed?: number;
}
export interface GameCardProps {
  game: {
    id: number;
    teamAName: string | null;
    teamBName: string | null;
    teamAFlag: string | null;
    teamBFlag: string | null;
    scoreA: number | null;
    scoreB: number | null;
    matchDate: Date;
    status: string;
    phase: string | null;
    roundNumber?: number | null;
    aiSummary?: string | null;
    aiNarration?: string | null;
    aiPrediction?: {
      homeWin: number; draw: number; awayWin: number;
      homeForm: string[]; awayForm: string[];
      aiRecommendation: string;
      comparison?: {
        total?: { home: string; away: string } | null;
        poisson?: { home: string; away: string } | null;
        forme?: { home: string; away: string } | null;
        att?: { home: string; away: string } | null;
        def?: { home: string; away: string } | null;
        h2h?: { home: string; away: string } | null;
        goals?: { home: string; away: string } | null;
      } | null;
    } | null;
    goalsTimeline?: GoalEvent[] | null;
    matchStatistics?: MatchStats | null;
  };
  myBet: {
    predictedScoreA: number;
    predictedScoreB: number;
    pointsEarned?: number | null;
    pointsExactScore?: number | null;
    pointsCorrectResult?: number | null;
    pointsTotalGoals?: number | null;
    pointsGoalDiff?: number | null;
    pointsOneTeamGoals?: number | null;
    pointsLandslide?: number | null;
    pointsZebra?: number | null;
    isZebra?: boolean | null;
  } | undefined;
  open: boolean;
  finished: boolean;
  live: boolean;
  betA: string;
  betB: string;
  hasBet: boolean;
  poolId: number;
  betInputs: Record<number, { a: string; b: string }>;
  setBetInputs: React.Dispatch<React.SetStateAction<Record<number, { a: string; b: string }>>>;
  handleBetSubmit: (gameId: number) => void;
  placeBetPending: boolean;
  myRankPosition?: number | null;
  showPhaseLabel?: boolean;
  shareCardConfig?: import("../../../drizzle/schema").ShareCardStateConfig | null;
  predictionReliable?: boolean;
}
function GameCard({
  game, myBet, open, finished, live, betA, betB, hasBet, poolId,
  betInputs, setBetInputs, handleBetSubmit, placeBetPending, myRankPosition, showPhaseLabel, shareCardConfig, predictionReliable,
}: GameCardProps) {
  const [analysisOpen, setAnalysisOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareVisible, setShareVisible] = useState(false); // controla animação slide-up
  const [cardPreviewUrl, setCardPreviewUrl] = useState<string | null>(null);
  const [cardPreviewBlob, setCardPreviewBlob] = useState<Blob | null>(null);
  const [cardPreviewLoading, setCardPreviewLoading] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharingInstagram, setIsSharingInstagram] = useState(false);
  const [isSharingWhatsApp, setIsSharingWhatsApp] = useState(false);
  const [isSharingOthers, setIsSharingOthers] = useState(false);
  // Swipe-down para fechar
  const swipePanelRef = useRef<HTMLDivElement | null>(null);
  const swipeStartY = useRef<number | null>(null);
  const swipeDeltaY = useRef(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const handleSwipeStart = (e: React.TouchEvent) => {
    swipeStartY.current = e.touches[0].clientY;
    swipeDeltaY.current = 0;
  };
  const handleSwipeMove = (e: React.TouchEvent) => {
    if (swipeStartY.current === null) return;
    const delta = e.touches[0].clientY - swipeStartY.current;
    if (delta > 0) { swipeDeltaY.current = delta; setSwipeOffset(delta); }
  };
  const handleSwipeEnd = () => {
    if (swipeDeltaY.current > 80) { closeShare(); }
    else { setSwipeOffset(0); }
    swipeStartY.current = null;
  };
  // Hook de compartilhamento com imagem (declarado antes do openShare para estar disponível)
  const { cardRef: shareCardRef, captureBlob, captureImage, downloadImage, downloadImageFromBlob, shareToInstagram, shareToInstagramFromBlob, shareToWhatsApp, shareToWhatsAppFromBlob, shareToOthers, shareToOthersFromBlob } = useShareCard();
  const shareCardData = {
    teamAName: game.teamAName ?? "Time A",
    teamBName: game.teamBName ?? "Time B",
    teamAFlag: game.teamAFlag,
    teamBFlag: game.teamBFlag,
    scoreA: game.scoreA,
    scoreB: game.scoreB,
    matchDate: game.matchDate,
    status: finished ? "finished" : live ? "live" : "scheduled",
    roundName: game.phase,
    aiSummary: game.aiSummary,
    goalsTimeline: game.goalsTimeline as Array<{ min: number; player: string; team: "home" | "away" }> | null,
    predictedScoreA: myBet?.predictedScoreA,
    predictedScoreB: myBet?.predictedScoreB,
    pointsEarned: myBet?.pointsEarned,
    shareCardConfig: shareCardConfig ?? undefined,
  };
  // Abrir o modal: captura o Blob via Canvas 2D (não depende de DOM)
  const openShare = async () => {
    // Inicia loading e abre o modal imediatamente
    setCardPreviewLoading(true);
    setShareOpen(true);
    requestAnimationFrame(() => requestAnimationFrame(() => setShareVisible(true)));
    // Captura o card via Canvas 2D passando os dados diretamente
    try {
      const blob = await captureBlob(shareCardData);
      if (blob) {
        setCardPreviewBlob(blob);
        setCardPreviewUrl(URL.createObjectURL(blob));
      }
    } catch (err) {
      console.error("[ShareCard] Erro ao capturar preview:", err);
    } finally {
      setCardPreviewLoading(false);
    }
  };
  const closeShare = () => {
    setShareVisible(false);
    setSwipeOffset(0);
    setTimeout(() => {
      setShareOpen(false);
      // Limpa a URL ao fechar para não vazar memória
      if (cardPreviewUrl) URL.revokeObjectURL(cardPreviewUrl);
      setCardPreviewUrl(null);
      setCardPreviewBlob(null);
    }, 300);
  };

  // Busca análise do palpite apenas quando o painel é aberto e o jogo está finalizado
  const { data: betAnalysisText, isLoading: betAnalysisLoading } = trpc.pools.getBetAnalysis.useQuery(
    { gameId: game.id, poolId },
    { enabled: analysisOpen && finished && hasBet, staleTime: 10 * 60 * 1000 }
  );
  // Calcula urgência do prazo
  const minutesUntilDeadline = open && !finished
    ? Math.floor((new Date(game.matchDate).getTime() - Date.now()) / 60000)
    : null;
  const isUrgent = minutesUntilDeadline !== null && minutesUntilDeadline <= 120;
  const isCritical = minutesUntilDeadline !== null && minutesUntilDeadline <= 30;

  const urgencyLabel = isCritical
    ? `Fecha em ${minutesUntilDeadline}min`
    : isUrgent
    ? `Fecha em ${Math.floor(minutesUntilDeadline! / 60)}h ${minutesUntilDeadline! % 60}min`
    : null;

  // Helpers de compartilhamento
  const shareText = finished
    ? hasBet
      ? `Jogo: ${game.teamAName} ${game.scoreA} × ${game.scoreB} ${game.teamBName}\nMeu palpite: ${myBet?.predictedScoreA} × ${myBet?.predictedScoreB} (+${myBet?.pointsEarned ?? 0} pts)\nPlakr — plataforma de bolões esportivos`
      : `${game.teamAName} ${game.scoreA} × ${game.scoreB} ${game.teamBName}\nPlakr — plataforma de bolões esportivos`
    : hasBet
      ? `Meu palpite: ${game.teamAName} ${myBet?.predictedScoreA} × ${myBet?.predictedScoreB} ${game.teamBName}\nPlakr — plataforma de bolões esportivos`
      : `${game.teamAName} vs ${game.teamBName}\nPlakr — plataforma de bolões esportivos`;

  const handleShareWhatsApp = async () => {
    setIsSharingWhatsApp(true);
    try {
      if (cardPreviewBlob) await shareToWhatsAppFromBlob(cardPreviewBlob, shareText);
      else await shareToWhatsApp(shareText, shareCardData);
    } finally { setIsSharingWhatsApp(false); }
  };
  const handleShareInstagram = async () => {
    setIsSharingInstagram(true);
    try {
      if (cardPreviewBlob) await shareToInstagramFromBlob(cardPreviewBlob);
      else await shareToInstagram(shareCardData);
    } finally { setIsSharingInstagram(false); }
  };
  const handleDownloadImage = async () => {
    setIsDownloading(true);
    try {
      const filename = `plakr-${(game.teamAName ?? "time-a").toLowerCase().replace(/\s+/g, "-")}-vs-${(game.teamBName ?? "time-b").toLowerCase().replace(/\s+/g, "-")}.png`;
      if (cardPreviewBlob) await downloadImageFromBlob(cardPreviewBlob, filename);
      else await downloadImage(shareCardData, filename);
    } catch {
      toast.error("Não foi possível baixar a imagem.");
    } finally { setIsDownloading(false); }
  };
  const handleCopyLink = () => {
    navigator.clipboard?.writeText(shareText);
    toast.success("Copiado para a área de transferência!");
  };
  const handleShareOthers = async () => {
    setIsSharingOthers(true);
    try {
      if (cardPreviewBlob) await shareToOthersFromBlob(cardPreviewBlob, shareText);
      else await shareToOthers(shareText, shareCardData);
    } finally { setIsSharingOthers(false); }
  };

  return (
    <>
    <div
      className={`bg-card transition-all border-l-2 border-[#FFB800]/60 ${
        live ? "bg-red-500/5" : finished ? "opacity-80" : ""
      }`}
    >
      {/* Linha de status + data */}
      <div className={`px-4 py-2 flex items-center justify-between border-b ${
        live ? "border-red-500/20 bg-red-500/10" : "border-border/20 bg-muted/10"
      }`}>
        <div className="flex items-center gap-2">
          {live && (
            <span className="flex items-center gap-1 text-xs font-semibold text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              AO VIVO
            </span>
          )}
          {finished && <span className="text-xs font-medium text-green-400">Encerrado</span>}
          {!live && !finished && (
            <span className="text-xs text-muted-foreground">
              {open ? "Aberto para palpites" : "Prazo encerrado"}
            </span>
          )}
          {/* Rodada/Fase — exibido apenas quando showPhaseLabel=true (modo simples) */}
          {showPhaseLabel && (game.phase || game.roundNumber != null) && (
            <span className="text-xs font-medium text-primary/80 bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
              {game.roundNumber != null
                ? `Rodada ${game.roundNumber}`
                : getPhaseLabel(game.phase!)}
            </span>
          )}
          {/* Indicador de urgência */}
          {urgencyLabel && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              isCritical
                ? "bg-red-500/15 text-red-400 border border-red-500/25"
                : "bg-primary/15 text-primary border border-primary/25"
            }`}>
              <span className={`w-1 h-1 rounded-full ${
                isCritical ? "bg-red-400 animate-pulse" : "bg-primary"
              }`} />
              {urgencyLabel}
            </span>
          )}
        </div>
        <span className="text-xs text-muted-foreground">
          {format(new Date(game.matchDate), "dd/MM 'às' HH:mm", { locale: ptBR })}
        </span>
      </div>

      {/* Corpo: Time A | Centro | Time B */}
      <div className="px-4 py-4">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          {/* Time A */}
          <div className="text-right">
            {game.teamAFlag ? (
              <img
                src={game.teamAFlag} alt=""
                className="w-8 h-8 object-contain ml-auto mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : null}
            <p className="font-bold text-sm leading-tight">{game.teamAName ?? "Time A"}</p>
            {finished && game.scoreA !== null && (
              <p className="text-2xl font-black text-foreground font-mono mt-1">{game.scoreA}</p>
            )}
          </div>

          {/* Centro */}
          <div className="flex flex-col items-center gap-2 min-w-[110px]">
            {finished && game.scoreA !== null && game.scoreB !== null && (
              <div className="text-xs text-muted-foreground font-medium">Resultado</div>
            )}
            {open && !finished ? (
              <div className="flex items-center gap-1.5">
                <Input
                  type="number" min={0} max={99} placeholder="0" value={betA}
                  onChange={(e) => setBetInputs((prev) => ({ ...prev, [game.id]: { a: e.target.value, b: prev[game.id]?.b ?? betB } }))}
                  className="w-12 text-center h-10 text-base font-bold p-0"
                  inputMode="numeric"
                />
                <span className="text-muted-foreground/70 font-bold text-sm select-none">VS</span>
                <Input
                  type="number" min={0} max={99} placeholder="0" value={betB}
                  onChange={(e) => setBetInputs((prev) => ({ ...prev, [game.id]: { a: prev[game.id]?.a ?? betA, b: e.target.value } }))}
                  className="w-12 text-center h-10 text-base font-bold p-0"
                  inputMode="numeric"
                />
                {/* Botão confirmar — ícone inline discreto */}
                <button
                  onClick={() => handleBetSubmit(game.id)}
                  disabled={placeBetPending}
                  title={hasBet ? "Atualizar palpite" : "Salvar palpite"}
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all bg-primary/10 hover:bg-primary/25 text-primary disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  {placeBetPending ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : hasBet ? (
                    <RefreshCw className="w-3.5 h-3.5" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ) : hasBet ? (
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1">Meu palpite</p>
                <p className="text-xl font-black text-primary font-mono">
                  {myBet!.predictedScoreA} × {myBet!.predictedScoreB}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-xs text-muted-foreground/60">
                <Lock className="w-3 h-3" />
                {finished ? "Sem palpite" : "Encerrado"}
              </div>
            )}
            {finished && hasBet && (
              <p className={`text-sm font-bold font-mono ${
                (myBet!.pointsEarned ?? 0) > 0 ? "text-primary" : "text-muted-foreground"
              }`}>
                +{myBet!.pointsEarned ?? 0} pts
              </p>
            )}

          </div>

          {/* Time B */}
          <div className="text-left">
            {game.teamBFlag ? (
              <img
                src={game.teamBFlag} alt=""
                className="w-8 h-8 object-contain mr-auto mb-1"
                onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
              />
            ) : null}
            <p className="font-bold text-sm leading-tight">{game.teamBName ?? "Time B"}</p>
            {finished && game.scoreB !== null && (
              <p className="text-2xl font-black text-foreground font-mono mt-1">{game.scoreB}</p>
            )}
          </div>
        </div>

        {/* Timeline de gols — visível em ao vivo e finalizado */}
        {(finished || live) && game.goalsTimeline && game.goalsTimeline.length > 0 && (
          <div className="mt-3 border-t border-border/20 pt-3">
            <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
              {game.goalsTimeline.map((g, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-1 text-xs ${
                    g.team === "home" ? "col-start-1 justify-start" : "col-start-2 justify-end flex-row-reverse"
                  }`}
                >
                  <span className="text-[10px] font-mono bg-muted/40 px-1 py-0.5 rounded text-muted-foreground">{g.min}'</span>
                  <span className="text-[10px]">⚽</span>
                  <span className="text-[10px] text-foreground/80 truncate max-w-[80px]">{g.player}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Badges compactos de pontuação + posição no ranking */}
        {finished && hasBet && (
          <div className="mt-3 flex flex-wrap justify-center gap-1">
            {myRankPosition != null && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-bold bg-yellow-500/15 border-yellow-500/30 text-yellow-400 font-mono">
                #{myRankPosition}
              </span>
            )}
            <BetBreakdownBadges bet={myBet!} compact />
            {(myBet!.pointsEarned ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-bold bg-primary/15 border-primary/30 text-primary font-mono">
                ⭐ +{myBet!.pointsEarned}
              </span>
            )}
          </div>
        )}

        {/* Barra de ações — Compartilhar + Ver análise */}
        {(hasBet || finished || !finished) && (
          <div className="mt-3 border-t border-border/20 pt-2 flex items-center justify-between">
            <button
              onClick={() => { if (shareOpen) closeShare(); else openShare(); }}
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1.5 rounded-lg hover:bg-muted/30"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartilhar
            </button>
            {(finished || !finished) && (
              <button
                onClick={() => setAnalysisOpen((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors px-2 py-1.5 rounded-lg hover:bg-primary/10"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {analysisOpen ? "Fechar análise" : "Ver análise"}
                <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${analysisOpen ? "rotate-180" : ""}`} />
              </button>
            )}
          </div>
        )}

        {/* Modal de compartilhamento — bottom-sheet (portal para document.body) */}
        {shareOpen && createPortal(
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}
            onClick={(e) => { if (e.target === e.currentTarget) closeShare(); }}
          >
            {/* Backdrop opaco */}
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(0,0,0,0.85)',
                zIndex: 0,
                opacity: shareVisible ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
              onClick={() => closeShare()}
            />
            <div
              ref={swipePanelRef}
              onTouchStart={handleSwipeStart}
              onTouchMove={handleSwipeMove}
              onTouchEnd={handleSwipeEnd}
              style={{
                position: 'relative',
                zIndex: 1,
                width: '100%',
                maxWidth: '24rem',
                margin: '0 auto',
                transform: `translateY(${shareVisible ? swipeOffset : '100%'}px)`,
                transition: swipeOffset > 0 ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
                opacity: shareVisible ? 1 : 0,
              }}
              className="bg-card border border-border/40 rounded-t-2xl p-5 space-y-4 shadow-2xl"
            >
              {/* Handle drag indicator */}
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto" />
              {/* Header */}
              <div className="text-center">
                <p className="font-semibold text-sm">Compartilhar jogo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Compartilhe o resultado e sua pontuação</p>
              </div>
              {/* Preview do card gerado */}
              <div className="rounded-xl overflow-hidden border border-border/20 bg-muted/10 flex items-center justify-center min-h-[80px]">
                {cardPreviewLoading && (
                  <div className="flex flex-col items-center gap-2 py-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">Gerando pré-visualização...</span>
                  </div>
                )}
                {!cardPreviewLoading && cardPreviewUrl && (
                  <img src={cardPreviewUrl} alt="Preview do card" className="w-full h-auto object-contain rounded-xl" />
                )}
                {!cardPreviewLoading && !cardPreviewUrl && (
                  <div className="flex items-center gap-4 px-4 py-3 w-full">
                    <div className="flex flex-col items-center gap-1 flex-1">
                      {game.teamAFlag && <img src={game.teamAFlag} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                      <span className="text-xs font-semibold truncate max-w-[80px] text-center">{game.teamAName}</span>
                      {finished && <span className="text-xl font-black font-mono">{game.scoreA}</span>}
                    </div>
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-xs text-muted-foreground font-medium">×</span>
                      {hasBet && <span className="text-[10px] text-primary font-medium">{myBet?.predictedScoreA}×{myBet?.predictedScoreB}</span>}
                    </div>
                    <div className="flex flex-col items-center gap-1 flex-1">
                      {game.teamBFlag && <img src={game.teamBFlag} alt="" className="w-8 h-8 object-contain" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />}
                      <span className="text-xs font-semibold truncate max-w-[80px] text-center">{game.teamBName}</span>
                      {finished && <span className="text-xl font-black font-mono">{game.scoreB}</span>}
                    </div>
                  </div>
                )}
              </div>
              {/* Botões */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleShareInstagram}
                  disabled={isSharingInstagram}
                  className="flex items-center justify-center gap-2 text-xs font-medium py-2.5 px-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isSharingInstagram ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>📸</span>}
                  Instagram Stories
                </button>
                <button
                  onClick={handleShareWhatsApp}
                  disabled={isSharingWhatsApp}
                  className="flex items-center justify-center gap-2 text-xs font-medium py-2.5 px-3 rounded-xl bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {isSharingWhatsApp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <span>💬</span>}
                  WhatsApp
                </button>
                <button
                  onClick={handleDownloadImage}
                  disabled={isDownloading}
                  className="flex items-center justify-center gap-2 text-xs font-medium py-2.5 px-3 rounded-xl bg-muted/50 border border-border/40 text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
                >
                  {isDownloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  Baixar imagem
                </button>
                <button
                  onClick={handleShareOthers}
                  disabled={isSharingOthers}
                  className="flex items-center justify-center gap-2 text-xs font-medium py-2.5 px-3 rounded-xl bg-muted/50 border border-border/40 text-foreground hover:bg-muted/70 transition-colors disabled:opacity-50"
                >
                  {isSharingOthers ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                  Outros apps
                </button>
              </div>
              {/* Fechar */}
              <button
                onClick={() => closeShare()}
                className="w-full py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        , document.body)}
        {/* Painel de análise expansível */}
        {analysisOpen && (
          <div className="mt-2 border-t border-border/20 pt-3 space-y-4">

            {/* PRÉ-JOGO: probabilidades + últimos 5 jogos + análise da IA */}
            {!finished && game.aiPrediction && game.aiPrediction.homeWin !== undefined && (
              <div className="space-y-3">
                {/* Barra de probabilidade removida — mantida apenas análise de IA */}
                {/* Últimos 5 jogos */}
                {(game.aiPrediction.homeForm?.length > 0 || game.aiPrediction.awayForm?.length > 0) && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider">Últimos 5 jogos</p>
                    {[{ name: game.teamAName, form: game.aiPrediction.homeForm }, { name: game.teamBName, form: game.aiPrediction.awayForm }].map(({ name, form }) => (
                      <div key={name} className="flex items-center justify-between gap-2">
                        <span className="text-xs text-foreground/80 truncate max-w-[100px]">{name}</span>
                        <div className="flex gap-1">
                          {(form ?? []).slice(0, 5).map((r, i) => (
                            <span key={i} className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold ${
                              r === 'W' ? 'bg-green-500/20 text-green-400 border border-green-500/30' :
                              r === 'L' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                              'bg-muted/40 text-muted-foreground border border-border/30'
                            }`}>{r}</span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {/* Análise da IA */}
                {game.aiPrediction.aiRecommendation && (
                  <div className="bg-muted/20 rounded-xl p-3 space-y-1.5 border border-border/20">
                    <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5" /> Análise da IA
                    </p>
                    <p className="text-xs text-muted-foreground leading-relaxed">{game.aiPrediction.aiRecommendation}</p>
                    <p className="text-[10px] text-muted-foreground/50 italic">Análise gerada por IA.</p>
                  </div>
                )}
              </div>
            )}
            {/* Fallback: análise indisponível quando aiPrediction é null (API não retornou dados) */}
            {!finished && !game.aiPrediction && (
              <div className="bg-muted/20 rounded-xl p-4 flex flex-col items-center gap-2 border border-border/20">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-muted-foreground/50" />
                  <p className="text-xs font-semibold text-muted-foreground/70">Análise indisponível</p>
                </div>
                <p className="text-[11px] text-muted-foreground/50 text-center leading-relaxed">
                  Os dados desta partida ainda não estão disponíveis na API. A análise será gerada automaticamente após a sincronização.
                </p>
              </div>
            )}

            {/* PÓS-JOGO: 1. Resumo da partida */}
            {finished && game.aiSummary && (
              <div className="bg-muted/20 rounded-xl p-3 space-y-1.5">
                <p className="text-xs font-semibold text-foreground/80 flex items-center gap-1.5">
                  <ScrollText className="w-3.5 h-3.5" /> Resumo da partida
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed">{game.aiSummary}</p>
              </div>
            )}

            {/* PÓS-JOGO: 2a. Narração do narrador (sem palpite) */}
            {finished && !hasBet && game.aiNarration && (
              <div className="bg-muted/20 rounded-xl p-3 space-y-2">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> O que rolou nesse jogo
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed italic">{game.aiNarration}</p>
              </div>
            )}

            {/* PÓS-JOGO: 2b. Análise do palpite (com palpite) */}
            {finished && hasBet && (
              <div className="bg-muted/20 rounded-xl p-3 space-y-3">
                <p className="text-xs font-semibold text-primary flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Análise do seu palpite
                </p>

                {/* Comparação resultado real vs palpite */}
                <div className="flex items-center justify-center gap-3 text-xs">
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Resultado real</p>
                    <p className="font-black font-mono text-foreground text-base">{game.scoreA} × {game.scoreB}</p>
                  </div>
                  <span className="text-muted-foreground/40 text-sm font-medium">vs</span>
                  <div className="text-center">
                    <p className="text-[10px] text-muted-foreground mb-0.5">Seu palpite</p>
                    <p className="font-black font-mono text-primary text-base">{myBet!.predictedScoreA} × {myBet!.predictedScoreB}</p>
                  </div>
                </div>

                {/* Banner de destaque por tipo de resultado */}
                {(() => {
                  const pts = myBet!.pointsEarned ?? 0;
                  const isExact = (myBet!.pointsExactScore ?? 0) > 0;
                  const isCorrect = !isExact && (myBet!.pointsCorrectResult ?? 0) > 0;
                  const isZero = pts === 0;
                  if (isExact) return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/15 border border-green-500/30">
                      <span className="text-green-400 text-sm">🎯</span>
                      <span className="text-xs font-semibold text-green-400">Placar exato — melhor resultado possível!</span>
                    </div>
                  );
                  if (isCorrect) return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 border border-primary/25">
                      <span className="text-primary text-sm">✅</span>
                      <span className="text-xs font-semibold text-primary">Resultado correto! Bom palpite.</span>
                    </div>
                  );
                  if (isZero) return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/40 border border-border/30">
                      <span className="text-muted-foreground text-sm">😬</span>
                      <span className="text-xs font-medium text-muted-foreground">Dessa vez não foi. Próximo jogo!</span>
                    </div>
                  );
                  return (
                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/25">
                      <span className="text-yellow-400 text-sm">⚡</span>
                      <span className="text-xs font-semibold text-yellow-400">Parcialmente correto — {pts} pontos!</span>
                    </div>
                  );
                })()}

                {/* Texto da IA */}
                {betAnalysisLoading ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Gerando análise...
                  </div>
                ) : betAnalysisText ? (
                  <p className="text-xs text-muted-foreground leading-relaxed">{betAnalysisText}</p>
                ) : null}

                {/* Badges de breakdown */}
                <div className="flex flex-wrap gap-1">
                  <BetBreakdownBadges bet={myBet!} />
                  {(myBet!.pointsEarned ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-bold bg-primary/15 border-primary/30 text-primary font-mono">
                      Total: +{myBet!.pointsEarned} pts
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* PÓS-JOGO: 3. Estatísticas */}
            {finished && game.matchStatistics && (() => {
              const stats = [
                { label: "Posse de bola", home: game.matchStatistics!.homePossession, away: game.matchStatistics!.awayPossession, unit: "%" },
                { label: "Finalizações", home: game.matchStatistics!.homeShots, away: game.matchStatistics!.awayShots },
                { label: "Escanteios", home: game.matchStatistics!.homeCorners, away: game.matchStatistics!.awayCorners },
                { label: "Cartões amarelos", home: game.matchStatistics!.homeYellow, away: game.matchStatistics!.awayYellow },
              ].filter(s => s.home != null && s.away != null);
              if (stats.length === 0) return null;
              return (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-foreground/60 uppercase tracking-wider">Estatísticas</p>
                  {stats.map((stat) => {
                    const total = (stat.home ?? 0) + (stat.away ?? 0);
                    const homePct = total > 0 ? Math.round(((stat.home ?? 0) / total) * 100) : 50;
                    return (
                      <div key={stat.label} className="space-y-0.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="font-bold text-primary">{stat.home}{stat.unit ?? ""}</span>
                          <span className="text-muted-foreground">{stat.label}</span>
                          <span className="font-bold text-red-400">{stat.away}{stat.unit ?? ""}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden flex">
                          <div className="h-full bg-primary/70 rounded-l-full transition-all" style={{ width: `${homePct}%` }} />
                          <div className="h-full bg-red-400/70 rounded-r-full transition-all" style={{ width: `${100 - homePct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
                    <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-primary/70 inline-block" />{game.teamAName}</span>
                    <span className="flex items-center gap-1">{game.teamBName}<span className="w-2 h-2 rounded-full bg-red-400/70 inline-block" /></span>
                  </div>
                </div>
              );
            })()}

          </div>
        )}
      {/* Card visual oculto para captura html2canvas — renderizado no body via portal para garantir dimensões corretas */}
      {createPortal(<ShareCardVisual data={shareCardData} cardRef={shareCardRef} />, document.body)}
      </div>
    </div>
    </>
  );
}

export { GameCard };
