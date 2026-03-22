/**
 * Perfil Contextual do Apostador no Bolão — /pool/:slug/player/:userId
 * Exibe stats, gráfico de evolução de pontos e palpites recentes no contexto de um bolão específico.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy, Crown, Target, CheckCircle2, Users, TrendingUp,
  ChevronLeft, Loader2, AlertCircle, Share2, Zap, Star,
  MessageCircle, Send, Award,
} from "lucide-react";
import { useParams, Link } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";

export default function PoolMemberProfile() {
  const { slug, userId } = useParams<{ slug: string; userId: string }>();
  const { user: currentUser } = useAuth();
  const parsedUserId = parseInt(userId ?? "", 10);

  // Buscar dados do bolão para obter o poolId
  const { data: poolData, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const poolId = poolData?.pool.id;

  const { data, isLoading, error } = trpc.pools.getMemberProfile.useQuery(
    { poolId: poolId!, userId: parsedUserId },
    { enabled: !!poolId && !isNaN(parsedUserId) }
  );

  const isOwnProfile = currentUser?.id === parsedUserId;

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success("Link copiado para a área de transferência!");
    });
  };

  // Calcular pontos acumulados para o gráfico
  const chartData = useMemo(() => {
    if (!data?.pointsHistory) return [];
    return data.pointsHistory.map((p, i) => ({
      name: p.label.length > 12 ? p.label.slice(0, 12) + "…" : p.label,
      cumulative: p.cumulative,
      points: p.points,
      index: i + 1,
    }));
  }, [data?.pointsHistory]);

  if (poolLoading || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h1 className="font-bold text-xl">Perfil não encontrado</h1>
          <p className="text-muted-foreground text-sm">
            Este usuário não é membro deste bolão ou o perfil não está disponível.
          </p>
          <Link href={`/pool/${slug}`}>
            <Button variant="outline" size="sm">← Voltar ao bolão</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { user, plan, pool, stats, pointsHistory, recentBets } = data;
  const isPro = plan?.plan === "pro" && plan?.isActive;
  const initials = user.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* ── Breadcrumb ── */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link href={`/pool/${slug}`}>
            <button className="flex items-center gap-1 hover:text-foreground transition-colors">
              <ChevronLeft className="w-4 h-4" />
              {pool.name}
            </button>
          </Link>
          <span>/</span>
          <span className="text-foreground font-medium">{user.name ?? "Apostador"}</span>
        </div>

        {/* ── Hero card ── */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="px-6 pb-6 -mt-10">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card overflow-hidden flex items-center justify-center shadow-lg">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-2xl text-primary" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {initials}
                    </span>
                  )}
                </div>
                {isPro && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                    <Crown className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pb-1 flex-wrap">
                {user.whatsappLink && (
                  <a href={user.whatsappLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-green-500 border-green-500/30 hover:bg-green-500/10">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </Button>
                  </a>
                )}
                {user.telegramLink && (
                  <a href={user.telegramLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-blue-400 border-blue-400/30 hover:bg-blue-400/10">
                      <Send className="w-3.5 h-3.5" /> Telegram
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar
                </Button>
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {user.name ?? "Apostador"}
                </h1>
                {isPro ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Crown className="w-3 h-3 mr-1" /> Pro
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Gratuito</Badge>
                )}
                {isOwnProfile && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Você</Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-0.5">
                Participando de <span className="font-medium text-foreground">{pool.name}</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── Stats do bolão ── */}
        {stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Posição", value: `#${stats.rankPosition}`, sub: `de ${stats.totalMembers}`, icon: Award, color: "text-yellow-400" },
              { label: "Pontos", value: stats.totalPoints, sub: "neste bolão", icon: TrendingUp, color: "text-primary" },
              { label: "Placares Exatos", value: stats.exactScoreCount, sub: `${stats.accuracy}% precisão`, icon: CheckCircle2, color: "text-green-400" },
              { label: "Zebras", value: stats.zebraCount, sub: "acertos surpresa", icon: Zap, color: "text-orange-400" },
            ].map(({ label, value, sub, icon: Icon, color }) => (
              <div key={label} className="bg-card border border-border/30 rounded-xl p-4 text-center space-y-1">
                <Icon className={`w-5 h-5 mx-auto ${color}`} />
                <p className={`font-bold text-2xl ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {value}
                </p>
                <p className="text-xs text-muted-foreground leading-tight font-medium">{label}</p>
                <p className="text-xs text-muted-foreground/60 leading-tight">{sub}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-card border border-border/30 rounded-xl p-6 text-center space-y-2">
            <Trophy className="w-8 h-8 text-muted-foreground/20 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum palpite registrado ainda neste bolão.</p>
          </div>
        )}

        {/* ── Gráfico de evolução de pontos ── */}
        <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
            Evolução de Pontos
          </h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} tickLine={false} axisLine={false} />
                <Tooltip
                  contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px", fontSize: "12px" }}
                  labelStyle={{ color: "hsl(var(--foreground))", fontWeight: "bold" }}
                  formatter={(value: number, name: string) => [
                    `${value} pts`,
                    name === "cumulative" ? "Acumulado" : "Jogo",
                  ]}
                />
                <Area
                  type="monotone"
                  dataKey="cumulative"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#colorCumulative)"
                  dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                  activeDot={{ r: 5, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <TrendingUp className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                <p className="text-sm text-muted-foreground">Aguardando resultados dos jogos.</p>
              </div>
            </div>
          )}
        </div>

        {/* ── Barra de desempenho ── */}
        {stats && stats.totalBets > 0 && (
          <div className="bg-card border border-border/30 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Desempenho nos Palpites</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Exatos ({stats.exactScoreCount})</span>
                <span>Corretos ({stats.correctResultCount})</span>
                <span>Total ({stats.totalBets})</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-green-500 transition-all" style={{ width: `${(stats.exactScoreCount / stats.totalBets) * 100}%` }} />
                <div className="h-full bg-yellow-500 transition-all" style={{ width: `${(stats.correctResultCount / stats.totalBets) * 100}%` }} />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />Placar exato</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />Resultado correto</span>
                <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted inline-block" />Errado</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Palpites recentes ── */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Palpites Recentes</h3>
          {recentBets.length === 0 ? (
            <div className="bg-card border border-border/30 rounded-xl p-8 text-center space-y-2">
              <Star className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum palpite registrado ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentBets.map((bet: any) => {
                const finished = bet.gameStatus === "finished";
                const nameA = bet.teamAName || bet.teamA;
                const nameB = bet.teamBName || bet.teamB;
                const isExact = bet.pointsExactScore > 0;
                const isCorrect = !isExact && bet.pointsCorrectResult > 0;
                const statusColor = isExact ? "text-green-400" : isCorrect ? "text-yellow-400" : finished ? "text-muted-foreground" : "text-blue-400";
                const statusLabel = isExact ? "Exato" : isCorrect ? "Correto" : finished ? "Errou" : "Pendente";

                return (
                  <div key={bet.gameId} className="bg-card border border-border/30 rounded-xl px-4 py-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-sm font-medium min-w-0">
                        <span className="truncate">{nameA}</span>
                        <span className="text-muted-foreground shrink-0">×</span>
                        <span className="truncate">{nameB}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {bet.isZebra && (
                          <Badge className="bg-orange-500/10 text-orange-400 border-orange-400/20 text-xs px-1.5 py-0">
                            <Zap className="w-2.5 h-2.5 mr-0.5" />Zebra
                          </Badge>
                        )}
                        <span className={`text-xs font-bold ${statusColor}`}>{statusLabel}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <div className="flex items-center gap-3">
                        <span>
                          Palpite: <span className="font-mono font-bold text-foreground">{bet.predictedScoreA} × {bet.predictedScoreB}</span>
                        </span>
                        {finished && bet.realScoreA !== null && (
                          <span>
                            Real: <span className="font-mono font-bold text-foreground">{bet.realScoreA} × {bet.realScoreB}</span>
                          </span>
                        )}
                      </div>
                      {finished && (
                        <span className={`font-bold font-mono ${bet.pointsEarned > 0 ? "text-primary" : "text-muted-foreground"}`}>
                          +{bet.pointsEarned} pts
                        </span>
                      )}
                    </div>

                    {/* Breakdown de pontos */}
                    {finished && bet.pointsEarned > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border/30">
                        {bet.pointsExactScore > 0 && (
                          <span className="text-xs bg-green-500/10 text-green-400 rounded px-1.5 py-0.5">
                            Placar exato +{bet.pointsExactScore}
                          </span>
                        )}
                        {bet.pointsCorrectResult > 0 && (
                          <span className="text-xs bg-yellow-500/10 text-yellow-400 rounded px-1.5 py-0.5">
                            Resultado +{bet.pointsCorrectResult}
                          </span>
                        )}
                        {bet.pointsBonusDiff > 0 && (
                          <span className="text-xs bg-blue-500/10 text-blue-400 rounded px-1.5 py-0.5">
                            Diferença +{bet.pointsBonusDiff}
                          </span>
                        )}
                        {bet.pointsBonusUpset > 0 && (
                          <span className="text-xs bg-orange-500/10 text-orange-400 rounded px-1.5 py-0.5">
                            Zebra +{bet.pointsBonusUpset}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── Link para o bolão ── */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
            {pool.logoUrl ? (
              <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
            ) : (
              <Trophy className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">{pool.name}</p>
            <p className="text-xs text-muted-foreground mt-0.5">Ver ranking completo do bolão</p>
          </div>
          <Link href={`/pool/${slug}`}>
            <Button size="sm" variant="outline" className="shrink-0">Ver bolão</Button>
          </Link>
        </div>

      </div>
    </AppShell>
  );
}
