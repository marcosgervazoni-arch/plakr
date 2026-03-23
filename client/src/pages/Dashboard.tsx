/**
 * U1 — Home / Perfil do Usuário
 * Especificação: hub central pós-login. Layout duas colunas desktop.
 * Card de perfil (esq): avatar circular, nome Syne, plano badge, stats JetBrains Mono 28px.
 * Conteúdo (dir): lista de bolões, gráfico de evolução Recharts, palpites recentes.
 * Seções de gráfico e palpites recentes sempre visíveis mesmo com valor zero.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import AppShell from "@/components/AppShell";
import CreatePoolModal from "@/components/CreatePoolModal";
import {
  Trophy,
  Plus,
  Search,
  Target,
  CheckCircle2,
  XCircle,
  Minus,
  TrendingUp,
  Crown,
  Settings,
  ChevronRight,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { DashboardSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { AdBanner } from "@/components/AdBanner";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: userData } = trpc.users.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pools = [], isLoading: poolsLoading, error: poolsError, refetch: refetchPools } = trpc.users.myPools.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats, isLoading: statsLoading } = trpc.users.myStats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: recentBets = [] } = trpc.users.recentBets.useQuery(undefined, { enabled: isAuthenticated });

  // Pool selector for points chart
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const { data: poolStats } = trpc.users.myStatsByPool.useQuery(
    { poolId: selectedPoolId! },
    { enabled: isAuthenticated && selectedPoolId !== null }
  );

  // Compute cumulative points for chart — either global or per-pool
  const activePointsHistory = selectedPoolId !== null ? poolStats?.pointsHistory : stats?.pointsHistory;
  const chartData = useMemo(() => {
    if (!activePointsHistory?.length) return [];
    let cumulative = 0;
    return activePointsHistory.map((p: { label: string; points: number }) => {
      cumulative += p.points;
      return { label: p.label, points: cumulative };
    });
  }, [activePointsHistory]);

  if (loading || (isAuthenticated && poolsLoading && statsLoading)) {
    return <DashboardSkeleton />;
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">ApostAI</h1>
            <p className="text-sm text-muted-foreground">Faça login para acessar seus bolões.</p>
          </div>
          <a href={getLoginUrl()}>
            <Button className="w-full" size="lg">Entrar com Manus</Button>
          </a>
        </div>
      </div>
    );
  }

  const isPro = userData?.plan?.plan === "pro" && userData?.plan?.isActive;
  const initials = user?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        {/* Page header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Olá, {user?.name?.split(" ")[0] ?? "Apostador"} 👋
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {(pools as any[]).length === 0 ? "Crie ou entre em um bolão para começar" : `Você está em ${(pools as any[]).length} bolão${(pools as any[]).length > 1 ? "ões" : ""}`}
            </p>
          </div>
          <Button size="sm" onClick={() => setShowCreateModal(true)} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Criar Bolão</span>
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

          {/* ── LEFT: Profile card ── */}
          <div className="space-y-4">
            <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                    <span className="font-bold text-xl text-primary" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {initials}
                    </span>
                  </div>
                  {isPro && (
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                      <Crown className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                </div>
                <div>
                  <h2 className="font-bold text-base" style={{ fontFamily: "'Syne', sans-serif" }}>
                    {user?.name ?? "Usuário"}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    Membro desde {userData?.user?.createdAt
                      ? new Date(userData.user.createdAt).getFullYear()
                      : new Date().getFullYear()}
                  </p>
                  {isPro ? (
                    <Badge className="mt-1.5 bg-primary/10 text-primary border-primary/20 text-xs">
                      <Crown className="w-3 h-3 mr-1" /> Plano Pro
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="mt-1.5 text-xs text-muted-foreground">
                      Plano Gratuito
                    </Badge>
                  )}
                </div>
              </div>

              {/* Global stats in JetBrains Mono */}
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
                <div className="text-center">
                  <p
                    className="font-bold text-2xl text-primary leading-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stats?.totalPoints ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Pontos</p>
                </div>
                <div className="text-center border-x border-border/30">
                  <p
                    className="font-bold text-2xl text-green-400 leading-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stats?.exactScores ?? 0}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Exatos</p>
                </div>
                <div className="text-center">
                  <p
                    className="font-bold text-2xl text-foreground leading-none"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {stats?.poolsCount ?? pools.length}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Bolões</p>
                </div>
              </div>
            </div>

            {/* Upgrade CTA for free users */}
            {!isPro && (
              <Link href="/upgrade">
                <div className="mt-1 bg-primary/5 border border-primary/20 rounded-lg p-3 cursor-pointer hover:bg-primary/10 transition-colors">
                  <div className="flex items-center gap-2">
                    <Crown className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-xs font-bold text-primary">Upgrade para Pro</span>
                    <ChevronRight className="w-3 h-3 text-primary ml-auto shrink-0" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Bolões ilimitados, campeonatos personalizados e mais.
                  </p>
                </div>
              </Link>
            )}

            <Link href="/profile/me">
              <Button variant="outline" size="sm" className="w-full gap-2 mt-1">Ver perfil público</Button>
            </Link>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={() => setShowCreateModal(true)} className="w-full" size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Criar
              </Button>
              <Link href="/enter-pool" className="block">
                <Button variant="outline" className="w-full" size="sm">
                  <Search className="w-4 h-4 mr-1.5" /> Entrar
                </Button>
              </Link>
            </div>
          </div>

          {/* ── RIGHT: Content ── */}
          <div className="space-y-6">

            {/* My pools */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Meus Bolões</h3>
                <Link href="/pools/public" className="text-xs text-primary hover:underline">
                  Explorar bolões →
                </Link>
              </div>

              {poolsError ? (
                <ErrorCard error={poolsError} onRetry={() => refetchPools()} />
              ) : pools.length === 0 ? (
                <EmptyState
                  icon={Trophy}
                  title="Nenhum bolão ainda"
                  description="Crie seu primeiro bolão ou entre em um existente com código de convite."
                  actionLabel="Criar bolão"
                  onAction={() => setShowCreateModal(true)}
                  secondaryLabel="Entrar por código"
                  onSecondary={() => navigate("/enter-pool")}
                />
              ) : (
                <div className="space-y-2">
                  {pools.map(({ pool, member }: { pool: any; member: any }) => (
                    <Link key={pool.id} href={`/pool/${pool.slug}`}>
                      <div className="bg-card border border-border/30 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 hover:bg-card/80 transition-all cursor-pointer group">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                          {pool.logoUrl ? (
                            <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
                          ) : (
                            <Trophy className="w-5 h-5 text-primary" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{pool.name}</p>
                            {pool.plan === "pro" && <Crown className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                              pool.status === "active"
                                ? "bg-green-500/10 text-green-400"
                                : "bg-muted text-muted-foreground"
                            }`}>
                              {pool.status === "active" ? "Ativo" : "Encerrado"}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {member.role === "organizer" ? "Organizador" : "Participante"}
                            </span>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </section>

            {/* Points evolution chart — always visible */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Evolução de Pontos</h3>
                </div>
                {(pools as any[]).length > 0 && (
                  <Select
                    value={selectedPoolId === null ? "all" : String(selectedPoolId)}
                    onValueChange={(v) => setSelectedPoolId(v === "all" ? null : Number(v))}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto min-w-[140px] max-w-[200px] border-border/40 bg-card">
                      <SelectValue placeholder="Selecionar bolão" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os bolões</SelectItem>
                      {(pools as any[]).filter(p => p.status !== "deleted").map((pool: any) => (
                        <SelectItem key={pool.id} value={String(pool.id)}>
                          {pool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
              <div className="bg-card border border-border/30 rounded-xl p-4">
                {chartData.length === 0 ? (
                  <div className="h-[160px] flex flex-col items-center justify-center gap-3">
                    <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Seus pontos aparecerão aqui após os primeiros jogos.</p>
                      <p
                        className="font-bold text-3xl text-primary mt-2"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        0 pts
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={160}>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="pointsGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "#1A1D27", border: "1px solid #2E3347", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "#94A3B8" }}
                        formatter={(value: number) => [`${value} pts`, "Pontos"]}
                      />
                      <Area
                        type="monotone"
                        dataKey="points"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        fill="url(#pointsGradient)"
                        dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Ad between sections */}
            <AdBanner position="between_sections" className="w-full" />

            {/* Recent bets — always visible */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Palpites Recentes</h3>
              </div>
              <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
                {recentBets.length === 0 ? (
                  <div className="p-6 text-center space-y-2">
                    <Target className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Seus palpites em jogos finalizados aparecerão aqui.
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/20">
                    {recentBets.map((bet: any) => {
                      const icon =
                        bet.result === "exact" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        ) : bet.result === "correct" ? (
                          <Minus className="w-4 h-4 text-yellow-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        );
                      const resultColor =
                        bet.result === "exact" ? "text-green-400" : bet.result === "correct" ? "text-yellow-400" : "text-red-400";

                      return (
                        <div key={bet.gameId} className="px-4 py-3 flex items-center gap-3">
                          {icon}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 text-sm flex-wrap">
                              <span className="font-medium truncate max-w-[80px]">{bet.teamAName}</span>
                              <span className="font-mono font-bold text-xs bg-muted px-1.5 py-0.5 rounded shrink-0">
                                {bet.realScoreA} — {bet.realScoreB}
                              </span>
                              <span className="font-medium truncate max-w-[80px]">{bet.teamBName}</span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              Seu palpite:{" "}
                              <span className="font-mono font-semibold">{bet.betScoreA} — {bet.betScoreB}</span>
                            </p>
                          </div>
                          <div className={`text-right shrink-0 ${resultColor}`}>
                            <p className="font-mono font-bold text-sm">+{bet.pointsEarned}</p>
                            <p className="text-xs opacity-70">pts</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </section>

          </div>
        </div>
      </div>
      {showCreateModal && (
        <CreatePoolModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refetchPools();
          }}
        />
      )}
    </AppShell>
  );
}
