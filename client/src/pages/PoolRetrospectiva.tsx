/**
 * PoolRetrospectiva — Retrospectiva do Bolão estilo Spotify Wrapped
 *
 * 5 slides em sequência:
 *   1. Capa — nome do bolão, campeonato, período, participantes
 *   2. Seus números — palpites, % acerto, placares exatos, zebras
 *   3. Seu melhor momento — badge, movimentação no ranking, zebra especial
 *   4. Sua posição final — ranking, pontuação, badge conquistado
 *   5. Encerramento — frase gerada por IA + CTA para cadastro
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
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
} from "lucide-react";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

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
}

// ─── PÁGINA PRINCIPAL ─────────────────────────────────────────────────────────

export default function PoolRetrospectiva() {
  const { slug } = useParams<{ slug: string }>();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isSharing, setIsSharing] = useState(false);

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

  const TOTAL_SLIDES = 5;

  const goNext = () => setCurrentSlide((s) => Math.min(s + 1, TOTAL_SLIDES - 1));
  const goPrev = () => setCurrentSlide((s) => Math.max(s - 1, 0));

  // Navegação por teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleShare = async () => {
    if (!retro?.shareCard?.imageUrl) {
      toast.error("Card de compartilhamento ainda não está pronto.");
      return;
    }

    setIsSharing(true);
    try {
      // Tentar Web Share API (mobile)
      if (navigator.share) {
        await navigator.share({
          title: `Minha retrospectiva no bolão "${retro.poolName}"`,
          text: `Terminei em ${retro.finalPosition}º lugar com ${retro.totalPoints} pontos! Veja minha jornada no ApostAI.`,
          url: window.location.href,
        });
      } else {
        // Fallback: abrir imagem em nova aba
        window.open(retro.shareCard.imageUrl, "_blank");
      }
    } catch {
      // Usuário cancelou o share — não é erro
    } finally {
      setIsSharing(false);
    }
  };

  const handleDownload = async () => {
    if (!retro?.shareCard?.imageUrl) {
      toast.error("Card ainda não está pronto.");
      return;
    }
    try {
      const response = await fetch(retro.shareCard.imageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `apostai-retrospectiva-${retro.poolName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card salvo!");
    } catch {
      toast.error("Erro ao baixar o card.");
    }
  };

  if (poolLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Carregando sua retrospectiva...</p>
        </div>
      </div>
    );
  }

  if (!retro) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <Sparkles className="w-12 h-12 text-muted-foreground" />
        <h2 className="text-lg font-semibold">Retrospectiva não disponível</h2>
        <p className="text-muted-foreground text-sm text-center max-w-xs">
          A retrospectiva deste bolão ainda não foi gerada ou você não é participante.
        </p>
        <Button variant="outline" onClick={() => navigate(`/pool/${slug}`)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao bolão
        </Button>
      </div>
    );
  }

  const isPodium = retro.finalPosition <= 3;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border/50">
        <Button variant="ghost" size="sm" onClick={() => navigate(`/pool/${slug}`)}>
          <ArrowLeft className="w-4 h-4 mr-1.5" />
          Voltar
        </Button>
        <span className="text-sm font-medium text-muted-foreground">
          {currentSlide + 1} / {TOTAL_SLIDES}
        </span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleDownload} className="h-8 text-xs gap-1.5">
            <Download className="w-3.5 h-3.5" />
            Salvar
          </Button>
          <Button size="sm" onClick={handleShare} disabled={isSharing} className="h-8 text-xs gap-1.5">
            {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            Compartilhar
          </Button>
        </div>
      </header>

      {/* Progress bar */}
      <div className="flex gap-1 px-4 pt-3">
        {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 cursor-pointer ${
              i <= currentSlide ? "bg-primary" : "bg-muted"
            }`}
            onClick={() => setCurrentSlide(i)}
          />
        ))}
      </div>

      {/* Slide container */}
      <div className="flex-1 relative overflow-hidden">
        <div
          className="flex h-full transition-transform duration-500 ease-in-out"
          style={{ transform: `translateX(-${currentSlide * 100}%)`, width: `${TOTAL_SLIDES * 100}%` }}
        >
          <SlideWrapper><Slide1 retro={retro} /></SlideWrapper>
          <SlideWrapper><Slide2 retro={retro} /></SlideWrapper>
          <SlideWrapper><Slide3 retro={retro} /></SlideWrapper>
          <SlideWrapper><Slide4 retro={retro} isPodium={isPodium} /></SlideWrapper>
          <SlideWrapper><Slide5 retro={retro} /></SlideWrapper>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-4 py-4 border-t border-border/50">
        <Button
          variant="outline"
          size="sm"
          onClick={goPrev}
          disabled={currentSlide === 0}
          className="gap-1.5"
        >
          <ChevronLeft className="w-4 h-4" />
          Anterior
        </Button>

        {/* Dots */}
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_SLIDES }).map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentSlide(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentSlide ? "bg-primary scale-125" : "bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>

        {currentSlide < TOTAL_SLIDES - 1 ? (
          <Button size="sm" onClick={goNext} className="gap-1.5">
            Próximo
            <ChevronRight className="w-4 h-4" />
          </Button>
        ) : (
          <Button size="sm" onClick={handleShare} disabled={isSharing} className="gap-1.5">
            {isSharing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
            Compartilhar
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── WRAPPER DE SLIDE ─────────────────────────────────────────────────────────

function SlideWrapper({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex-shrink-0 flex items-center justify-center p-4"
      style={{ width: `${100 / 5}%` }}
    >
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}

// ─── SLIDE 1: CAPA ────────────────────────────────────────────────────────────

function Slide1({ retro }: { retro: Retrospective }) {
  return (
    <div className="rounded-2xl overflow-hidden bg-gradient-to-br from-primary/20 via-primary/10 to-background border border-primary/20 p-8 text-center space-y-4 min-h-[420px] flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
        <Trophy className="w-8 h-8 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Retrospectiva</p>
        <h1 className="text-2xl font-bold text-foreground leading-tight">{retro.poolName}</h1>
        {retro.tournamentName && (
          <p className="text-sm text-muted-foreground mt-1">{retro.tournamentName}</p>
        )}
      </div>
      {(retro.poolStartDate || retro.poolEndDate) && (
        <p className="text-xs text-muted-foreground">
          {retro.poolStartDate ? new Date(retro.poolStartDate).toLocaleDateString("pt-BR") : ""}
          {retro.poolStartDate && retro.poolEndDate ? " → " : ""}
          {retro.poolEndDate ? new Date(retro.poolEndDate).toLocaleDateString("pt-BR") : ""}
        </p>
      )}
      <div className="bg-primary/10 rounded-xl px-6 py-3">
        <p className="text-3xl font-bold text-primary">{retro.totalParticipants}</p>
        <p className="text-xs text-muted-foreground mt-0.5">participantes</p>
      </div>
    </div>
  );
}

// ─── SLIDE 2: SEUS NÚMEROS ────────────────────────────────────────────────────

function Slide2({ retro }: { retro: Retrospective }) {
  const stats = [
    { icon: "🎯", label: "Palpites feitos", value: retro.totalBets },
    { icon: "✅", label: "Acerto geral", value: `${retro.accuracyPct ?? 0}%` },
    { icon: "💎", label: "Placares exatos", value: retro.exactScoreCount },
    { icon: "🦓", label: "Zebras acertadas", value: retro.zebraCount },
  ];

  return (
    <div className="rounded-2xl bg-gradient-to-br from-violet-500/20 via-violet-500/10 to-background border border-violet-500/20 p-6 min-h-[420px] flex flex-col justify-center space-y-5">
      <div className="text-center">
        <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Seus números</p>
        <h2 className="text-xl font-bold">Como você foi</h2>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {stats.map((s) => (
          <div key={s.label} className="bg-card/60 rounded-xl p-4 text-center border border-border/40">
            <p className="text-2xl mb-1">{s.icon}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>
      <div className="bg-violet-500/10 rounded-xl px-4 py-3 text-center border border-violet-500/20">
        <p className="text-3xl font-bold text-violet-400">{retro.totalPoints}</p>
        <p className="text-xs text-muted-foreground mt-0.5">pontos no total</p>
      </div>
    </div>
  );
}

// ─── SLIDE 3: SEU MELHOR MOMENTO ─────────────────────────────────────────────

function Slide3({ retro }: { retro: Retrospective }) {
  const bestMoment = retro.bestMomentData as Record<string, unknown> | null;
  const momentType = retro.bestMomentType;

  const getMomentContent = () => {
    if (momentType === "badge") {
      return {
        icon: "🏅",
        title: "Você conquistou um badge!",
        description: `"${(bestMoment?.badgeName as string) ?? "Badge especial"}" foi desbloqueado durante este bolão.`,
        color: "from-amber-500/20 via-amber-500/10",
        border: "border-amber-500/20",
        accent: "text-amber-400",
      };
    }
    if (momentType === "rank_jump") {
      return {
        icon: "🚀",
        title: "Virada épica!",
        description: `Você subiu ${(bestMoment?.positions as number) ?? "várias"} posições de uma vez no ranking.`,
        color: "from-emerald-500/20 via-emerald-500/10",
        border: "border-emerald-500/20",
        accent: "text-emerald-400",
      };
    }
    if (momentType === "zebra_exact") {
      return {
        icon: "🦓",
        title: "Você foi na zebra e acertou o placar!",
        description: `${(bestMoment?.teamA as string) ?? "Time"} ${bestMoment?.scoreA ?? 0} x ${bestMoment?.scoreB ?? 0} ${(bestMoment?.teamB as string) ?? "Time"} — ninguém acreditava, mas você acreditou.`,
        color: "from-pink-500/20 via-pink-500/10",
        border: "border-pink-500/20",
        accent: "text-pink-400",
      };
    }
    if (momentType === "exact_score") {
      return {
        icon: "🎯",
        title: "Placar exato!",
        description: `${(bestMoment?.teamA as string) ?? "Time"} ${bestMoment?.scoreA ?? 0} x ${bestMoment?.scoreB ?? 0} ${(bestMoment?.teamB as string) ?? "Time"} — você acertou na mosca.`,
        color: "from-blue-500/20 via-blue-500/10",
        border: "border-blue-500/20",
        accent: "text-blue-400",
      };
    }
    return {
      icon: "⭐",
      title: "Uma jornada incrível",
      description: "Você participou de ponta a ponta e deixou sua marca neste bolão.",
      color: "from-primary/20 via-primary/10",
      border: "border-primary/20",
      accent: "text-primary",
    };
  };

  const content = getMomentContent();

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${content.color} to-background border ${content.border} p-8 min-h-[420px] flex flex-col items-center justify-center text-center space-y-5`}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest">Seu melhor momento</p>
      <p className="text-6xl">{content.icon}</p>
      <div className="space-y-2">
        <h2 className={`text-xl font-bold ${content.accent}`}>{content.title}</h2>
        <p className="text-sm text-muted-foreground leading-relaxed max-w-xs">{content.description}</p>
      </div>
      {retro.shareCard?.imageUrl && (
        <div className="mt-2 rounded-xl overflow-hidden border border-border/40 w-full max-w-[200px] mx-auto">
          <img
            src={retro.shareCard.imageUrl}
            alt="Card de compartilhamento"
            className="w-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

// ─── SLIDE 4: SUA POSIÇÃO FINAL ───────────────────────────────────────────────

function Slide4({ retro, isPodium }: { retro: Retrospective; isPodium: boolean }) {
  const positionEmoji = retro.finalPosition === 1 ? "🥇" : retro.finalPosition === 2 ? "🥈" : retro.finalPosition === 3 ? "🥉" : "🏅";
  const positionColor = retro.finalPosition === 1
    ? "from-yellow-500/30 via-yellow-500/15"
    : retro.finalPosition === 2
    ? "from-slate-400/30 via-slate-400/15"
    : retro.finalPosition === 3
    ? "from-amber-700/30 via-amber-700/15"
    : "from-primary/20 via-primary/10";

  return (
    <div className={`rounded-2xl bg-gradient-to-br ${positionColor} to-background border border-border/30 p-8 min-h-[420px] flex flex-col items-center justify-center text-center space-y-5`}>
      <p className="text-xs text-muted-foreground uppercase tracking-widest">Posição final</p>
      <p className="text-7xl">{positionEmoji}</p>
      <div>
        <p className="text-5xl font-black text-foreground">{retro.finalPosition}º</p>
        <p className="text-muted-foreground text-sm mt-1">
          de {retro.totalParticipants} participantes
        </p>
      </div>
      <div className="bg-card/60 rounded-xl px-6 py-3 border border-border/40">
        <p className="text-2xl font-bold text-primary">{retro.totalPoints} pts</p>
        <p className="text-xs text-muted-foreground mt-0.5">pontuação final</p>
      </div>
      {isPodium && (
        <div className="bg-amber-500/10 rounded-xl px-4 py-2.5 border border-amber-500/20">
          <p className="text-xs text-amber-400 font-medium">🏆 Você ficou no pódio!</p>
        </div>
      )}
    </div>
  );
}

// ─── SLIDE 5: ENCERRAMENTO ────────────────────────────────────────────────────

function Slide5({ retro }: { retro: Retrospective }) {
  const defaultPhrase = `Você foi longe neste bolão. Que tal desafiar mais amigos no próximo?`;
  const phrase = retro.closingPhrase ?? defaultPhrase;

  return (
    <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-background to-background border border-primary/20 p-8 min-h-[420px] flex flex-col items-center justify-center text-center space-y-6">
      <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center mx-auto">
        <Sparkles className="w-6 h-6 text-primary" />
      </div>
      <div className="space-y-3">
        <p className="text-xs text-muted-foreground uppercase tracking-widest">É isso!</p>
        <p className="text-lg font-semibold text-foreground leading-relaxed max-w-xs">{phrase}</p>
      </div>
      <div className="w-full space-y-2.5">
        <p className="text-xs text-muted-foreground">Compartilhe sua jornada</p>
        <a
          href={`${window.location.origin}/cadastro`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-3 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          Crie seu bolão no ApostAI →
        </a>
      </div>
      <p className="text-xs text-muted-foreground/60">apostai.com.br</p>
    </div>
  );
}
