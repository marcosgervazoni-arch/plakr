import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  Check,
  Copy,
  Loader2,
  Lock,
  Settings,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "wouter";
import { toast } from "sonner";
import NotificationBell from "@/components/NotificationBell";
import BetBreakdownBadges from "@/components/BetBreakdownBadges";

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

  const { data: members } = trpc.pools.getMembers.useQuery(
    { poolId: data?.pool.id ?? 0 },
    { enabled: !!data?.pool.id && activeTab === "members" }
  );

  const placeBet = trpc.bets.placeBet.useMutation({
    onSuccess: () => {
      toast.success("Palpite registrado!");
      refetchBets();
    },
    onError: (err) => toast.error("Erro ao registrar palpite", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-5xl mx-auto px-4 py-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-muted rounded animate-pulse" />
              <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[0,1,2].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
          </div>
          <div className="space-y-3">
            {[0,1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center">
          <Trophy className="w-7 h-7 text-red-400" />
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

  const { pool, tournament, games, rules, memberCount, myRole } = data;
  const isOrganizer = myRole === "organizer" || user?.role === "admin";

  const betsByGame = new Map(myBets?.map((b) => [b.gameId, b]) ?? []);

  const handleBetSubmit = (gameId: number) => {
    const input = betInputs[gameId];
    if (!input?.a || !input?.b) return toast.error("Preencha os dois placares.");
    const a = parseInt(input.a);
    const b = parseInt(input.b);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) return toast.error("Placar inválido.");
    placeBet.mutate({ poolId: pool.id, gameId, predictedScoreA: a, predictedScoreB: b });
  };

  const deadlineMinutes = rules?.bettingDeadlineMinutes ?? 60;

  const isGameOpen = (matchDate: Date) => {
    const deadline = new Date(matchDate.getTime() - deadlineMinutes * 60 * 1000);
    return new Date() < deadline;
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/join/${pool.inviteToken}`;
    navigator.clipboard.writeText(link);
    toast.success("Link copiado!");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm truncate">{pool.name}</h1>
              <p className="text-xs text-muted-foreground truncate">{tournament?.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={pool.plan === "pro" ? "border-brand-500/40 text-brand-400" : ""}>
              {pool.plan === "pro" ? "Pro" : "Free"}
            </Badge>
            <NotificationBell />
            {isOrganizer && (
              <Link href={`/pool/${slug}/settings`}>
                <Button variant="ghost" size="icon" className="w-8 h-8">
                  <Settings className="w-4 h-4" />
                </Button>
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {/* Invite Banner */}
        {isOrganizer && (
          <Card className="bg-brand-500/5 border-brand-500/20 mb-6">
            <CardContent className="py-3 px-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium">Link de convite</p>
                <p className="text-xs text-muted-foreground truncate max-w-xs">
                  {`${window.location.origin}/join/${pool.inviteToken}`}
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={copyInviteLink} className="shrink-0">
                <Copy className="w-3 h-3 mr-2" /> Copiar link
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <Card className="bg-card border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{memberCount}</p>
              <p className="text-xs text-muted-foreground">Participantes</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{games.filter((g) => g.status === "finished").length}</p>
              <p className="text-xs text-muted-foreground">Jogos encerrados</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-3 text-center">
              <p className="text-2xl font-bold">{games.filter((g) => g.status === "scheduled").length}</p>
              <p className="text-xs text-muted-foreground">Próximos jogos</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
            <TabsList className="bg-card border border-border/50">
              <TabsTrigger value="games">Jogos & Palpites</TabsTrigger>
              <TabsTrigger value="ranking">Ranking</TabsTrigger>
              <TabsTrigger value="members">Membros</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-2">
              <Link href={`/pool/${slug}/history`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Trophy className="w-3.5 h-3.5" /> Meus Palpites
                </Button>
              </Link>
              <Link href={`/pool/${slug}/bracket`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Trophy className="w-3.5 h-3.5" /> Chaveamento
                </Button>
              </Link>
              <Link href={`/pool/${slug}/rules`}>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                  <Lock className="w-3.5 h-3.5" /> Regulamento
                </Button>
              </Link>
            </div>
          </div>

          {/* GAMES TAB */}
          <TabsContent value="games" className="space-y-3">
            {games.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum jogo cadastrado ainda.</p>
              </div>
            ) : (
              games.map((game) => {
                const myBet = betsByGame.get(game.id);
                const open = isGameOpen(game.matchDate);
                const finished = game.status === "finished";
                const betA = betInputs[game.id]?.a ?? (myBet ? String(myBet.predictedScoreA) : "");
                const betB = betInputs[game.id]?.b ?? (myBet ? String(myBet.predictedScoreB) : "");

                return (
                  <Card key={game.id} className={`bg-card border-border/50 ${finished ? "opacity-80" : ""}`}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        {/* Game info */}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant="outline"
                              className={`text-xs ${
                                finished
                                  ? "border-green-500/40 text-green-400"
                                  : game.status === "live"
                                  ? "border-red-500/40 text-red-400 animate-pulse"
                                  : "border-border/50"
                              }`}
                            >
                              {finished ? "Encerrado" : game.status === "live" ? "Ao vivo" : "Agendado"}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{game.phase}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-semibold text-sm">{game.teamAName}</span>
                            <span className="text-muted-foreground text-xs">vs</span>
                            <span className="font-semibold text-sm">{game.teamBName}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {format(new Date(game.matchDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                          {finished && game.scoreA !== null && game.scoreB !== null && (
                            <p className="text-sm font-bold text-brand-400 mt-1">
                              Resultado: {game.scoreA} × {game.scoreB}
                            </p>
                          )}
                        </div>

                        {/* Bet input */}
                        <div className="flex items-center gap-2 shrink-0">
                          {open && !finished ? (
                            <>
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="0"
                                value={betA}
                                onChange={(e) =>
                                  setBetInputs((prev) => ({
                                    ...prev,
                                    [game.id]: { a: e.target.value, b: prev[game.id]?.b ?? betB },
                                  }))
                                }
                                className="w-14 text-center h-9 text-sm"
                              />
                              <span className="text-muted-foreground text-sm font-bold">×</span>
                              <Input
                                type="number"
                                min={0}
                                max={99}
                                placeholder="0"
                                value={betB}
                                onChange={(e) =>
                                  setBetInputs((prev) => ({
                                    ...prev,
                                    [game.id]: { a: prev[game.id]?.a ?? betA, b: e.target.value },
                                  }))
                                }
                                className="w-14 text-center h-9 text-sm"
                              />
                              <Button
                                size="sm"
                                className="bg-brand-600 hover:bg-brand-700 text-white h-9"
                                onClick={() => handleBetSubmit(game.id)}
                                disabled={placeBet.isPending}
                              >
                                {myBet ? <Check className="w-4 h-4" /> : "Apostar"}
                              </Button>
                            </>
                          ) : (
                            <div className="text-center">
                              {myBet ? (
                                <div className="text-sm">
                                  <span className="font-semibold text-brand-400">
                                    {myBet.predictedScoreA} × {myBet.predictedScoreB}
                                  </span>
                                  {finished && (
                                    <>
                                      <p className="text-xs text-muted-foreground mt-0.5">
                                        +{myBet.pointsEarned} pts
                                      </p>
                                      <BetBreakdownBadges bet={myBet} compact />
                                    </>
                                  )}
                                </div>
                              ) : (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Lock className="w-3 h-3" />
                                  {finished ? "Sem palpite" : "Prazo encerrado"}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </TabsContent>

          {/* RANKING TAB */}
          <TabsContent value="ranking">
            {rankingLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : !ranking || ranking.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhuma pontuação registrada ainda.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {ranking.map(({ stats, user: rankUser }, idx) => (
                  <Card
                    key={stats.id}
                    className={`bg-card border-border/50 ${rankUser.id === user?.id ? "border-brand-500/40" : ""}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            idx === 0
                              ? "bg-yellow-500/20 text-yellow-400"
                              : idx === 1
                              ? "bg-gray-400/20 text-gray-400"
                              : idx === 2
                              ? "bg-orange-500/20 text-orange-400"
                              : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            <a href={`/pool/${slug}/player/${rankUser.id}`} className="hover:text-primary transition-colors">
                              {rankUser.name}
                            </a>
                            {rankUser.id === user?.id && (
                              <span className="text-brand-400 text-xs ml-2">(você)</span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {stats.exactScoreCount} exatos · {stats.correctResultCount} resultados
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xl font-bold text-brand-400">{stats.totalPoints}</p>
                          <p className="text-xs text-muted-foreground">pontos</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* MEMBERS TAB */}
          <TabsContent value="members">
            {!members ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
              </div>
            ) : (
              <div className="space-y-2">
                {members.map(({ member, user: memberUser }) => (
                  <Card key={member.id} className="bg-card border-border/50">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center text-sm font-semibold text-brand-400">
                          {memberUser.name?.charAt(0)?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <a href={`/pool/${slug}/player/${memberUser.id}`} className="text-sm font-medium hover:text-primary transition-colors">{memberUser.name}</a>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(member.joinedAt), "dd/MM/yyyy", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant="outline"
                        className={member.role === "organizer" ? "border-brand-500/40 text-brand-400" : ""}
                      >
                        {member.role === "organizer" ? "Organizador" : "Participante"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
