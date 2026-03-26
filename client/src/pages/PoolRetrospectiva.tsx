/**
 * PoolRetrospectiva — Retrospectiva do Bolão estilo Spotify Wrapped
 *
 * 5 slides em sequência com fundo de template configurável:
 *   1. Capa — nome do bolão, campeonato, período, participantes
 *   2. Seus números — palpites, % acerto, placares exatos, zebras
 *   3. Seu melhor momento — badge, movimentação no ranking, zebra especial
 *   4. Sua posição final — ranking, pontuação, badge conquistado
 *   5. Encerramento — frase gerada por IA + CTA para cadastro
 *
 * Funcionalidades:
 * - Fundo de template por slide (configurado no Admin → Retrospectivas)
 * - Swipe touch (mobile) e navegação por teclado (desktop)
 * - Compartilhamento por Web Share API + fallback copiar link
 * - Download do card PNG do participante
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  Download,
  Loader2,
  Share2,
  Trophy,
  Target,
  Zap,
  Star,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  TrendingUp,
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface Templates {
  slide1Url: string | null;
  slide2Url: string | null;
  slide3Url: string | null;
  slide4Url: string | null;
  slide5Url: string | null;
  cardPodiumUrl: string | null;
  cardParticipantUrl: string | null;
  closingCtaText: string | null;
  closingCtaUrl: string | null;
}

interface Retrospective {
  id: number;
  poolId: number;
  userId: number;
  poolName: string;
  tournamentName: string | null;
  poolStartDate: string | Date | null;
  poolEndDate: string | Date | null;
  totalParticipants: number;
  totalBets: number;
  exactScoreCount: number;
  correctResultCount: number;
  zebraCount: number;
  totalPoints: number;
  finalPosition: number;
  accuracyPct: number;
  bestMomentType: string | null;
  bestMomentData: Record<string, unknown> | null;
  closingPhrase: string | null;
  shareCard: {
    id: number;
    cardType: string;
    position: number;
    imageUrl: string;
  } | null;
  templates: Templates;
}

// ─── FUNDO DE SLIDE ───────────────────────────────────────────────────────────

function SlideBackground({ url, gradient }: { url: string | null; gradient: string }) {
  return (
    <>
      {url ? (
        <img
          src={url}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          aria-hidden="true"
        />
      ) : (
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`} />
      )}
      {/* Overlay escuro para garantir legibilidade */}
      <div className="absolute inset-0 bg-black/45" />
    </>
  );
}

// ─── SLIDE 1: CAPA ────────────────────────────────────────────────────────────

function Slide1({ retro }: { retro: Retrospective }) {
  const startYear = retro.poolStartDate
    ? new Date(retro.poolStartDate).getFullYear()
    : null;
  const endYear = retro.poolEndDate
    ? new Date(retro.poolEndDate).getFullYear()
    : null;
  const period =
    startYear && endYear
      ? startYear === endYear
        ? String(startYear)
        : `${startYear}–${endYear}`
      : null;

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px] flex flex-col items-center justify-center text-center p-8 space-y-5">
      <SlideBackground url={retro.templates.slide1Url} gradient="from-brand/50 via-brand/25 to-zinc-900" />
      <div className="relative z-10 space-y-5 flex flex-col items-center">
        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Retrospectiva</p>
          <h1 className="text-2xl font-black text-white leading-tight">{retro.poolName}</h1>
          {retro.tournamentName && (
            <p className="text-sm text-white/70 mt-1">{retro.tournamentName}</p>
          )}
        </div>
        <div className="flex gap-3 flex-wrap justify-center">
          {period && (
            <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs text-white/80">
              {period}
            </span>
          )}
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-xs text-white/80">
            {retro.totalParticipants} participantes
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 2: NÚMEROS ─────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: React.ReactNode; value: string | number; label: string }) {
  return (
    <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-3 flex flex-col gap-1">
      <div className="text-white/60">{icon}</div>
      <p className="text-xl font-black text-white leading-none">{value}</p>
      <p className="text-xs text-white/60 leading-tight">{label}</p>
    </div>
  );
}

