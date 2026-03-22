/**
 * Ranking Global — /ranking
 * Top apostadores da plataforma ordenados por pontos totais.
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Crown, Trophy, Loader2, TrendingUp, Target } from "lucide-react";
import { Link } from "wouter";

export default function GlobalRanking() {
  const { data: ranking = [], isLoading } = trpc.users.globalRanking.useQuery({ limit: 50 });

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-10 space-y-6">
        <div>
          <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Ranking Global
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Os melhores apostadores de toda a plataforma ApostAI.
          </p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : ranking.length === 0 ? (
          <div className="bg-card border border-border/30 rounded-xl p-10 text-center space-y-3">
            <TrendingUp className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="font-semibold text-sm">Nenhum apostador no ranking ainda.</p>
            <p className="text-xs text-muted-foreground">
              O ranking será populado após os primeiros palpites finalizados.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {(ranking as any[]).map((player: any) => {
              const initials = player.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
              const isTop3 = player.rank <= 3;
              const medalColors: Record<number, string> = {
                1: "text-yellow-400",
                2: "text-slate-300",
                3: "text-amber-600",
              };
              return (
                <Link key={player.userId} href={`/profile/${player.userId}`}>
                  <div
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all cursor-pointer group ${
                      isTop3
                        ? "bg-card border-primary/20 hover:border-primary/40"
                        : "bg-card border-border/30 hover:border-border/60"
                    }`}
                  >
                    {/* Rank */}
                    <div className={`w-8 text-center font-bold text-sm shrink-0 ${medalColors[player.rank] ?? "text-muted-foreground"}`}
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      {player.rank <= 3 ? (
                        <Crown className={`w-4 h-4 mx-auto ${medalColors[player.rank]}`} />
                      ) : (
                        `#${player.rank}`
                      )}
                    </div>

                    {/* Avatar */}
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                      {player.avatarUrl ? (
                        <img src={player.avatarUrl} alt={player.name ?? ""} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-primary">{initials}</span>
                      )}
                    </div>

                    {/* Name + stats */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{player.name ?? "Apostador"}</p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Target className="w-3 h-3" /> {player.exactScores} exatos
                        </span>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Trophy className="w-3 h-3" /> {player.poolsCount} bolões
                        </span>
                      </div>
                    </div>

                    {/* Points */}
                    <div className="text-right shrink-0">
                      <p className="font-bold text-base text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                        {player.totalPoints}
                      </p>
                      <p className="text-xs text-muted-foreground">pts</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
