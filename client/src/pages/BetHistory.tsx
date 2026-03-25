/**
 * Histórico de Palpites — /pool/:slug/history
 * Exibe todos os palpites do usuário em um bolão com breakdown de pontos por critério.
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import BetBreakdownBadges from "@/components/BetBreakdownBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowLeft, Trophy, Target, TrendingUp, Star, CheckCircle2, XCircle, Clock } from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo } from "react";

const resultConfig = {
  exact: { label: "Placar Exato", color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: Trophy },
  correct_result: { label: "Resultado Correto", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", icon: CheckCircle2 },
  wrong: { label: "Errado", color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", icon: XCircle },
  pending: { label: "Aguardando", color: "text-muted-foreground", bg: "bg-muted/30 border-border/30", icon: Clock },
};

export default function BetHistory() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const poolId = poolData?.pool?.id;

  const { data: betsRaw, isLoading } = trpc.bets.myBets.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );
  const bets = Array.isArray(betsRaw) ? betsRaw : (betsRaw?.items ?? []);

  const { data: games } = trpc.pools.getGames.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  // Merge bets with game info
  const betsWithGames = useMemo(() => {
    if (!bets.length || !games) return [];
    const gameMap = new Map(games.map((g) => [g.id, g]));
    return bets
      .map((b) => ({ ...b, game: gameMap.get(b.gameId) }))
      .filter((b) => b.game)
      .sort((a, b) => {
        const da = a.game?.matchDate ? new Date(a.game.matchDate).getTime() : 0;
        const db2 = b.game?.matchDate ? new Date(b.game.matchDate).getTime() : 0;
        return db2 - da;
      });
  }, [bets, games]);

  // Summary stats
  const summary = useMemo(() => {
    const finished = betsWithGames.filter((b) => b.resultType !== "pending");
    const exact = finished.filter((b) => b.resultType === "exact").length;
    const correct = finished.filter((b) => b.resultType === "correct_result").length;
    const wrong = finished.filter((b) => b.resultType === "wrong").length;
    const totalPoints = finished.reduce((acc, b) => acc + (b.pointsEarned ?? 0), 0);
    return { exact, correct, wrong, totalPoints, total: finished.length };
  }, [betsWithGames]);

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/pool/${slug}`}>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Meus Palpites
            </h1>
            {poolData && (
              <p className="text-sm text-muted-foreground">{poolData.pool.name}</p>
            )}
          </div>
        </div>

        {/* Summary cards */}
        {summary.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-primary">{summary.totalPoints}</p>
              <p className="text-xs text-muted-foreground mt-1">Pontos totais</p>
            </div>
            <div className="bg-card border border-green-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-green-400">{summary.exact}</p>
              <p className="text-xs text-muted-foreground mt-1">Placares exatos</p>
            </div>
            <div className="bg-card border border-blue-500/20 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-blue-400">{summary.correct}</p>
              <p className="text-xs text-muted-foreground mt-1">Resultados certos</p>
            </div>
            <div className="bg-card border border-border/30 rounded-xl p-4 text-center">
              <p className="text-2xl font-bold text-muted-foreground">{summary.wrong}</p>
              <p className="text-xs text-muted-foreground mt-1">Errados</p>
            </div>
          </div>
        )}

        {/* Bet list */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : betsWithGames.length === 0 ? (
          <div className="bg-card border border-border/30 rounded-2xl p-12 text-center space-y-3">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="font-semibold text-muted-foreground">Nenhum palpite registrado ainda</p>
            <p className="text-sm text-muted-foreground/70">
              Seus palpites aparecerão aqui após você apostas nos jogos do bolão.
            </p>
            <Link href={`/pool/${slug}`}>
              <Button size="sm" className="mt-2">Ver jogos</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {betsWithGames.map((b) => {
              const game = b.game!;
              const cfg = resultConfig[b.resultType as keyof typeof resultConfig] ?? resultConfig.pending;
              const Icon = cfg.icon;
              const matchDate = game.matchDate ? new Date(game.matchDate) : null;
              const isFinished = b.resultType !== "pending";

              return (
                <div
                  key={b.id}
                  className={`bg-card border rounded-xl p-4 space-y-3 ${cfg.bg}`}
                >
                  {/* Game header */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 ${cfg.color} shrink-0`} />
                      <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {isFinished && (
                        <Badge variant="outline" className={`text-xs font-bold ${cfg.color} border-current/30`}>
                          +{b.pointsEarned ?? 0} pts
                        </Badge>
                      )}
                      {matchDate && (
                        <span className="text-xs text-muted-foreground">
                          {format(matchDate, "dd/MM HH:mm", { locale: ptBR })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Scores */}
                  <div className="flex items-center justify-center gap-4">
                    <div className="text-right flex-1">
                      <p className="font-semibold text-sm truncate">{game.teamAName ?? "Time A"}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Predicted */}
                      <div className="bg-muted/50 rounded-lg px-3 py-1.5 text-center min-w-[52px]">
                        <p className="text-xs text-muted-foreground mb-0.5">Palpite</p>
                        <p className="font-bold text-sm">{b.predictedScoreA} × {b.predictedScoreB}</p>
                      </div>
                      {/* Real (if finished) */}
                      {isFinished && game.scoreA !== null && game.scoreB !== null && (
                        <div className="bg-card border border-border/30 rounded-lg px-3 py-1.5 text-center min-w-[52px]">
                          <p className="text-xs text-muted-foreground mb-0.5">Real</p>
                          <p className="font-bold text-sm">{game.scoreA} × {game.scoreB}</p>
                        </div>
                      )}
                    </div>
                    <div className="text-left flex-1">
                      <p className="font-semibold text-sm truncate">{game.teamBName ?? "Time B"}</p>
                    </div>
                  </div>

                  {/* Points breakdown — only if earned points > 0 */}
                  {isFinished && (b.pointsEarned ?? 0) > 0 && (
                    <div className="pt-1 border-t border-border/20">
                      <BetBreakdownBadges bet={b} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