function Slide2({ retro }: { retro: Retrospective }) {
  const accuracy = retro.accuracyPct ?? 0;
  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px] flex flex-col justify-center p-7 space-y-6">
      <SlideBackground url={retro.templates.slide2Url} gradient="from-violet-600/50 via-violet-500/25 to-zinc-900" />
      <div className="relative z-10 space-y-6">
        <div>
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Seus Números</p>
          <h2 className="text-xl font-black text-white">Como você foi?</h2>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon={<Target className="w-4 h-4" />} value={retro.totalBets} label="palpites" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4" />} value={`${accuracy}%`} label="acerto" />
          <StatCard icon={<Star className="w-4 h-4" />} value={retro.exactScoreCount} label="placares exatos" />
          <StatCard icon={<Zap className="w-4 h-4" />} value={retro.zebraCount} label="zebras acertadas" />
        </div>
        <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 p-4 text-center">
          <p className="text-3xl font-black text-white">{retro.totalPoints}</p>
          <p className="text-xs text-white/70 mt-0.5">pontos totais</p>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 3: MELHOR MOMENTO ──────────────────────────────────────────────────

function Slide3({ retro }: { retro: Retrospective }) {
  const type = retro.bestMomentType ?? "exact_score";
  const data = retro.bestMomentData ?? {};

  const content = (() => {
    switch (type) {
      case "rank_jump":
        return {
          icon: <TrendingUp className="w-8 h-8 text-emerald-300" />,
          title: "Subida no Ranking",
          subtitle: data.description
            ? String(data.description)
            : `Subiu ${data.positions ?? "várias"} posições em uma rodada`,
          gradient: "from-emerald-600/50 via-emerald-500/25 to-zinc-900",
        };
      case "zebra":
      case "zebra_exact":
        return {
          icon: <Zap className="w-8 h-8 text-yellow-300" />,
          title: "Zebra Acertada!",
          subtitle: data.description
            ? String(data.description)
            : "Você acertou um resultado improvável",
          gradient: "from-yellow-600/50 via-yellow-500/25 to-zinc-900",
        };
      case "badge":
        return {
          icon: <Trophy className="w-8 h-8 text-amber-300" />,
          title: "Badge Conquistado",
          subtitle: data.badgeName ? String(data.badgeName) : "Você ganhou um badge especial!",
          gradient: "from-amber-600/50 via-amber-500/25 to-zinc-900",
        };
      default: // exact_score
        return {
          icon: <Star className="w-8 h-8 text-sky-300" />,
          title: "Placar Exato!",
          subtitle: data.description
            ? String(data.description)
            : "Você acertou o placar de um jogo",
          gradient: "from-sky-600/50 via-sky-500/25 to-zinc-900",
        };
    }
  })();

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px] flex flex-col items-center justify-center text-center p-8 space-y-6">
      <SlideBackground url={retro.templates.slide3Url} gradient={content.gradient} />
      <div className="relative z-10 space-y-6 flex flex-col items-center">
        <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          {content.icon}
        </div>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Seu Melhor Momento</p>
          <h2 className="text-xl font-black text-white">{content.title}</h2>
          <p className="text-sm text-white/80 mt-2 leading-relaxed max-w-xs">{content.subtitle}</p>
        </div>
      </div>
    </div>
  );
}

// ─── SLIDE 4: POSIÇÃO FINAL ───────────────────────────────────────────────────

