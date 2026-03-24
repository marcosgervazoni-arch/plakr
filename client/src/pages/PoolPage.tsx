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
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronDown,
  Copy,
  Crown,
  Loader2,
  Lock,
  Medal,
  MoreHorizontal,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link, useParams } from "wouter";
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
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("games");
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
    onMutate: async (vars) => {
      // Atualização otimista: atualiza o cache local imediatamente
      await utils.bets.myBets.cancel();
      const prev = utils.bets.myBets.getData({ poolId: vars.poolId });
      utils.bets.myBets.setData({ poolId: vars.poolId }, (old) => {
        if (!old) return old;
        const existing = old.findIndex((b) => b.gameId === vars.gameId);
        const newBet = {
          id: -1,
          gameId: vars.gameId,
          poolId: vars.poolId,
          userId: user?.id ?? 0,
          predictedScoreA: vars.predictedScoreA,
          predictedScoreB: vars.predictedScoreB,
          pointsEarned: 0,
          pointsExactScore: 0,
          pointsCorrectResult: 0,
          pointsTotalGoals: 0,
          pointsGoalDiff: 0,
          pointsOneTeamGoals: 0,
          pointsLandslide: 0,
          pointsZebra: 0,
          isZebra: false,
          resultType: "pending" as const,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        if (existing >= 0) {
          const updated = [...old];
          updated[existing] = { ...updated[existing], ...newBet };
          return updated;
        }
        return [...old, newBet];
      });
      return { prev };
    },
    onSuccess: () => {
      toast.success("Palpite salvo!");
      refetchBets();
      utils.rankings.myPoolPosition.invalidate({ poolId: data?.pool.id });
    },
    onError: (err, vars, ctx) => {
      // Rollback otimista em caso de erro
      if (ctx?.prev) utils.bets.myBets.setData({ poolId: vars.poolId }, ctx.prev);
      toast.error("Erro ao salvar palpite", { description: err.message });
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
  const betsByGame = new Map(myBets?.map((b) => [b.gameId, b]) ?? []);
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

          {/* Invite banner para organizador */}
          {isOrganizer && pool.inviteToken && (
            <InviteBanner inviteToken={pool.inviteToken} onCopy={copyInviteLink} />
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
                <p className="text-sm">Nenhuma pontuação registrada ainda.</p>
                <p className="text-xs mt-1">Os pontos aparecem após os jogos serem encerrados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Pódio adaptável: 1, 2 ou 3 participantes */}
                {ranking.length >= 1 && (
                  <div className={`grid gap-2 mb-5 ${
                    ranking.length === 1 ? "grid-cols-1 max-w-[140px] mx-auto" :
                    ranking.length === 2 ? "grid-cols-2" :
                    "grid-cols-3"
                  }`}>
                    {/* 2º lugar — só aparece se houver >= 2 participantes */}
                    {ranking.length >= 2 && (
                      <div className={`flex flex-col items-center gap-1.5 pt-6 pb-4 px-2 rounded-xl border ${
                        ranking[1].user.id === user?.id
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/30 bg-card/60"
                      }`}>
                        <div className="w-10 h-10 rounded-full bg-slate-400/20 border-2 border-slate-400/40 flex items-center justify-center text-sm font-bold text-slate-300">
                          {ranking[1].user.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <Medal className="w-4 h-4 text-slate-300" />
                        <a href={`/pool/${slug}/player/${ranking[1].user.id}`} className="text-xs font-semibold text-center truncate w-full text-center hover:text-primary transition-colors">
                          {ranking[1].user.name?.split(" ")[0]}
                        </a>
                        <p className="text-lg font-black font-mono text-slate-300">{ranking[1].stats.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    )}

                    {/* 1º lugar — sempre visível, centralizado quando sozinho */}
                    <div className={`flex flex-col items-center gap-1.5 pb-4 px-2 rounded-xl border ${
                      ranking.length >= 2 ? "-mt-3" : ""
                    } ${
                      ranking[0].user.id === user?.id
                        ? "border-primary/60 bg-primary/10"
                        : "border-yellow-500/30 bg-yellow-500/5"
                    }`}>
                      <Crown className="w-5 h-5 text-yellow-400 mt-3" />
                      <div className="w-12 h-12 rounded-full bg-yellow-500/20 border-2 border-yellow-500/40 flex items-center justify-center text-base font-bold text-yellow-400">
                        {ranking[0].user.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <a href={`/pool/${slug}/player/${ranking[0].user.id}`} className="text-xs font-semibold text-center truncate w-full text-center hover:text-primary transition-colors">
                        {ranking[0].user.name?.split(" ")[0]}
                      </a>
                      <p className="text-xl font-black font-mono text-yellow-400">{ranking[0].stats.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>

                    {/* 3º lugar — só aparece se houver >= 3 participantes */}
                    {ranking.length >= 3 && (
                      <div className={`flex flex-col items-center gap-1.5 pt-6 pb-4 px-2 rounded-xl border ${
                        ranking[2].user.id === user?.id
                          ? "border-primary/40 bg-primary/5"
                          : "border-border/30 bg-card/60"
                      }`}>
                        <div className="w-10 h-10 rounded-full bg-orange-500/20 border-2 border-orange-500/40 flex items-center justify-center text-sm font-bold text-orange-400">
                          {ranking[2].user.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <Medal className="w-4 h-4 text-orange-400" />
                        <a href={`/pool/${slug}/player/${ranking[2].user.id}`} className="text-xs font-semibold text-center truncate w-full text-center hover:text-primary transition-colors">
                          {ranking[2].user.name?.split(" ")[0]}
                        </a>
                        <p className="text-lg font-black font-mono text-orange-400">{ranking[2].stats.totalPoints}</p>
                        <p className="text-xs text-muted-foreground">pts</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Lista completa */}
                <div className="space-y-1.5">
                  {ranking.map(({ stats, user: rankUser }, idx) => {
                    const isMe = rankUser.id === user?.id;
                    return (
                      <div
                        key={stats.id}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          isMe
                            ? "border-primary/40 bg-primary/5"
                            : "border-border/30 bg-card/60 hover:border-border/50"
                        }`}
                      >
                        {/* Posição */}
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                          idx === 0
                            ? "bg-yellow-500/20 text-yellow-400"
                            : idx === 1
                            ? "bg-gray-400/20 text-gray-400"
                            : idx === 2
                            ? "bg-orange-500/20 text-orange-400"
                            : "bg-muted text-muted-foreground"
                        }`}>
                          {idx + 1}
                        </div>

                        {/* Avatar */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${
                          isMe ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                        }`}>
                          {rankUser.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>

                        {/* Nome + stats */}
                        <div className="flex-1 min-w-0">
                          <a
                            href={`/pool/${slug}/player/${rankUser.id}`}
                            className={`text-sm font-semibold truncate block hover:text-primary transition-colors ${isMe ? "text-primary" : ""}`}
                          >
                            {rankUser.name}
                            {isMe && <span className="text-xs font-normal ml-1.5 opacity-70">(você)</span>}
                          </a>
                          <p className="text-xs text-muted-foreground">
                            {stats.exactScoreCount} 🎯 · {stats.correctResultCount} ✅ · {stats.totalBets} palpites
                          </p>
                        </div>

                        {/* Pontos */}
                        <div className="text-right shrink-0">
                          <p className={`text-lg font-black font-mono ${isMe ? "text-primary" : "text-foreground"}`}>
                            {stats.totalPoints}
                          </p>
                          <p className="text-xs text-muted-foreground">pts</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
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
                {members.map(({ member, user: memberUser }) => (
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
  const maskedUrl = `${window.location.origin}/join/${"•".repeat(8)}`;

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
