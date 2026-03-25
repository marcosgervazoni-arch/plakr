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
import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { useAnalytics } from "@/hooks/useAnalytics";
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
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Loader2,
  Lock,
  LogOut,
  Medal,
  MoreHorizontal,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import BetBreakdownBadges from "@/components/BetBreakdownBadges";
import { AdBanner } from "@/components/AdBanner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      if (tab === "ranking" || tab === "games" || tab === "members") return tab;
    }
    return "games";
  });
  const [betInputs, setBetInputs] = useState<Record<number, { a: string; b: string }>>({});

  const { data, isLoading, error } = trpc.pools.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug, refetchInterval: 60_000 }
  );

  const { data: myBets, refetch: refetchBets } = trpc.bets.myBets.useQuery(
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
    { enabled: !!data?.pool.id && activeTab === "members" }
  );

  const placeBet = trpc.bets.placeBet.useMutation({
    onSuccess: (_, vars) => {
      analytics.trackBetSubmitted({ pool_slug: slug ?? undefined, game_id: vars.gameId });
      toast.success("Palpite salvo!");
      refetchBets();
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

  const gamesByPhase = useMemo(() => {
    const phaseOrder = new Map<string, number>();
    phases.forEach((p, i) => phaseOrder.set(p.key, p.order ?? i));
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
  }, [games, phases]);

  const activePhaseKey = useMemo(() => {
    const livePhase = games.find((g) => g.status === "live")?.phase;
    if (livePhase) return livePhase;
    const nextPhase = games
      .filter((g) => g.status === "scheduled")
      .sort((a, b) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())[0]?.phase;
    return nextPhase ?? uniquePhaseKeys[0] ?? "group_stage";
  }, [games, uniquePhaseKeys]);

  const [showAllGames, setShowAllGames] = useState(false);
  const [expandedPhases, setExpandedPhases] = useState<Set<string>>(() => new Set([activePhaseKey ?? ""]));

  const togglePhase = (key: string) => {
    setExpandedPhases((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

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
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-destructive" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-base mb-1">Bolão não encontrado</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            {error ? (error as unknown as Error).message : "O bolão solicitado não existe ou você não tem acesso."}
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
    navigator.clipboard.writeText(link);
    analytics.trackInviteSent({ pool_slug: slug ?? undefined, method: "copy" });
    toast.success("Link copiado!");
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

  return (
    <div className="min-h-screen bg-background">

      {/* ── Header sticky ── */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/90 backdrop-blur-md">
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
            {pool.plan === "pro" && (
              <Badge className="bg-primary/10 text-primary border-primary/20 text-xs gap-1 py-0">
                <Crown className="w-2.5 h-2.5" /> Pro
              </Badge>
            )}
            <NotificationBell />
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
              <h1 className="font-bold text-lg leading-tight truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
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
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
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

          {/* Invite banner — organizador vê o banner completo; participante vê botão discreto de compartilhar */}
          {pool.inviteToken && (
            isOrganizer
              ? <InviteBanner inviteToken={pool.inviteToken} onCopy={copyInviteLink} />
              : <ParticipantShareButton inviteToken={pool.inviteToken} poolName={pool.name} />
          )}
        </div>
      </div>

      {/* ── Conteúdo principal ── */}
      <main className="max-w-2xl mx-auto px-4 py-5">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          {/* Abas */}
          <TabsList className="w-full bg-card border border-border/50 mb-5 h-10">
            <TabsTrigger value="games" className="flex-1 text-sm gap-1.5">
              <Calendar className="w-3.5 h-3.5" /> Jogos
            </TabsTrigger>
            <TabsTrigger value="ranking" className="flex-1 text-sm gap-1.5">
              <Trophy className="w-3.5 h-3.5" /> Ranking
            </TabsTrigger>
            <TabsTrigger value="members" className="flex-1 text-sm gap-1.5">
              <Users className="w-3.5 h-3.5" /> Membros
            </TabsTrigger>
          </TabsList>

          {/* ══ ABA JOGOS ══ */}
          <TabsContent value="games" className="space-y-3 mt-0">
            {games.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-20" />
                <p className="text-sm">Nenhum jogo cadastrado ainda.</p>
              </div>
            ) : hasMultiplePhases ? (
              /* ── MODO FASES: accordion por fase ── */
              <div className="space-y-2">
                {gamesByPhase.map(([phaseKey, phaseGames]) => {
                  const label = phaseLabels.get(phaseKey) ?? phaseKey;
                  const isExpanded = expandedPhases.has(phaseKey);
                  const hasLive = phaseGames.some((g) => g.status === "live");
                  const hasOpen = phaseGames.some((g) => g.status === "scheduled" && isGameOpen(g.matchDate));
                  const allFinished = phaseGames.every((g) => g.status === "finished");
                  const pendingBets = phaseGames.filter((g) => {
                    const open = isGameOpen(g.matchDate);
                    return open && g.status !== "finished" && !betsByGame.has(g.id);
                  }).length;

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
                        <ChevronDown
                          className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${
                            isExpanded ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {/* Jogos da fase */}
                      {isExpanded && (
                        <div className="divide-y divide-border/20">
                          {phaseGames.map((game) => {
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
                                betInputs={betInputs}
                                setBetInputs={setBetInputs}
                                handleBetSubmit={handleBetSubmit}
                                placeBetPending={placeBet.isPending}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* ── MODO SIMPLES: lista com "mostrar mais" ── */
              <div className="space-y-3">
                {(showAllGames ? games : games.slice(0, INITIAL_GAMES_SHOWN)).map((game) => {
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
                      betInputs={betInputs}
                      setBetInputs={setBetInputs}
                      handleBetSubmit={handleBetSubmit}
                      placeBetPending={placeBet.isPending}
                    />
                  );
                })}
                {games.length > INITIAL_GAMES_SHOWN && (
                  <button
                    onClick={() => setShowAllGames((v) => !v)}
                    className="w-full py-3 flex items-center justify-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground border border-border/40 rounded-xl bg-muted/20 hover:bg-muted/40 transition-colors"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showAllGames ? "rotate-180" : ""}`} />
                    {showAllGames
                      ? "Mostrar menos"
                      : `Ver mais ${games.length - INITIAL_GAMES_SHOWN} jogo${games.length - INITIAL_GAMES_SHOWN !== 1 ? "s" : ""}`}
                  </button>
                )}
              </div>
            )}

            {/* AdBanner no final — não empurra o conteúdo principal */}
            {games.length > 0 && <AdBanner position="top" className="w-full" />}
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
                {/* Card fixo: posição do usuário logado */}
                {(() => {
                  const myIdx = ranking.findIndex((r) => r.user.id === user?.id);
                  const myItem = myIdx >= 0 ? ranking[myIdx] : null;
                  const leaderPtsTop = ranking[0]?.stats.totalPoints ?? 0;
                  const myDelta = myItem && myIdx > 0 ? myItem.stats.totalPoints - leaderPtsTop : null;
                  if (!myItem) return null;
                  return (
                    <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-primary/40 bg-primary/5 mb-1">
                      <div className="flex flex-col items-center shrink-0">
                        <span className="text-[10px] text-muted-foreground uppercase tracking-wide">Posição</span>
                        <span className="text-2xl font-black text-primary leading-none">
                          {myIdx === 0 ? (
                            <Crown className="w-6 h-6 text-yellow-400" />
                          ) : myIdx === 1 ? (
                            <Medal className="w-6 h-6 text-slate-300" />
                          ) : myIdx === 2 ? (
                            <Medal className="w-6 h-6 text-orange-400" />
                          ) : (
                            `${myIdx + 1}º`
                          )}
                        </span>
                      </div>
                      <div className="w-px h-10 bg-border/40 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-muted-foreground">Sua posição atual</p>
                        <p className="text-sm font-semibold text-primary truncate">{myItem.user.name}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xl font-black font-mono text-primary leading-none">{myItem.stats.totalPoints}</p>
                        <p className="text-[10px] text-muted-foreground">pts</p>
                        {myDelta !== null && (
                          <p className="text-[10px] text-muted-foreground/70 font-mono">{myDelta} do líder</p>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Lista completa — formato único, sem pódio em cards */}
                {(() => {
                  const allZero = ranking.every((r) => r.stats.totalPoints === 0);
                  const leaderPts = ranking[0]?.stats.totalPoints ?? 0;
                  return (
                    <div className="space-y-1">
                      {ranking.map((rankItem, idx) => {
                        const { stats, user: rankUser } = rankItem;
                        const hasStats = (rankItem as typeof rankItem & { hasStats?: boolean }).hasStats !== false;
                        const isMe = rankUser.id === user?.id;
                        const delta = !allZero && idx > 0 ? stats.totalPoints - leaderPts : null;

                        // Separador sutil após o 3º lugar
                        const showSeparator = idx === 2 && ranking.length > 3;

                        // Badge de posição — Crown/Medal sempre visíveis nos top-3, independente de pontuação
                        const positionBadge = idx === 0 ? (
                          <span className="w-7 h-7 rounded-full bg-yellow-500/15 flex items-center justify-center shrink-0">
                            <Crown className="w-4 h-4 text-yellow-400" />
                          </span>
                        ) : idx === 1 ? (
                          <span className="w-7 h-7 rounded-full bg-slate-400/15 flex items-center justify-center shrink-0">
                            <Medal className="w-4 h-4 text-slate-300" />
                          </span>
                        ) : idx === 2 ? (
                          <span className="w-7 h-7 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
                            <Medal className="w-4 h-4 text-orange-400" />
                          </span>
                        ) : (
                          <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold text-muted-foreground shrink-0">{idx + 1}</span>
                        );

                        return (
                          <>
                            <div
                              key={`${rankUser.id}-${idx}`}
                              className={`flex items-center gap-3 px-3.5 py-3 rounded-xl border transition-all ${
                                isMe
                                  ? "border-primary/40 bg-primary/5"
                                  : idx < 3 && !allZero
                                  ? "border-border/40 bg-card/80"
                                  : "border-border/20 bg-card/40 hover:border-border/40"
                              }`}
                            >
                              {/* Badge de posição */}
                              {positionBadge}

                              {/* Avatar */}
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                                isMe
                                  ? "bg-primary/20 text-primary"
                                  : idx === 0 && !allZero
                                  ? "bg-yellow-500/20 text-yellow-400"
                                  : "bg-muted text-muted-foreground"
                              }`}>
                                {rankUser.name?.charAt(0)?.toUpperCase() ?? "?"}
                              </div>

                              {/* Nome + stats */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <a
                                    href={`/pool/${slug}/player/${rankUser.id}`}
                                    className={`text-sm font-semibold truncate hover:text-primary transition-colors ${
                                      isMe ? "text-primary" : idx === 0 && !allZero ? "text-yellow-400" : ""
                                    }`}
                                  >
                                    {rankUser.name}
                                  </a>
                                  {isMe && (
                                    <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
                                      você
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
                                <p className={`text-base font-black font-mono leading-tight ${
                                  allZero
                                    ? "text-muted-foreground"
                                    : isMe
                                    ? "text-primary"
                                    : idx === 0
                                    ? "text-yellow-400"
                                    : "text-foreground"
                                }`}>
                                  {stats.totalPoints} <span className="text-xs font-normal text-muted-foreground">pts</span>
                                </p>
                                {delta !== null && (
                                  <p className="text-[10px] text-muted-foreground/70 font-mono">
                                    {delta} pts
                                  </p>
                                )}
                              </div>
                            </div>
                            {/* Separador visual após top-3 */}
                            {showSeparator && (
                              <div className="flex items-center gap-2 py-1 px-1">
                                <div className="flex-1 h-px bg-border/30" />
                                <span className="text-[10px] text-muted-foreground/50 shrink-0">demais participantes</span>
                                <div className="flex-1 h-px bg-border/30" />
                              </div>
                            )}
                          </>
                        );
                      })}
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

          {/* ══ ABA MEMBROS ══ */}
          <TabsContent value="members" className="mt-0">
            {!members ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            ) : (
              <div className="space-y-1.5">
                {(Array.isArray(members) ? members : (members?.items ?? [])).map(({ member, user: memberUser }) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border/30 bg-card/60 hover:border-border/50 transition-all"
                  >
                    {/* Avatar */}
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 ${
                      member.role === "organizer"
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {memberUser.name?.charAt(0)?.toUpperCase() ?? "?"}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <a
                        href={`/pool/${slug}/player/${memberUser.id}`}
                        className="text-sm font-medium hover:text-primary transition-colors truncate block"
                      >
                        {memberUser.name}
                      </a>
                      <p className="text-xs text-muted-foreground">
                        Entrou {format(new Date(member.joinedAt), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </div>

                    {/* Role */}
                    {member.role === "organizer" && (
                      <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-xs gap-1 py-0">
                        <Crown className="w-2.5 h-2.5" /> Organizador
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
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
    </div>
  );
}

/* ───────────────────────────────────────────────────────────────────────────────────
 * GameCard — card reutilizável para um jogo (usado em modo fases e modo simples)
 * ────────────────────────────────────────────────────────────────────────────────── */
interface GameCardProps {
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
  betInputs: Record<number, { a: string; b: string }>;
  setBetInputs: React.Dispatch<React.SetStateAction<Record<number, { a: string; b: string }>>>;
  handleBetSubmit: (gameId: number) => void;
  placeBetPending: boolean;
}

function GameCard({
  game, myBet, open, finished, live, betA, betB, hasBet,
  betInputs, setBetInputs, handleBetSubmit, placeBetPending,
}: GameCardProps) {
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

  return (
    <div
      className={`bg-card transition-all ${
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
          {/* Indicador de urgência */}
          {urgencyLabel && (
            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
              isCritical
                ? "bg-red-500/15 text-red-400 border border-red-500/25"
                : "bg-amber-500/15 text-amber-400 border border-amber-500/25"
            }`}>
              <span className={`w-1 h-1 rounded-full ${
                isCritical ? "bg-red-400 animate-pulse" : "bg-amber-400"
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
              <div className="flex items-center gap-2">
                <Input
                  type="number" min={0} max={99} placeholder="0" value={betA}
                  onChange={(e) => setBetInputs((prev) => ({ ...prev, [game.id]: { a: e.target.value, b: prev[game.id]?.b ?? betB } }))}
                  className="w-14 text-center h-11 text-lg font-bold p-0"
                  inputMode="numeric"
                />
                <span className="text-muted-foreground/70 font-bold text-base select-none">VS</span>
                <Input
                  type="number" min={0} max={99} placeholder="0" value={betB}
                  onChange={(e) => setBetInputs((prev) => ({ ...prev, [game.id]: { a: prev[game.id]?.a ?? betA, b: e.target.value } }))}
                  className="w-14 text-center h-11 text-lg font-bold p-0"
                  inputMode="numeric"
                />
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
            {open && !finished && (
              <Button
                size="sm" className="h-9 px-4 text-xs mt-1 min-w-[100px]"
                onClick={() => handleBetSubmit(game.id)}
                disabled={placeBetPending}
              >
                {placeBetPending ? (
                  <Loader2 className="w-3 h-3 animate-spin" />
                ) : hasBet ? (
                  <><Check className="w-3 h-3 mr-1" /> Atualizar palpite</>
                ) : (
                  "Salvar palpite"
                )}
              </Button>
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

        {/* Badges de pontução */}
        {finished && hasBet && (
          <div className="mt-3 flex justify-center">
            <BetBreakdownBadges bet={myBet!} compact />
          </div>
        )}
      </div>
    </div>
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
 * ParticipantShareButton — botão discreto para participantes convidarem amigos
 * ─────────────────────────────────────────────────────────────────────────────── */
function ParticipantShareButton({ inviteToken, poolName }: { inviteToken: string; poolName: string }) {
  const inviteUrl = `${window.location.origin}/join/${inviteToken}`;
  const analytics = useAnalytics();

  const handleShare = async () => {
    const shareText = `🏆 Participe do bolão "${poolName}" no ApostAI! Faça seus palpites e dispute o ranking.`;
    // Usa Web Share API se disponível (mobile), senão copia para clipboard
    if (navigator.share) {
      try {
        await navigator.share({ title: poolName, text: shareText, url: inviteUrl });
        analytics.trackInviteSent({ pool_slug: poolName, method: "share" });
      } catch {
        // Usuário cancelou o compartilhamento — sem ação necessária
      }
    } else {
      navigator.clipboard.writeText(inviteUrl);
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
