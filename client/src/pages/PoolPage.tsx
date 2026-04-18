/**
 * Página do Bolão — redesign digital-first
 *
 * Estrutura:
 * 1. Header sticky compacto (voltar, nome, ações)
 * 2. Hero com gradiente — identidade do bolão + stats do usuário
 * 3. Abas: Jogos | Ranking | Membros
 *    - Jogos: card 3 colunas (Time A | Palpite | Time B)
 *    - Ranking: pódio visual top-3 + lista compacta
 *    - Membros: lista com avatar e nome clicável
 */
import AppShell from "@/components/AppShell";
import { useShareCard, ShareCardVisual } from "@/components/ShareCard";
import { getPhaseLabel } from "@shared/phaseNames";
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useUserPlan } from "@/hooks/useUserPlan";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Crown,
  Download,
  Filter,
  Info,
  Loader2,
  Lock,
  LogOut,
  Medal,
  MoreHorizontal,
  PenLine,
  RefreshCw,
  ScrollText,
  Settings,
  Share2,
  Sparkles,
  Trophy,
  Users,
  Swords,
} from "lucide-react";
import { useState, useMemo, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import X1ChallengeModal from "@/components/X1ChallengeModal";
import X1DuelsTab from "@/components/X1DuelsTab";
import PoolMural from "@/components/PoolMural";
import PoolBottomNav from "@/components/PoolBottomNav";
import BetBreakdownBadges from "@/components/BetBreakdownBadges";
import { AdBanner } from "@/components/AdBanner";
import { AdInterleaved } from "@/components/AdInterleaved";
import { SponsorBanner, SponsorPopup, SponsorWelcomeMessage } from "@/components/SponsorDisplay";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { GameCard } from "@/components/GameCard";

export default function PoolPage() {
  const analytics = useAnalytics();
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  // Suporte a ?tab= na URL para abrir aba diretamente (ex: via menu de Ranking)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab");
      if (tab === "ranking" || tab === "games" || tab === "mural" || tab === "duelos" || tab === "rules") return tab;
    }
    return "games";
  });

  // Escutar evento do sidebar para trocar aba via ?tab= sem recarregar a página
  useEffect(() => {
    const handler = (e: Event) => {
      const tab = (e as CustomEvent<{ tab: string }>).detail?.tab;
      if (tab === "ranking" || tab === "games" || tab === "mural" || tab === "duelos" || tab === "rules") {
        setActiveTab(tab);
      }
    };
    window.addEventListener('pool-tab-change', handler);
    return () => window.removeEventListener('pool-tab-change', handler);
  }, []);
  const [betInputs, setBetInputs] = useState<Record<number, { a: string; b: string }>>({});
  // Animações de ranking — pódio (confetti/enter) + subida/descida de posição
  const [podiumAnimation, setPodiumAnimation] = useState<"idle" | "enter" | "confetti" | "rise" | "drop">("idle");
  const podiumChecked = useRef(false);
  const lastPositionRef = useRef<number | null>(null);

  const { data, isLoading, error } = trpc.pools.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug, refetchInterval: 60_000 }
  );

  // Redirecionamento transparente: se o slug usado era antigo, atualiza a URL
  // para o slug atual sem recarregar a página — o usuário não percebe a diferença
  useEffect(() => {
    if (data?.redirectedTo && slug && data.redirectedTo !== slug) {
      const currentPath = window.location.pathname;
      const newPath = currentPath.replace(slug, data.redirectedTo);
      if (newPath !== currentPath) {
        window.history.replaceState(null, "", newPath);
      }
    }
  }, [data?.redirectedTo, slug]);

  const { data: myBets } = trpc.bets.myBets.useQuery(
    { poolId: data?.pool.id ?? 0 },
    { enabled: !!data?.pool.id }
  );

  const { data: ranking, isLoading: rankingLoading } = trpc.rankings.getPoolRanking.useQuery(
    { poolId: data?.pool.id ?? 0 },
    { enabled: !!data?.pool.id && activeTab === "ranking", refetchInterval: 30_000 }
  );

  const utils = trpc.useUtils();
  const { data: myPosition } = trpc.rankings.myPoolPosition.useQuery(
    { poolId: data?.pool.id ?? 0 },
    { enabled: !!data?.pool.id }
  );

  const { data: members } = trpc.pools.getMembers.useQuery(
    { poolId: data?.pool.id ?? 0 },
    { enabled: !!data?.pool.id && activeTab === "ranking" }
  );

  const { data: publicSettings } = trpc.platform.getPublicSettings.useQuery(
    undefined,
    { staleTime: 5 * 60 * 1000 } // cache 5 min
  );
  const { data: adConfig } = trpc.platform.getAdConfig.useQuery(undefined, { staleTime: 10 * 60 * 1000 });

  const { data: userData } = trpc.users.me.useQuery(undefined, { enabled: !!user, staleTime: 5 * 60 * 1000 });
  const { isPro } = useUserPlan();

  const placeBet = trpc.bets.placeBet.useMutation({
    onSuccess: (_, vars) => {
      analytics.trackBetSubmitted({ pool_slug: slug ?? undefined, game_id: vars.gameId });
      toast.success("Palpite salvo!");
      utils.bets.myBets.invalidate();
      utils.rankings.myPoolPosition.invalidate({ poolId: data?.pool.id });
    },
    onError: (err) => {
      toast.error("Erro ao salvar palpite", { description: err.message });
    },
  });

  /* [HOOK] leave — deve ficar ANTES dos returns condicionais para não violar regra dos React Hooks */
  const leaveMutation = trpc.pools.leave.useMutation({
    onSuccess: () => {
      toast.success("Você saiu do bolão.", { description: "Até a próxima!" });
      navigate("/dashboard");
    },
    onError: (err) => {
      toast.error("Erro ao sair do bolão", { description: err.message });
    },
  });

  /* ── Agrupamento de jogos por fase ── (hooks ANTES dos returns condicionais) */
  const games = data?.games ?? [];
  const phases = data?.phases ?? [];

  const phaseLabels = useMemo(() => {
    const map = new Map<string, string>();
    phases.forEach((p) => map.set(p.key, p.label));
    return map;
  }, [phases]);

  const uniquePhaseKeys = useMemo(() => {
    return Array.from(new Set(games.map((g) => g.phase ?? "group_stage")));
  }, [games]);

  const hasMultiplePhases = uniquePhaseKeys.length > 1;

  // Verifica se todos os jogos têm roundNumber — nesse caso agrupa por rodada
  const allGamesHaveRound = useMemo(() => games.length > 0 && games.every((g) => g.roundNumber != null), [games]);

  const gamesByPhase = useMemo(() => {
    if (allGamesHaveRound) {
      // Agrupamento por número de rodada (campeonatos league)
      const groups = new Map<string, typeof games>();
      games.forEach((g) => {
        const key = `round_${g.roundNumber}`;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(g);
      });
      return Array.from(groups.entries()).sort(([a], [b]) => {
        const na = parseInt(a.replace("round_", ""), 10);
        const nb = parseInt(b.replace("round_", ""), 10);
        return na - nb;
      });
    }
    // Agrupamento padrão por fase (texto)
    // IMPORTANTE: jogos importados via CSV podem ter o campo `phase` preenchido
    // com o label (ex: "Quartas de Final") em vez da chave (ex: "quarter_finals").
    // Por isso mapeamos tanto pela chave quanto pelo label para garantir a ordenação correta.
    const phaseOrder = new Map<string, number>();
    phases.forEach((p, i) => {
      phaseOrder.set(p.key, p.order ?? i);
      phaseOrder.set(p.label, p.order ?? i); // fallback para jogos com label no campo phase
    });
    const groups = new Map<string, typeof games>();
    games.forEach((g) => {
      const key = g.phase ?? "group_stage";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(g);
    });
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const oa = phaseOrder.get(a) ?? 999;
      const ob = phaseOrder.get(b) ?? 999;
      return oa - ob;
    });
  }, [games, phases, allGamesHaveRound]);

  const activePhaseKey = useMemo(() => {
    const livePhase = games.find((g) => g.status === "live")?.phase;
    if (livePhase) return livePhase;
    const nextPhase = games
      .filter((g) => g.status === "scheduled")
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())[0]?.phase;
    return nextPhase ?? uniquePhaseKeys[0] ?? "group_stage";
  }, [games, uniquePhaseKeys]);

  // useEffect: animações de ranking
  useEffect(() => {
    if (!ranking || !user) return;
    const myIdx = ranking.findIndex((r) => r.user.id === user.id);
    if (myIdx < 0) return;
    const hasPoints = (ranking[0]?.stats.totalPoints ?? 0) > 0;

    // --- Pódio: dispara apenas na PRIMEIRA VEZ no bolão (localStorage) ---
    if (!podiumChecked.current) {
      podiumChecked.current = true;
      try {
        const lsKey = `podium_${slug}_${user.id}`;
        const seen = localStorage.getItem(lsKey); // null = nunca viu

        if (hasPoints) {
          // Confetes: apenas 1º lugar, apenas se nunca chegou ao 1º neste bolão
          if (myIdx === 0 && seen !== "1") {
            localStorage.setItem(lsKey, "1");
            setPodiumAnimation("confetti");
            setTimeout(() => setPodiumAnimation("idle"), 2500);
            lastPositionRef.current = myIdx;
            return;
          }
          // Glow prata/bronze: apenas 2º/3º, apenas se nunca entrou no top-3 neste bolão
          if (myIdx < 3 && seen === null) {
            localStorage.setItem(lsKey, String(myIdx + 1));
            setPodiumAnimation("enter"); // glow sem slide (controlado no CSS)
            setTimeout(() => setPodiumAnimation("idle"), 1200);
            lastPositionRef.current = myIdx;
            return;
          }
          // Já viu o glow mas chegou ao 1º agora: atualiza o registro
          if (myIdx === 0 && seen !== "1") {
            localStorage.setItem(lsKey, "1");
          }
        }
      } catch {
        // localStorage pode estar bloqueado (Safari Private, Brave Shields)
        // Ignora silenciosamente — animações são progressivas, não críticas
      }
    }

    // --- Subida/descida: sempre dispara quando posição muda ---
    const prev = lastPositionRef.current;
    if (prev !== null && prev !== myIdx) {
      setPodiumAnimation(prev > myIdx ? "rise" : "drop");
      setTimeout(() => setPodiumAnimation("idle"), 2000);
    }
    lastPositionRef.current = myIdx;
  }, [ranking, user, slug]);

  const [showAllGames, setShowAllGames] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => new Set([activePhaseKey ?? ""]));

  // ── Filtros de palpite na aba Jogos ──────────────────────────────────────────
  type FilterKey = "all" | "pending" | "editable" | "waiting" | "correct" | "wrong" | "missed";
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [showFilters, setShowFilters] = useState(false);
  // Estado do modal X1
  const [x1Modal, setX1Modal] = useState<{ open: boolean; opponentId: number; opponentName: string } | null>(null);

  const togglePhase = (key: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // ── filterCounts DEVE ficar antes dos early returns (Regra dos Hooks) ──────────
  // Usa valores seguros com fallback para quando data ainda não carregou
  const _myBetsItemsForFilter = Array.isArray(myBets) ? myBets : (myBets?.items ?? []);
  const _betsByGameForFilter = new Map(_myBetsItemsForFilter.map((b) => [b.gameId, b]) ?? []);
  const _deadlineMinutesForFilter = data?.rules?.bettingDeadlineMinutes ?? 60;
  const _gamesForFilter = data?.games ?? [];

  const filterCounts = useMemo(() => {
    const c = { pending: 0, editable: 0, waiting: 0, correct: 0, wrong: 0, missed: 0 };
    for (const g of _gamesForFilter) {
      const deadline = new Date(new Date(g.matchDate).getTime() - _deadlineMinutesForFilter * 60 * 1000);
      const deadlinePassed = Date.now() > deadline.getTime();
      const myBet = _betsByGameForFilter.get(g.id);
      let k: keyof typeof c;
      if (!myBet) {
        k = !deadlinePassed ? "pending" : "missed";
      } else if (!deadlinePassed && myBet.resultType === "pending") {
        k = "editable";
      } else if (myBet.resultType === "pending") {
        k = "waiting";
      } else if (myBet.resultType === "exact" || myBet.resultType === "correct_result") {
        k = "correct";
      } else {
        k = "wrong";
      }
      c[k]++;
    }
    return c;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [_gamesForFilter, _myBetsItemsForFilter, _deadlineMinutesForFilter]);

  /* ── Loading ── */
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="h-14 border-b border-border/40 bg-background/80 flex items-center px-4 gap-3">
          <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
          <div className="space-y-1.5">
            <div className="h-4 w-36 bg-muted rounded animate-pulse" />
            <div className="h-3 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <div className="h-40 bg-muted/30 animate-pulse" />
        <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  /* ── Error ── */
  if (error || !data) {
    const errMsg = error ? (error as unknown as { message?: string }).message ?? "" : "";
    const isPendingApproval = errMsg.includes("aguardando aprovação");
    const isRejected = errMsg.includes("recusada");
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
          isPendingApproval ? "bg-yellow-500/10 border border-yellow-500/20" :
          isRejected ? "bg-red-500/10 border border-red-500/20" :
          "bg-destructive/10 border border-destructive/20"
        }`}>
          {isPendingApproval ? (
            <Lock className="w-7 h-7 text-yellow-400" />
          ) : (
            <Trophy className={`w-7 h-7 ${isRejected ? "text-red-400" : "text-destructive"}`} />
          )}
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-base mb-1">
            {isPendingApproval ? "Aguardando aprovação" :
             isRejected ? "Inscrição recusada" :
             "Bolão não encontrado"}
          </h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isPendingApproval
              ? "Sua inscrição está aguardando confirmação de pagamento pelo organizador. Você será notificado quando for aprovado."
              : isRejected
              ? "Sua inscrição foi recusada pelo organizador. Entre em contato para mais informações."
              : errMsg || "O bolão solicitado não existe ou você não tem acesso."}
          </p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline">Voltar ao painel</Button>
        </Link>
      </div>
    );
  }

  const { pool, tournament, rules, memberCount, myRole } = data;
  const isOrganizer = myRole === "organizer" || user?.role === "admin";
  const isParticipant = myRole === "participant";

  const myBetsItems = Array.isArray(myBets) ? myBets : (myBets?.items ?? []);
  const betsByGame = new Map(myBetsItems.map((b) => [b.gameId, b]) ?? []);
  const deadlineMinutes = rules?.bettingDeadlineMinutes ?? 60;

  const isGameOpen = (matchDate: Date) => {
    // Bolão encerrado ou aguardando conclusão: nenhum jogo está aberto para palpites
    if (pool.status !== "active") return false;
    const deadline = new Date(new Date(matchDate).getTime() - deadlineMinutes * 60 * 1000);
    return new Date() < deadline;
  };

  const handleBetSubmit = (gameId: number) => {
    const input = betInputs[gameId];
    if (!input?.a || !input?.b) return toast.error("Preencha os dois placares.");
    const a = parseInt(input.a);
    const b = parseInt(input.b);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return toast.error("Placar inválido.");
    placeBet.mutate({ poolId: pool.id, gameId, predictedScoreA: a, predictedScoreB: b });
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${pool.inviteToken}`;
    try { navigator.clipboard.writeText(link); } catch { /* fallback silencioso */ }
    analytics.trackInviteSent({ pool_slug: slug ?? undefined, method: "copy" });
    toast.success("Link copiado!");
  };

  /* Palpites pendentes para o badge do FAB */
  const pendingBetsCount = games.filter((g) => {
    const open = isGameOpen(g.matchDate);
    return open && g.status !== "finished" && !betsByGame.has(g.id);
  }).length;

  // ── Classificação de jogos para filtros ───────────────────────────────────────
  type GameFilterKey = "all" | "pending" | "editable" | "waiting" | "correct" | "wrong" | "missed";
  // classifyGameForFilter usa betsByGame e deadlineMinutes já definidos acima
  const classifyGameForFilter = (g: typeof games[0]): GameFilterKey => {
    const deadline = new Date(new Date(g.matchDate).getTime() - deadlineMinutes * 60 * 1000);
    const deadlinePassed = Date.now() > deadline.getTime();
    const myBet = betsByGame.get(g.id);
    if (!myBet) {
      return !deadlinePassed ? "pending" : "missed";
    }
    if (!deadlinePassed && myBet.resultType === "pending") return "editable";
    if (myBet.resultType === "pending") return "waiting";
    if (myBet.resultType === "exact" || myBet.resultType === "correct_result") return "correct";
    return "wrong";
  };

  const filterConfig: { key: GameFilterKey; label: string; count?: number; urgent?: boolean }[] = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Falta palpitar", count: filterCounts.pending, urgent: true },
    { key: "editable", label: "Editáveis", count: filterCounts.editable },
    { key: "waiting", label: "Aguardando", count: filterCounts.waiting },
    { key: "correct", label: "Acertei", count: filterCounts.correct },
    { key: "wrong", label: "Errei", count: filterCounts.wrong },
    { key: "missed", label: "Sem palpite", count: filterCounts.missed },
  ];

  const applyGameFilter = (gameList: typeof games) => {
    if (activeFilter === "all") return gameList;
    return gameList.filter((g) => classifyGameForFilter(g) === activeFilter);
  };

  /* Stats para o hero */
  const finishedGames = games.filter((g) => g.status === "finished").length;
  const scheduledGames = games.filter((g) => g.status === "scheduled").length;
  const liveGames = games.filter((g) => g.status === "live").length;
  const totalGames = games.length;
  const progressPct = totalGames > 0 ? Math.round((finishedGames / totalGames) * 100) : 0;

  /* Posição do usuário no ranking — usa myPoolPosition (carregada na abertura da página) */
  const myPoints = myPosition?.points ?? null;

  /* Próximo jogo */
  const nextGame = games
    .filter((g) => g.status === "scheduled")
    .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())[0];

  const INITIAL_GAMES_SHOWN = 5;

  // Filtrar TODOS os jogos primeiro, depois fatiar para paginação (modo simples)
  const simpleFilteredGames = applyGameFilter(games);
  const simpleVisibleGames = showAllGames ? simpleFilteredGames : simpleFilteredGames.slice(0, INITIAL_GAMES_SHOWN);

  return (
    <AppShell>
    <div className="min-h-screen bg-background">
      {/* Confetes de pódio — apenas para 1º lugar, some em 2.5s */}
      <PodiumConfetti active={podiumAnimation === "confetti"} />



      {/* ── Header sticky — desktop only (mobile usa AppShell top bar + sub-header abaixo) ── */}
      <header className="hidden lg:block sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-md">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <p className="font-semibold text-sm leading-tight truncate">{pool.name}</p>
              {tournament?.name && (
                <p className="text-xs text-muted-foreground truncate">{tournament.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationBell />
            {/* Engrenagem — apenas para organizadores */}
            {isOrganizer && (
              <Link href={`/pool/${slug}/manage`}>
                <Button variant="ghost" size="icon" className="w-8 h-8" title="Configurações do bolão">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            )}
            {/* Menu de ações */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem asChild>
                  <Link href={`/pool/${slug}/history`} className="flex items-center gap-2 cursor-pointer">
                    <Trophy className="w-3.5 h-3.5" /> Meus Palpites
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/pool/${slug}/bracket`} className="flex items-center gap-2 cursor-pointer">
                    <Medal className="w-3.5 h-3.5" /> Chaveamento
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href={`/pool/${slug}/rules`} className="flex items-center gap-2 cursor-pointer">
                    <Lock className="w-3.5 h-3.5" /> Regulamento
                  </Link>
                </DropdownMenuItem>
                {isOrganizer && (
                  <DropdownMenuItem asChild>
                    <Link href={`/pool/${slug}/manage`} className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-3.5 h-3.5" /> Gerenciar bolão
                    </Link>
                  </DropdownMenuItem>
                )}
                {isParticipant && (
                  <>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive focus:bg-destructive/10 flex items-center gap-2 cursor-pointer"
                      onClick={() => setShowLeaveConfirm(true)}
                    >
                      <LogOut className="w-3.5 h-3.5" /> Sair do bolão
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-primary/8 to-background border-b border-border/30">
        {/* Fundo decorativo */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -bottom-8 -left-8 w-48 h-48 rounded-full bg-primary/5 blur-2xl" />
        </div>

        <div className="relative max-w-2xl mx-auto px-4 py-5">
          <div className="flex items-start gap-4">
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 overflow-hidden shadow-lg">
              {pool.logoUrl ? (
                <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
              ) : (
                <Trophy className="w-8 h-8 text-primary" />
              )}
            </div>

            {/* Info principal */}
            <div className="flex-1 min-w-0">
              <h1 className="font-display font-bold text-lg leading-tight truncate">
                {pool.name}
              </h1>
              {tournament?.name && (
                <p className="text-sm text-muted-foreground mt-0.5">{tournament.name}</p>
              )}

              {/* Status do campeonato */}
              <div className="mt-2">
                {liveGames > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-red-500/15 text-red-400 border border-red-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                    {liveGames} jogo{liveGames > 1 ? "s" : ""} ao vivo
                  </span>
                ) : finishedGames === 0 && totalGames > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-primary/10 text-primary border border-primary/20">
                    <Calendar className="w-3 h-3" />
                    {nextGame
                      ? `Começa ${formatDistanceToNow(new Date(nextGame.matchDate), { locale: ptBR, addSuffix: true })}`
                      : "Aguardando início"}
                  </span>
                ) : finishedGames >= totalGames && totalGames > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                    Campeonato encerrado
                  </span>
                ) : (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Progresso</span>
                      <span className="text-xs font-mono font-semibold text-primary">{progressPct}%</span>
                    </div>
                    <div className="h-1.5 w-full max-w-[180px] rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all duration-700"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-4 grid grid-cols-3 gap-2">
            {/* Minha posição */}
            <div className="bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl p-3 text-center">
              {myPosition?.position != null ? (
                <>
                  <p className="text-2xl font-bold text-primary font-mono leading-none">#{myPosition.position}</p>
                  <p className="text-xs text-muted-foreground mt-1">Minha posição</p>
                  {myPoints !== null && (
                    <p className="text-xs font-semibold text-primary mt-0.5">{myPoints} pts</p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold text-muted-foreground font-mono leading-none">—</p>
                  <p className="text-xs text-muted-foreground mt-1">Minha posição</p>
                </>
              )}
            </div>

            {/* Participantes */}
            <div className="bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold font-mono leading-none">{memberCount}</p>
              <p className="text-xs text-muted-foreground mt-1">Participantes</p>
            </div>

            {/* Jogos */}
            <div className="bg-background/60 backdrop-blur-sm border border-border/40 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold font-mono leading-none">
                {scheduledGames > 0 ? scheduledGames : finishedGames}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {scheduledGames > 0 ? "Próximos" : "Encerrados"}
              </p>
            </div>
          </div>

          {/* ── Banner: Aguardando confirmação de encerramento ── */}
          {pool.status === "awaiting_conclusion" && isOrganizer && (
            <ConclusionBanner poolId={pool.id} poolName={pool.name} />
          )}
          {pool.status === "awaiting_conclusion" && !isOrganizer && (
            <AwaitingConclusionParticipantBanner />
          )}

          {/* ── Banner: Retrospectiva disponível (bolão concluído) ── */}
          {pool.status === "concluded" && (
            <RetrospectiveBanner poolId={pool.id} poolSlug={pool.slug} />
          )}

          {/* ── Card de posição em destaque (bolão concluído) ── */}
          {pool.status === "concluded" && (
            <ShareCardPoolBanner poolId={pool.id} poolSlug={pool.slug} poolName={pool.name} />
          )}

          {/* ── Banner do patrocinador (abaixo do hero, acima do invite banner) ── */}
          {pool.id && <SponsorWelcomeMessage poolId={pool.id} userId={user?.id ?? 0} />}
          {pool.id && <SponsorBanner poolId={pool.id} className="mx-4 mt-3" />}
          {/* Invite banner — organizador vê o banner completo; participante vê botão discreto de compartilhar (apenas se invitePermission === all_members) */}
          {pool.inviteToken && (
            isOrganizer
              ? <InviteBanner inviteToken={pool.inviteToken} onCopy={copyInviteLink} />
              : ((pool as any).invitePermission === "all_members"
                  ? <ParticipantShareButton inviteToken={pool.inviteToken} poolName={pool.name} />
                  : (
                    <div className="mx-4 mt-3 px-4 py-2.5 rounded-xl bg-muted/40 border border-border/40 flex items-center gap-2.5">
                      <Lock className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        {publicSettings?.restrictedInviteMessage ?? "Convites gerenciados pelo organizador."}
                      </p>
                    </div>
                  ))
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* TabsList — visível no desktop, oculta no mobile (usa PoolBottomNav) */}
          <TabsList className="hidden lg:flex w-full mb-4 bg-muted/40 p-1 rounded-xl h-auto gap-0.5">
            <TabsTrigger value="games" className="flex-1 text-sm py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Jogos
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex-1 text-sm py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Ranking
            </TabsTrigger>
            <TabsTrigger value="duelos" className="flex-1 text-sm py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Duelos
            </TabsTrigger>
            <TabsTrigger value="mural" className="flex-1 text-sm py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Mural
            </TabsTrigger>
            <TabsTrigger value="rules" className="flex-1 text-sm py-2 rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-sm">
              Regras
            </TabsTrigger>
          </TabsList>
          {/* TabsList mobile — oculta (usa PoolBottomNav) */}
          <TabsList className="lg:hidden hidden">
            <TabsTrigger value="games">Jogos</TabsTrigger>
            <TabsTrigger value="ranking">Ranking</TabsTrigger>
            <TabsTrigger value="duelos">Duelos</TabsTrigger>
            <TabsTrigger value="mural">Mural</TabsTrigger>
            <TabsTrigger value="rules">Regulamento</TabsTrigger>
          </TabsList>

          {/* ══ ABA JOGOS ══ */}
          <TabsContent value="games" className="space-y-3 mt-0">

            {/* ── Banner de urgência ── */}
            {games.length > 0 && filterCounts.pending > 0 && activeFilter !== "pending" && (
              <button
                onClick={() => { setActiveFilter("pending"); setShowFilters(true); }}
                className="w-full flex items-center gap-3 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-xl px-4 py-3 text-left hover:bg-[#FFB800]/15 transition-colors"
              >
                <AlertTriangle className="w-5 h-5 text-[#FFB800] shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#FFB800]">
                    {filterCounts.pending}{" "}
                    {filterCounts.pending === 1 ? "jogo aguarda seu palpite" : "jogos aguardam seu palpite"}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">Toque para ver e palpitar agora</p>
                </div>
                <PenLine className="w-4 h-4 text-[#FFB800] shrink-0" />
              </button>
            )}

            {/* ── Barra de filtros colapsável ── */}
            {/* Chips de filtro — sempre visíveis, scroll horizontal com sombra */}
            {games.length > 0 && (
              <div className="relative -mx-4">
                <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-6 z-10 bg-gradient-to-r from-background to-transparent" />
                <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-background to-transparent" />
                <div className="flex gap-2 overflow-x-auto pb-2 pt-0.5 scrollbar-hide px-4">
                  {filterConfig.map((f) => {
                    const isActive = activeFilter === f.key;
                    const hasBadge = (f.count ?? 0) > 0;
                    return (
                      <button
                        key={f.key}
                        onClick={() => setActiveFilter(f.key)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0 ${
                          isActive
                            ? "bg-[#FFB800] text-[#0B0F1A]"
                            : "bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                        }`}
                      >
                        {f.label}
                        {hasBadge && (
                          <span
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                              isActive
                                ? "bg-[#0B0F1A]/20 text-[#0B0F1A]"
                                : f.urgent
                                ? "bg-[#FF3B3B] text-white"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {f.count}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {games.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum jogo cadastrado ainda.</p>
              </div>
            ) : hasMultiplePhases ? (
              /* ── MODO FASES: accordion por fase ── */
              <div className="space-y-2">
                {gamesByPhase.map(([phaseKey, phaseGames]) => {
                  const filteredPhaseGames = applyGameFilter(phaseGames);
                  if (filteredPhaseGames.length === 0) return null;
                  const label = allGamesHaveRound && phaseKey.startsWith("round_")
                    ? `Rodada ${phaseKey.replace("round_", "")}`
                    : (phaseLabels.get(phaseKey) ?? getPhaseLabel(phaseKey));
                  const isExpanded = expandedPhases.has(phaseKey);
                  const hasLive = filteredPhaseGames.some((g) => g.status === "live");
                  const hasOpen = filteredPhaseGames.some((g) => g.status === "scheduled" && isGameOpen(g.matchDate));
                  const allFinished = filteredPhaseGames.every((g) => g.status === "finished");
                  const pendingBets = filteredPhaseGames.filter((g) => {
                    const open = isGameOpen(g.matchDate);
                    return open && g.status !== "finished" && !betsByGame.has(g.id);
                  }).length;
                  // Confrontos visuais para fases de mata-mata com times definidos
                  const phaseMatchups = phaseGames
                    .filter((g) => g.teamAName && g.teamBName)
                    .map((g) => `${g.teamAName} vs ${g.teamBName}`);
                  const isKnockoutPhase = phaseMatchups.length > 0 && phaseMatchups.length === phaseGames.length;

                  return (
                    <div key={phaseKey} className="rounded-xl border border-border/40 overflow-hidden">
                      {/* Cabeçalho da fase */}
                      <button
                        onClick={() => togglePhase(phaseKey)}
                        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors ${
                          hasLive
                            ? "bg-red-500/10 hover:bg-red-500/15"
                            : isExpanded
                            ? "bg-primary/8 hover:bg-primary/12"
                            : "bg-muted/30 hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                          <div className="flex items-center gap-2.5">
                            {hasLive && (
                              <span className="w-2 h-2 rounded-full bg-red-400 animate-pulse shrink-0" />
                            )}
                            <span className={`font-semibold text-sm ${
                              hasLive ? "text-red-400" : isExpanded ? "text-primary" : "text-foreground"
                            }`}>
                              {label}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {phaseGames.length} jogo{phaseGames.length !== 1 ? "s" : ""}
                            </span>
                            {pendingBets > 0 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold">
                                {pendingBets} sem palpite
                              </span>
                            )}
                            {allFinished && (
                              <span className="text-xs text-muted-foreground/60">✓ Encerrada</span>
                            )}
                          </div>
                          {/* Confrontos visuais — apenas para fases com times definidos e fase recolhida */}
                          {isKnockoutPhase && !isExpanded && (
                            <p className="text-[10px] text-muted-foreground/70 truncate leading-tight">
                              {phaseMatchups.slice(0, 3).join(" · ")}{phaseMatchups.length > 3 ? ` · +${phaseMatchups.length - 3}` : ""}
                            </p>
                          )}
                        </div>
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Jogos da fase */}
                      {isExpanded && (
                        <div className="divide-y divide-border/20">
                          <AdInterleaved
                            items={filteredPhaseGames}
                            showAds={!isPro}
                            interval={4}
                            renderItem={(game) => {
                              const myBet = betsByGame.get(game.id);
                              const open = isGameOpen(game.matchDate);
                              const finished = game.status === "finished";
                              const live = game.status === "live";
                              const betA = betInputs[game.id]?.a ?? (myBet ? String(myBet.predictedScoreA) : "");
                              const betB = betInputs[game.id]?.b ?? (myBet ? String(myBet.predictedScoreB) : "");
                              const hasBet = !!myBet;
                              return (
                                <GameCard
                                  key={game.id}
                                  game={game}
                                  myBet={myBet}
                                  open={open}
                                  finished={finished}
                                  live={live}
                                  betA={betA}
                                  betB={betB}
                                  hasBet={hasBet}
                                  poolId={pool.id}
                                  betInputs={betInputs}
                                  setBetInputs={setBetInputs}
                                  handleBetSubmit={handleBetSubmit}
                                  placeBetPending={placeBet.isPending}
                                  myRankPosition={myPosition?.position}
                                  shareCardConfig={adConfig?.shareCardConfig}
                                  predictionReliable={data?.predictionReliable ?? false}
                                />
                              );
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── MODO SIMPLES: lista com "mostrar mais" ── */
              <div className="space-y-3">
                {simpleFilteredGames.length === 0 && activeFilter !== "all" && (
                  <div className="text-center py-10 text-muted-foreground">
                    <Filter className="w-8 h-8 mx-auto mb-2 opacity-20" />
                    <p className="text-sm">Nenhum jogo nesta categoria.</p>
                    <button onClick={() => setActiveFilter("all")} className="text-xs text-primary mt-1 hover:underline">Ver todos</button>
                  </div>
                )}
                <AdInterleaved
                  items={simpleVisibleGames}
                  showAds={!isPro}
                  interval={4}
                  renderItem={(game) => {
                    const myBet = betsByGame.get(game.id);
                    const open = isGameOpen(game.matchDate);
                    const finished = game.status === "finished";
                    const live = game.status === "live";
                    const betA = betInputs[game.id]?.a ?? (myBet ? String(myBet.predictedScoreA) : "");
                    const betB = betInputs[game.id]?.b ?? (myBet ? String(myBet.predictedScoreB) : "");
                    const hasBet = !!myBet;
                    return (
                      <GameCard
                        key={game.id}
                        game={game}
                        myBet={myBet}
                        open={open}
                        finished={finished}
                        live={live}
                        betA={betA}
                        betB={betB}
                        hasBet={hasBet}
                        poolId={pool.id}
                        betInputs={betInputs}
                        setBetInputs={setBetInputs}
                        handleBetSubmit={handleBetSubmit}
                        placeBetPending={placeBet.isPending}
                        myRankPosition={myPosition?.position}
                        showPhaseLabel
                        shareCardConfig={adConfig?.shareCardConfig}
                        predictionReliable={data?.predictionReliable ?? false}
                      />
                    );
                  }}
                />
                {simpleFilteredGames.length > INITIAL_GAMES_SHOWN && (
                  <button
                    onClick={() => setShowAllGames((v) => !v)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border/40 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAllGames ? "rotate-180" : ""}`} />
                    {showAllGames
                      ? "Mostrar menos"
                      : `Ver mais ${simpleFilteredGames.length - INITIAL_GAMES_SHOWN} jogo${simpleFilteredGames.length - INITIAL_GAMES_SHOWN !== 1 ? "s" : ""}`}
                  </button>
                )}
              </div>
            )}

            {/* AdBanner entre seções — apenas para usuários free */}
            {games.length > 0 && !isPro && <AdBanner position="between_sections" className="w-full mt-3" />}
          </TabsContent>

          {/* ══ ABA RANKING ══ */}
          <TabsContent value="ranking" className="mt-0">
            {rankingLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : !ranking || ranking.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum participante no bolão ainda.</p>
                <p className="text-xs mt-1">Convide amigos para começar!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Lista completa — formato único, sem pódio em cards */}
                {(() => {
                  const allZero = ranking.every((r) => r.stats.totalPoints === 0);
                  const leaderPts = ranking[0]?.stats.totalPoints ?? 0;
                  return (
                    <div className="space-y-1">
                      <AdInterleaved
                        items={ranking}
                        showAds={!isPro}
                        interval={5}
                        adClassName="w-full my-2"
                        renderItem={(rankItem, idx) => {
                        const { stats, user: rankUser } = rankItem;
                        const hasStats = (rankItem as typeof rankItem & { hasStats?: boolean }).hasStats !== false;
                        const isMe = rankUser.id === user?.id;
                        const delta = !allZero && idx > 0 ? stats.totalPoints - leaderPts : null;

                        // Separador sutil após o 3º lugar
                        const showSeparator = idx === 2 && ranking.length > 3;

                        // Número de posição (sempre visível)
                        const positionNumber = (
                          <span className="w-6 text-center text-xs font-bold text-muted-foreground shrink-0">{idx + 1}</span>
                        );

                        // Badge de posição — Crown/Medal apenas para top-3
                        // Glow pulse no ícone quando o usuário acabou de entrar no pódio
                        const isMePodium = isMe && idx < 3 && podiumAnimation !== "idle";
                        // Paleta oficial Plakr!: gold=#FFB800, silver=#E5E5E5, bronze=#CD7F32
                        const positionBadge = idx === 0 ? (
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isMePodium ? "animate-[podium-glow-gold_1s_ease-out]" : ""
                            }`}
                            style={{ background: "rgba(255,184,0,0.15)" }}
                          >
                            <Crown className="w-4 h-4" style={{ color: "#FFB800" }} />
                          </span>
                        ) : idx === 1 ? (
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isMePodium ? "animate-[podium-glow-silver_1s_ease-out]" : ""
                            }`}
                            style={{ background: "rgba(229,229,229,0.12)" }}
                          >
                            <Medal className="w-4 h-4" style={{ color: "#E5E5E5" }} />
                          </span>
                        ) : idx === 2 ? (
                          <span
                            className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${
                              isMePodium ? "animate-[podium-glow-bronze_1s_ease-out]" : ""
                            }`}
                            style={{ background: "rgba(205,127,50,0.15)" }}
                          >
                            <Medal className="w-4 h-4" style={{ color: "#CD7F32" }} />
                          </span>
                        ) : null;

                        // Animação no card: rise/drop sempre; glow (enter/confetti) sem slide
                        const cardAnim = isMe && podiumAnimation === "rise"
                          ? "animate-[rank-rise_0.5s_ease-out]"
                          : isMe && podiumAnimation === "drop"
                          ? "animate-[rank-drop_0.5s_ease-out]"
                          : "";

                        return (
                          <>
                            <div
                              key={`${rankUser.id}-${idx}`}
                              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${cardAnim} ${
                                isMe
                                  ? "border-primary/40 bg-primary/5"
                                  : idx < 3 && !allZero
                                  ? "border-border/40 bg-card/80"
                                  : "border-border/20 bg-card/40 hover:border-border/40"
                              }`}
                            >
                              {/* Número de posição */}
                              {positionNumber}

                              {/* Badge de posição (apenas top-3) */}
                              {positionBadge}

                              {/* Avatar — borda dinâmica por posição (paleta oficial) */}
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 border-2"
                                style={{
                                  background: isMe
                                    ? "rgba(255,184,0,0.2)"
                                    : idx === 0 && !allZero ? "rgba(255,184,0,0.15)"
                                    : idx === 1 && !allZero ? "rgba(229,229,229,0.1)"
                                    : idx === 2 && !allZero ? "rgba(205,127,50,0.15)"
                                    : undefined,
                                  borderColor: isMe
                                    ? "rgba(255,184,0,0.6)"
                                    : idx === 0 && !allZero ? "rgba(255,184,0,0.7)"
                                    : idx === 1 && !allZero ? "rgba(229,229,229,0.5)"
                                    : idx === 2 && !allZero ? "rgba(205,127,50,0.6)"
                                    : "transparent",
                                  color: isMe
                                    ? "#FFB800"
                                    : idx === 0 && !allZero ? "#FFB800"
                                    : idx === 1 && !allZero ? "#E5E5E5"
                                    : idx === 2 && !allZero ? "#CD7F32"
                                    : undefined,
                                }}
                              >
                                {rankUser.name?.charAt(0)?.toUpperCase() ?? "?"}
                              </div>

                              {/* Nome + stats */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <a
                                    href={`/profile/${rankUser.id}`}
                                    className="text-sm font-semibold truncate hover:text-primary transition-colors"
                                    style={{
                                      color: isMe ? "var(--primary)"
                                        : idx === 0 && !allZero ? "#FFB800"
                                        : undefined
                                    }}
                                  >
                                    {rankUser.name}
                                  </a>
                                  {isMe && (
                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                                      você
                                    </span>
                                  )}
                                  {/* Indicador de subida/descida — apenas ícone, sem texto */}
                                  {isMe && podiumAnimation === "rise" && (
                                    <span className="shrink-0 w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center animate-[podium-enter_0.3s_ease-out]">
                                      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-emerald-400" fill="currentColor"><path d="M5 2 L8.5 7 L1.5 7 Z"/></svg>
                                    </span>
                                  )}
                                  {isMe && podiumAnimation === "drop" && (
                                    <span className="shrink-0 w-4 h-4 rounded-full bg-red-500/20 flex items-center justify-center animate-[podium-enter_0.3s_ease-out]">
                                      <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 text-red-400" fill="currentColor"><path d="M5 8 L8.5 3 L1.5 3 Z"/></svg>
                                    </span>
                                  )}

                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                  {hasStats
                                    ? `${stats.exactScoreCount} 🎯 · ${stats.correctResultCount} ✅ · ${stats.totalBets} palpites`
                                    : "Ainda não fez palpites"}
                                </p>
                              </div>

                              {/* Pontos + delta */}
                              <div className="text-right shrink-0">
                                <p
                                  className="text-base font-black font-mono leading-tight"
                                  style={{
                                    color: allZero ? undefined
                                      : isMe ? "var(--primary)"
                                      : idx === 0 ? "#FFB800"
                                      : undefined
                                  }}
                                >
                                  {stats.totalPoints} <span className="text-xs font-normal text-muted-foreground">pts</span>
                                </p>
                                {delta !== null && (
                                  <p className="text-[10px] text-muted-foreground/70 font-mono">
                                    {delta} pts
                                  </p>
                                )}
                              </div>
                              {/* Botão X1 — só aparece para outros participantes, não para si mesmo */}
                              {!isMe && user && (
                                <button
                                  onClick={() => setX1Modal({ open: true, opponentId: rankUser.id, opponentName: rankUser.name ?? "" })}
                                  className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border border-border/30 bg-card/40 hover:border-primary/40 hover:bg-primary/10 transition-all group"
                                  title={`Desafiar ${rankUser.name} no X1`}
                                >
                                  <Swords className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                                </button>
                              )}
                            </div>
                            {/* Separador visual após top-3 */}
                            {showSeparator && (
                              <>
                                <div className="flex items-center gap-2 py-1 px-1">
                                  <div className="flex-1 h-px bg-border/30" />
                                  <span className="text-[10px] text-muted-foreground/50 shrink-0">demais participantes</span>
                                  <div className="flex-1 h-px bg-border/30" />
                                </div>
                                {/* Banner between_sections após top-3 — apenas para usuários free */}
                                {!isPro && <AdBanner position="between_sections" className="w-full my-1" />}
                              </>
                            )}
                          </>
                        );
                        }}
                      />
                    </div>
                  );
                })()}

                {/* Rodapé: data/hora da última atualização */}
                {(() => {
                  const lastUpdated = ranking
                    .map((r) => r.stats.updatedAt)
                    .filter(Boolean)
                    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
                  return lastUpdated ? (
                    <p className="text-center text-[10px] text-muted-foreground/50 pt-1">
                      Atualizado em {new Date(lastUpdated).toLocaleString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  ) : (
                    <p className="text-center text-[10px] text-muted-foreground/50 pt-1">Pontos atualizados após o encerramento dos jogos</p>
                  );
                })()}

              </div>
            )}
          </TabsContent>

          {/* ══ ABA DUELOS ══ */}
          <TabsContent value="duelos" className="mt-0">
            {data?.pool.id && (
              <X1DuelsTab
                poolId={data.pool.id}
                poolSlug={slug ?? ""}
                onChallenge={(opponentId, opponentName) => {
                  setX1Modal({ open: true, opponentId, opponentName });
                }}
              />
            )}
          </TabsContent>
          {/* ══ ABA MURAL ══ */}
          <TabsContent value="mural" className="mt-0">
            {data?.pool.id && (
              <PoolMural
                poolSlug={slug ?? ""}
                poolId={data.pool.id}
                isOrganizer={isOrganizer}
              />
            )}
          </TabsContent>

          {/* ══ ABA REGULAMENTO ══ */}
          <TabsContent value="rules" className="mt-0">
            <div className="text-center py-10 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                <ScrollText className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-base mb-1">Regulamento do Bolão</h3>
                <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                  Consulte as regras de pontuação, prazo de palpites e critérios de desempate.
                </p>
              </div>
              <Link href={`/pool/${slug}/rules`}>
                <Button className="gap-2">
                  <ScrollText className="w-4 h-4" /> Ver Regulamento Completo
                </Button>
              </Link>
            </div>
          </TabsContent>
        </Tabs>
      </main>

      {/* AlertDialog: confirmar saída do bolão */}
      <AlertDialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sair do bolão?</AlertDialogTitle>
            <AlertDialogDescription>
              Você irá sair de <strong>{pool.name}</strong>. Seus palpites serão mantidos, mas você precisará de um novo convite para voltar.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={leaveMutation.isPending}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => leaveMutation.mutate({ poolId: pool.id })}
              disabled={leaveMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {leaveMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saindo...</>
              ) : (
                <><LogOut className="w-4 h-4 mr-2" /> Sair do bolão</>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal X1 — Vem pro X1 */}
      {x1Modal && data?.pool.id && (
        <X1ChallengeModal
          open={x1Modal.open}
          onClose={() => setX1Modal(null)}
          poolId={data.pool.id}
          opponentId={x1Modal.opponentId}
          opponentName={x1Modal.opponentName}
          onSuccess={(challengeId) => {
            navigate(`/x1/${challengeId}`);
          }}
        />
      )}

      {/* ── Popup do patrocinador ── */}
      {pool?.id && user?.id && <SponsorPopup poolId={pool.id} userId={user.id} />}
      {/* ── Barra de navegação inferior FAB ── */}
      <PoolBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onPendingFilter={() => {
          setActiveFilter("pending");
          setShowFilters(true);
        }}
        pendingBetsCount={pendingBetsCount}
        slug={slug}
      />
    </div>
    </AppShell>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
 * InviteBanner — link de convite mascarado com botão revelar/copiar
 * ──────────────────────────────────────────────────────────────────────────── */
function InviteBanner({ inviteToken, onCopy }: { inviteToken: string; onCopy: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const fullUrl = `${window.location.origin}/join/${inviteToken}`;
  const maskedUrl = `••••••••••••••••`;

  return (
    <div className="mt-3 flex items-center justify-between gap-3 bg-background/50 border border-primary/20 rounded-xl px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-primary">Link de convite</p>
        <p className="text-xs text-muted-foreground truncate max-w-[200px] font-mono">
          {revealed ? fullUrl : maskedUrl}
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <Button
          size="sm" variant="ghost"
          onClick={() => setRevealed((v) => !v)}
          className="h-7 text-xs px-2 text-muted-foreground"
        >
          {revealed ? "Ocultar" : "Revelar"}
        </Button>
        <Button size="sm" variant="outline" onClick={onCopy} className="h-7 text-xs gap-1.5">
          <Copy className="w-3 h-3" /> Copiar
        </Button>
      </div>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────────
 * PodiumConfetti — chuva de confetes leve para 1º lugar (CSS puro, sem lib)
 * ─────────────────────────────────────────────────────────────────────────────── */
const CONFETTI_COLORS = ["#facc15", "#fb923c", "#34d399", "#60a5fa", "#f472b6", "#a78bfa"];

function PodiumConfetti({ active }: { active: boolean }) {
  if (!active) return null;
  const pieces = Array.from({ length: 28 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
    delay: `${(Math.random() * 0.8).toFixed(2)}s`,
    duration: `${(1.2 + Math.random() * 0.8).toFixed(2)}s`,
    size: Math.random() > 0.5 ? 6 : 8,
    rotate: Math.floor(Math.random() * 360),
  }));

  return (
    <div
      className="pointer-events-none fixed inset-0 overflow-hidden z-50"
      aria-hidden
    >
      {pieces.map((p) => (
        <div
          key={p.id}
          style={{
            position: "absolute",
            left: p.left,
            top: "-10px",
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            transform: `rotate(${p.rotate}deg)`,
            animation: `confetti-fall ${p.duration} ${p.delay} ease-in forwards`,
          }}
        />
      ))}
      <style>{`
        @keyframes confetti-fall {
          0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg) scale(0.6); opacity: 0; }
        }
        @keyframes podium-enter {
          0%   { opacity: 0; transform: translateY(12px) scale(0.97); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        /* Animações de pódio — paleta oficial Plakr! */
        @keyframes podium-glow-gold {
          /* #FFB800 */
          0%   { box-shadow: 0 0 0 0 rgba(255,184,0,0); background-color: rgba(255,184,0,0.15); }
          40%  { box-shadow: 0 0 0 6px rgba(255,184,0,0.45); background-color: rgba(255,184,0,0.35); }
          100% { box-shadow: 0 0 0 0 rgba(255,184,0,0); background-color: rgba(255,184,0,0.15); }
        }
        @keyframes podium-glow-silver {
          /* #E5E5E5 */
          0%   { box-shadow: 0 0 0 0 rgba(229,229,229,0); background-color: rgba(229,229,229,0.12); }
          40%  { box-shadow: 0 0 0 6px rgba(229,229,229,0.35); background-color: rgba(229,229,229,0.28); }
          100% { box-shadow: 0 0 0 0 rgba(229,229,229,0); background-color: rgba(229,229,229,0.12); }
        }
        @keyframes podium-glow-bronze {
          /* #CD7F32 */
          0%   { box-shadow: 0 0 0 0 rgba(205,127,50,0); background-color: rgba(205,127,50,0.15); }
          40%  { box-shadow: 0 0 0 6px rgba(205,127,50,0.45); background-color: rgba(205,127,50,0.35); }
          100% { box-shadow: 0 0 0 0 rgba(205,127,50,0); background-color: rgba(205,127,50,0.15); }
        }
        @keyframes rank-rise {
          /* #00FF88 */
          0%   { transform: translateY(6px); border-color: rgba(0,255,136,0); background-color: inherit; }
          30%  { transform: translateY(-3px); border-color: rgba(0,255,136,0.5); background-color: rgba(0,255,136,0.08); }
          100% { transform: translateY(0); border-color: rgba(0,255,136,0); background-color: inherit; }
        }
        @keyframes rank-drop {
          /* #FF3B3B */
          0%   { transform: translateY(-6px); border-color: rgba(255,59,59,0); background-color: inherit; }
          30%  { transform: translateY(3px); border-color: rgba(255,59,59,0.5); background-color: rgba(255,59,59,0.08); }
          100% { transform: translateY(0); border-color: rgba(255,59,59,0); background-color: inherit; }
        }
      `}</style>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────────
 * ParticipantShareButton — botão discreto para participantes convidarem amigos
 * ─────────────────────────────────────────────────────────────────────────────── */
function ParticipantShareButton({ inviteToken, poolName }: { inviteToken: string; poolName: string }) {
  const inviteUrl = `${window.location.origin}/join/${inviteToken}`;
  const analytics = useAnalytics();

  const handleShare = async () => {
    const shareText = `🏆 Participe do bolão "${poolName}" no Plakr!! Faça seus palpites e dispute o ranking.`;
    // Usa Web Share API se disponível (mobile), senão copia para clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: poolName, text: shareText, url: inviteUrl });
        analytics.trackInviteSent({ pool_slug: poolName, method: "share" });
      } catch {
        // Usuário cancelou o compartilhamento — sem ação necessária
      }
    } else {
      try { navigator.clipboard.writeText(inviteUrl); } catch { /* fallback silencioso */ }
      analytics.trackInviteSent({ pool_slug: poolName, method: "copy" });
      toast.success("Link copiado!", { description: "Compartilhe com seus amigos." });
    }
  };

  return (
    <div className="mt-3">
      <Button
        size="sm"
        variant="outline"
        onClick={handleShare}
        className="h-8 text-xs gap-1.5 border-primary/20 text-primary hover:bg-primary/5"
      >
        <Copy className="w-3 h-3" />
        Convidar amigos
      </Button>
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────────────
 * ConclusionBanner — exibido para o organizador quando o bolão aguarda confirmação
 * ────────────────────────────────────────────────────────────────────────────────── */
function ConclusionBanner({ poolId, poolName }: { poolId: number; poolName: string }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const utils = trpc.useUtils();
  const conclude = trpc.pools.concludePool.useMutation({
    onSuccess: () => {
      toast.success("Bolão encerrado!", {
        description: "O ranking final foi gerado. As retrospectivas estão sendo preparadas para todos os participantes.",
      });
      utils.pools.getBySlug.invalidate();
    },
    onError: (err) => toast.error("Erro ao encerrar", { description: err.message }),
  });

  return (
    <>
      {/* Banner com gradiente para chamar atenção do organizador */}
      <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-primary/40 shadow-lg shadow-primary/10">
        <div className="relative px-4 py-4 bg-gradient-to-r from-amber-950/80 via-amber-900/60 to-amber-950/80">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/5 to-transparent pointer-events-none" />
          <div className="relative flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="w-4 h-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary">Todos os jogos foram apurados!</p>
              <p className="text-xs text-primary/70 mt-0.5 leading-relaxed">
                Confirme o encerramento para gerar o ranking final e as retrospectivas de cada participante.
              </p>
            </div>
          </div>
          <div className="relative mt-3 flex gap-2 justify-end">
            <Button
              size="sm"
              className="h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-bold gap-1.5 shadow-md shadow-primary/30"
              onClick={() => setShowConfirm(true)}
              disabled={conclude.isPending}
            >
              {conclude.isPending ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Encerrando...</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5" /> Confirmar encerramento</>
              )}
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Encerrar bolão "{poolName}"?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Após a confirmação, o bolão será encerrado definitivamente:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>O ranking final será calculado e exibido para todos</li>
                  <li>Cada participante receberá sua retrospectiva personalizada</li>
                  <li>Nenhuma alteração poderá ser feita após o encerramento</li>
                </ul>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
              onClick={() => conclude.mutate({ poolId })}
            >
              Confirmar encerramento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* ───────────────────────────────────────────────────────────────────────────────────
 * RetrospectiveBanner — exibido para todos os participantes quando o bolão está concluído
 * ────────────────────────────────────────────────────────────────────────────────── */
function RetrospectiveBanner({ poolId, poolSlug }: { poolId: number; poolSlug: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-brand/30 shadow-lg shadow-brand/10">
      <div className="relative px-4 py-4 bg-gradient-to-r from-brand/15 via-brand/8 to-brand/15">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-brand/5 to-transparent pointer-events-none" />
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-brand/20 border border-brand/30 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground">Sua retrospectiva está pronta!</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Veja como foi a sua jornada neste bolão — estilo Spotify Wrapped.
            </p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs shrink-0 bg-brand hover:bg-brand/90 gap-1.5 shadow-md shadow-brand/30"
            onClick={() => navigate(`/pool/${poolSlug}/retrospectiva`)}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ver agora
          </Button>
        </div>
      </div>
    </div>
  );
}
/* ─────────────────────────────────────────────────────────────────────────────────────
 * AwaitingConclusionParticipantBanner — exibido para participantes (não organizador)
 * quando o bolão está em awaiting_conclusion
 * ───────────────────────────────────────────────────────────────────────────────────── */
function AwaitingConclusionParticipantBanner() {
  return (
    <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-amber-500/30 shadow-md shadow-amber-500/10">
      <div className="relative px-4 py-3.5 bg-gradient-to-r from-amber-950/60 via-amber-900/40 to-amber-950/60">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/25 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-amber-300">Bolão sendo encerrado</p>
            <p className="text-xs text-amber-400/70 mt-0.5 leading-relaxed">
              Todos os jogos foram apurados. Em breve a retrospectiva e o ranking final estarão disponíveis.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────────────
 * ShareCardPoolBanner— card de posição em destaque na PoolPage após encerramento
 * Busca o shareCard do participante via getRetrospective e exibe com botões de
 * compartilhamento e download direto, sem precisar navegar pelos slides.
 * ────────────────────────────────────────────────────────────────────────────────── */
function ShareCardPoolBanner({ poolId, poolSlug, poolName }: { poolId: number; poolSlug: string; poolName: string }) {
  const { data: retro } = trpc.pools.getRetrospective.useQuery(
    { poolId },
    { staleTime: 5 * 60 * 1000 }
  );

  const shareCard = retro?.shareCard;
  const finalPosition = retro?.finalPosition ?? null;
  const totalMembers = retro?.totalParticipants ?? 0;

  if (!shareCard?.imageUrl) return null;

  const posEmoji = finalPosition === 1 ? "🥇" : finalPosition === 2 ? "🥈" : finalPosition === 3 ? "🥉" : "🏅";

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(shareCard.imageUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plakr-${poolName.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card salvo!");
    } catch {
      toast.error("Não foi possível baixar o card.");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (navigator.canShare) {
        const res = await fetch(shareCard.imageUrl);
        const blob = await res.blob();
        const file = new File([blob], `plakr-${poolName.replace(/\s+/g, "-").toLowerCase()}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Meu card — ${poolName}`,
            text: finalPosition
              ? `Terminei em ${finalPosition}º lugar de ${totalMembers}! #Plakr!`
              : `Confira meu card no Plakr!! #Plakr!`,
          });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: `Meu card — ${poolName}`,
          text: finalPosition
            ? `Terminei em ${finalPosition}º lugar de ${totalMembers}! #Plakr!`
            : `Confira meu card no Plakr!! #Plakr!`,
          url: `${window.location.origin}/pool/${poolSlug}/retrospectiva`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/pool/${poolSlug}/retrospectiva`);
        toast.success("Link copiado!");
      }
    } catch {
      // usuário cancelou
    }
  };

  return (
    <div className="mx-4 mt-3 rounded-xl overflow-hidden border border-primary/30 shadow-lg shadow-primary/10">
      {/* Banner informativo */}
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/15">
        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-xs text-primary font-medium">
          Seu card de posição está pronto! Compartilhe com seus amigos.
        </p>
      </div>
      {/* Conteúdo principal */}
      <div className="flex items-center gap-4 px-4 py-4 bg-gradient-to-br from-primary/8 via-primary/4 to-transparent">
        {/* Card PNG em destaque */}
        <div className="relative shrink-0">
          <div className="absolute -inset-1 rounded-xl bg-primary/25 blur-md opacity-50 pointer-events-none" />
          <div className="relative w-16 h-[90px] rounded-xl overflow-hidden border-2 border-primary/40 shadow-lg shadow-primary/20">
            <img src={shareCard.imageUrl} alt="Card de posição" className="w-full h-full object-cover" />
          </div>
        </div>
        {/* Informações e ações */}
        <div className="flex-1 min-w-0 space-y-2.5">
          {finalPosition ? (
            <div>
              <p className="text-sm font-bold text-foreground">
                {posEmoji} {finalPosition}º lugar de {totalMembers}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">Resultado final do bolão</p>
            </div>
          ) : (
            <p className="text-sm font-semibold text-foreground">Sua posição final</p>
          )}
          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compartilhar
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted border border-border text-xs font-medium hover:bg-muted/80 transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              Salvar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