function Slide4({ retro }: { retro: Retrospective }) {
  const pos = retro.finalPosition;
  const isPodium = pos <= 3;
  const posEmoji = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : "🏅";
  const gradient = isPodium
    ? "from-amber-600/50 via-amber-500/25 to-zinc-900"
    : "from-zinc-700/60 via-zinc-600/30 to-zinc-900";

  const handleDownloadCard = async () => {
    if (!retro.shareCard?.imageUrl) return;
    try {
      const response = await fetch(retro.shareCard.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apostai-${(retro.poolName ?? "bolao").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card salvo!");
    } catch {
      toast.error("Não foi possível baixar o card.");
    }
  };

  const handleShareCard = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Minha retrospectiva — ${retro.poolName}`,
          text: `Terminei em ${pos}º lugar com ${retro.totalPoints} pontos!`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!");
      }
    } catch {
      // usuário cancelou
    }
  };

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px] flex flex-col items-center justify-center text-center p-8 space-y-5">
      <SlideBackground url={retro.templates.slide4Url} gradient={gradient} />
      <div className="relative z-10 space-y-5 flex flex-col items-center">
        <p className="text-6xl">{posEmoji}</p>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-widest mb-1">Posição Final</p>
          <p className="text-7xl font-black text-white leading-none">#{pos}</p>
          <p className="text-sm text-white/70 mt-1">de {retro.totalParticipants} participantes</p>
        </div>
        <div className="rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 px-6 py-3">
          <p className="text-2xl font-bold text-white">{retro.totalPoints} pts</p>
          <p className="text-xs text-white/60 mt-0.5">pontuação final</p>
        </div>
        {isPodium && (
          <div className="rounded-xl bg-amber-500/20 border border-amber-400/30 px-4 py-2">
            <p className="text-xs text-amber-300 font-semibold">🏆 Você ficou no pódio!</p>
          </div>
        )}
        {/* Card de compartilhamento */}
        {retro.shareCard?.imageUrl && (
          <div className="w-full space-y-2 mt-1">
            <p className="text-xs text-white/50">Seu card para compartilhar</p>
            <div className="relative mx-auto w-fit">
              <div className="absolute -inset-1 rounded-2xl bg-gradient-to-br from-white/20 via-transparent to-transparent blur-sm opacity-60 pointer-events-none" />
              <div className="relative rounded-xl overflow-hidden border-2 border-white/30 shadow-xl max-w-[140px] mx-auto">
                <img src={retro.shareCard.imageUrl} alt="Card" className="w-full object-cover block" loading="lazy" />
              </div>
            </div>
            <div className="flex gap-2 justify-center">
              <button
                onClick={handleDownloadCard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 border border-white/20 text-xs text-white/80 hover:bg-white/20 transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                Salvar
              </button>
              <button
                onClick={handleShareCard}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/20 border border-white/30 text-xs text-white font-medium hover:bg-white/30 transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                Compartilhar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SLIDE 5: ENCERRAMENTO ────────────────────────────────────────────────────

function Slide5({ retro }: { retro: Retrospective }) {
  const phrase = retro.closingPhrase ?? "Você foi longe neste bolão. Que tal desafiar mais amigos no próximo?";
  const ctaText = retro.templates.closingCtaText ?? "Crie seu bolão no ApostAI →";
  const ctaUrl = retro.templates.closingCtaUrl ?? `${window.location.origin}/cadastro`;

  return (
    <div className="relative rounded-2xl overflow-hidden min-h-[480px] flex flex-col items-center justify-center text-center p-8 space-y-6">
      <SlideBackground url={retro.templates.slide5Url} gradient="from-brand/50 via-brand/25 to-zinc-900" />
      <div className="relative z-10 space-y-6 flex flex-col items-center max-w-xs">
        <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-xs text-white/60 uppercase tracking-widest mb-2">É isso!</p>
          <p className="text-lg font-semibold text-white leading-relaxed">{phrase}</p>
        </div>
        <a
          href={ctaUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 px-4 rounded-xl bg-white text-zinc-900 text-sm font-bold hover:bg-white/90 transition-colors"
        >
          {ctaText}
        </a>
        <p className="text-xs text-white/40">apostai.com.br</p>
      </div>
    </div>
  );
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

const TOTAL_SLIDES = 5;

export default function PoolRetrospectiva() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSharing, setIsSharing] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  // Buscar o pool pelo slug para obter o ID
  const { data: poolData, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const poolId = poolData?.pool?.id;

  const { data: retro, isLoading } = trpc.pools.getRetrospective.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const goNext = useCallback(() => {
    setCurrentSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  }, []);

  const goPrev = useCallback(() => {
    setCurrentSlide((s) => Math.max(s - 1, 0));
  }, []);

  // Navegação por teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [goNext, goPrev]);

  // Swipe touch
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleShare = async () => {
    setIsSharing(true);
    try {
      if (navigator.share) {
        await navigator.share({
          title: `Minha retrospectiva no bolão "${retro?.poolName}"`,
          text: `Terminei em ${retro?.finalPosition}º lugar com ${retro?.totalPoints} pontos! Veja minha jornada no ApostAI.`,
          url: window.location.href,
        });
      } else {
        await navigator.clipboard.writeText(window.location.href);
        toast.success("Link copiado!", { description: "Cole e compartilhe com seus amigos." });
      }
    } catch {
      // Usuário cancelou
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!retro?.shareCard?.imageUrl) {
      toast.error("Card de compartilhamento ainda não está pronto.");
      return;
    }
    try {
      const response = await fetch(retro.shareCard.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apostai-${(retro.poolName ?? "bolao").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card salvo!");
    } catch {
      toast.error("Não foi possível baixar o card.");
    }
  };

  // ── Estados de carregamento / erro ──────────────────────────────────────────

  if (poolLoading || isLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand mx-auto" />
          <p className="text-white/50 text-sm">Carregando sua retrospectiva...</p>
        </div>
      </div>
    );
  }

  if (!retro) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center gap-4 px-4">
        <Sparkles className="w-12 h-12 text-white/30" />
        <h2 className="text-lg font-semibold text-white">Retrospectiva não disponível</h2>
        <p className="text-white/50 text-sm text-center max-w-xs">
          A retrospectiva deste bolão ainda não foi gerada ou você não é participante.
        </p>
        <Button
          variant="outline"
          onClick={() => navigate(`/pool/${slug}`)}
          className="border-white/20 text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao bolão
        </Button>
      </div>
    );
  }

  const slides = [
    <Slide1 retro={retro} />,
    <Slide2 retro={retro} />,
    <Slide3 retro={retro} />,
    <Slide4 retro={retro} />,
    <Slide5 retro={retro} />,
  ];

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col select-none">
      {/* ── Header ── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-zinc-950/90 backdrop-blur-sm sticky top-0 z-20">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/pool/${slug}`)}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar
        </Button>
        <span className="text-sm font-medium text-white/40">
          {currentSlide + 1} / {TOTAL_SLIDES}
        </span>
        <div className="flex gap-2">
          {retro.shareCard?.imageUrl && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDownload}
              className="h-8 text-xs gap-1.5 text-white/60 hover:text-white hover:bg-white/10"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salvar</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
            className="h-8 text-xs gap-1.5 bg-brand hover:bg-brand/90"
          >
            {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            <span className="hidden sm:inline">Compartilhar</span>
          </Button>
        </div>
      </header>

      {/* ── Barra de progresso ── */}
      <div className="flex gap-1 px-4 pt-3 pb-1 bg-zinc-950">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <button
            key={i}
            aria-label={`Ir para slide ${i + 1}`}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < currentSlide
                ? "bg-brand"
                : i === currentSlide
                ? "bg-white"
                : "bg-white/20"
            }`}
            onClick={() => setCurrentSlide(i)}
          />
        ))}
      </div>

      {/* ── Slide container com swipe ── */}
      <div
        className="flex-1 overflow-hidden relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
            width: `${TOTAL_SLIDES * 100}%`,
          }}
        >
          {slides.map((slide, i) => (
            <div
              key={i}
              className="flex-shrink-0 flex items-center justify-center p-4"
              style={{ width: `${100 / TOTAL_SLIDES}%` }}
            >
              <div className="w-full max-w-sm">{slide}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Navegação inferior ── */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-white/10 bg-zinc-950">
        <Button
          variant="ghost"
          size="sm"
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="gap-1.5 text-white/60 hover:text-white hover:bg-white/10 disabled:opacity-25"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {/* Dots */}
        <div className="flex gap-2 items-center">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`rounded-full transition-all duration-300 ${
                i === currentSlide
                  ? "w-4 h-2 bg-white"
                  : "w-2 h-2 bg-white/25 hover:bg-white/50"
              }`}
            />
          ))}
        </div>

        {currentSlide < TOTAL_SLIDES - 1 ? (
          <Button
            size="sm"
            onClick={goNext}
            className="gap-1.5 bg-brand hover:bg-brand/90"
          >
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleShare}
            disabled={isSharing}
            className="gap-1.5 bg-brand hover:bg-brand/90"
          >
            {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            Compartilhar
          </Button>
        )}
      </div>
    </div>
  );
}
