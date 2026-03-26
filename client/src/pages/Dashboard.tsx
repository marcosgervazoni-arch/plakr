/**
 * U1 — Home / Perfil do Usuário
 * Especificação: hub central pós-login. Layout duas colunas desktop.
 * Card de perfil (esq): avatar circular, nome Syne, plano badge, stats JetBrains Mono 28px.
 * Conteúdo (dir): lista de bolões, gráfico de evolução por bolão (sem opção global), radar de perfil, palpites recentes.
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
  ChevronRight,
  Radar,
  Sparkles,
  Clock,
  Download,
  Share2,
  Info,
  Medal,
  Percent,
  ListChecks,
} from "lucide-react";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link, useLocation } from "wouter";
import { DashboardSkeleton } from "@/components/Skeletons";
import { EmptyState } from "@/components/EmptyState";
import { ErrorCard } from "@/components/ErrorCard";
import { AdBanner } from "@/components/AdBanner";
import DashboardBadgeCarousel from "@/components/DashboardBadgeCarousel";
import NearestBadges from "@/components/NearestBadges";
import OnboardingTour from "@/components/OnboardingTour";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
} from "recharts";

// Tipo explícito para o retorno de myStats (evita falsos positivos do LSP do Vite)
type MyStatsData = {
  totalPoints: number;
  exactScores: number;
  poolsCount: number;
  totalBets: number;
  accuracy: number;
  bestPosition: number | null;
  pointsHistory: { label: string; points: number }[];
  radarData: { subject: string; value: number; fullMark: number }[];
};

// ─── COMPONENTE: Card de posição expandido no Dashboard ─────────────────────
function ShareCardDashboardItem({
  pool,
  hasRetrospective,
  shareCardUrl,
  finalPosition,
  totalMembers,
  onNavigate,
}: {
  pool: any;
  hasRetrospective: boolean;
  shareCardUrl: string | null;
  finalPosition: number | null;
  totalMembers: number;
  onNavigate: (path: string) => void;
}) {
  const posEmoji = finalPosition === 1 ? "🥇" : finalPosition === 2 ? "🥈" : finalPosition === 3 ? "🥉" : "🏅";

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shareCardUrl) return;
    try {
      const res = await fetch(shareCardUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `plakr-${pool.name.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Card salvo!");
    } catch {
      toast.error("Não foi possível baixar o card.");
    }
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!shareCardUrl) return;
    try {
      if (navigator.canShare) {
        const res = await fetch(shareCardUrl);
        const blob = await res.blob();
        const file = new File([blob], `plakr-${pool.name.replace(/\s+/g, "-").toLowerCase()}.png`, { type: "image/png" });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: `Meu card — ${pool.name}`,
            text: `Terminei em ${finalPosition}º lugar de ${totalMembers}! #Plakr!`,
          });
          return;
        }
      }
      if (navigator.share) {
        await navigator.share({
          title: `Meu card — ${pool.name}`,
          text: `Terminei em ${finalPosition}º lugar de ${totalMembers}! #Plakr!`,
          url: `${window.location.origin}/pool/${pool.slug}/retrospectiva`,
        });
      } else {
        await navigator.clipboard.writeText(`${window.location.origin}/pool/${pool.slug}/retrospectiva`);
        toast.success("Link copiado!");
      }
    } catch {
      // usuário cancelou
    }
  };

  return (
    <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent overflow-hidden">
      {/* Banner informativo */}
      <div className="flex items-center gap-2 px-4 py-2 bg-primary/10 border-b border-primary/15">
        <Info className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-xs text-primary font-medium">
          Seu card de posição está pronto! Compartilhe com seus amigos.
        </p>
      </div>
      {/* Conteúdo principal */}
      <div className="flex items-center gap-4 px-4 py-3">
        {/* Card PNG em destaque */}
        {shareCardUrl ? (
          <div
            className="relative shrink-0 cursor-pointer group/card"
            onClick={() => onNavigate(`/pool/${pool.slug}/retrospectiva`)}
          >
            <div className="absolute -inset-1 rounded-xl bg-primary/30 blur-md opacity-0 group-hover/card:opacity-60 transition-opacity" />
            <div className="relative w-16 h-[90px] rounded-xl overflow-hidden border-2 border-primary/40 shadow-lg shadow-primary/20">
              <img src={shareCardUrl} alt="Card de posição" className="w-full h-full object-cover" />
            </div>
          </div>
        ) : (
          <div className="w-16 h-[90px] rounded-xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0">
            <Sparkles className="w-6 h-6 text-primary" />
          </div>
        )}
        {/* Informações e ações */}
        <div className="flex-1 min-w-0 space-y-2">
          <div>
            <p className="font-semibold text-sm truncate">{pool.name}</p>
            {hasRetrospective && finalPosition ? (
              <p className="text-sm font-bold text-primary mt-0.5">
                {posEmoji} {finalPosition}º lugar de {totalMembers}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground mt-0.5">Bolão encerrado</p>
            )}
          </div>
          {/* Botões de ação */}
          <div className="flex flex-wrap gap-2">
            {shareCardUrl && (
              <>
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
              </>
            )}
            {hasRetrospective && (
              <button
                onClick={() => onNavigate(`/pool/${pool.slug}/retrospectiva`)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-transparent border border-primary/30 text-xs text-primary hover:bg-primary/10 transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Ver retrospectiva
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [showCreateModal, setShowCreateModal] = useState(false);

  const { data: userData } = trpc.users.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pools = [], isLoading: poolsLoading, error: poolsError, refetch: refetchPools } = trpc.users.myPools.useQuery(undefined, { enabled: isAuthenticated });
  const { data: statsRaw, isLoading: statsLoading } = trpc.users.myStats.useQuery(undefined, { enabled: isAuthenticated });
  const stats = statsRaw as MyStatsData | undefined;
  const { data: badgesData } = trpc.badges.userBadges.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: isAuthenticated && !!user?.id }
  );
  const { data: recentBets = [] } = trpc.users.recentBets.useQuery(undefined, { enabled: isAuthenticated });

  // Detectar usuário novo: conta criada há menos de 10 minutos
  const isNewUser = useMemo(() => {
    if (!userData?.user?.createdAt) return false;
    const createdAt = new Date(userData.user.createdAt).getTime();
    return Date.now() - createdAt < 10 * 60 * 1000;
  }, [userData?.user?.createdAt]);

  // Pool selector — no "all" option; user must select a specific pool
  const [selectedPoolId, setSelectedPoolId] = useState<number | null>(null);
  const { data: poolStats } = trpc.users.myStatsByPool.useQuery(
    { poolId: selectedPoolId! },
    { enabled: isAuthenticated && selectedPoolId !== null }
  );

  // Cumulative points chart — only for selected pool
  const chartData = useMemo(() => {
    const history = poolStats?.pointsHistory;
    if (!history?.length) return [];
    let cumulative = 0;
    return history.map((p: { label: string; points: number }) => {
      cumulative += p.points;
      return { label: p.label, points: cumulative };
    });
  }, [poolStats?.pointsHistory]);

  // Radar data — pool-specific when selected, global otherwise
  const activeRadarData = selectedPoolId !== null ? poolStats?.radarData : stats?.radarData;

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
            <h1 className="font-bold text-xl mb-1">Plakr!</h1>
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
  const avatarUrl = (userData?.user as any)?.avatarUrl as string | null | undefined;
  const initials = user?.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const activePools = (pools as any[]).filter((p: any) => p.pool?.status === "active" || p.pool?.status === "finished" || p.pool?.status === "awaiting_conclusion");
  const concludedPools = (pools as any[]).filter((p: any) => p.pool?.status === "concluded");

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 lg:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">

          {/* ── LEFT: Profile card ── */}
          {/* Em mobile: order-1 (perfil primeiro); em desktop: order-none (coluna esquerda) */}
          <div className="space-y-4 order-1 lg:order-none">
            <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
              {/* Avatar + name */}
              <div className="flex flex-col items-center text-center gap-3">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center overflow-hidden">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user?.name ?? ""} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-display font-bold text-xl text-primary">
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
                <div>
                  <h2 className="font-display font-bold text-base">
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

              {/* Global stats in JetBrains Mono — métricas relevantes */}
              <TooltipProvider>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
                {/* Aproveitamento */}
                <div className="text-center">
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-0.5 cursor-help">
                        <p className="font-mono font-bold text-2xl text-primary leading-none">
                          {stats?.accuracy ?? 0}
                        </p>
                        <span className="font-mono font-bold text-sm text-primary/70 leading-none mt-1">%</span>
                        <Info className="w-3 h-3 text-muted-foreground/40 ml-0.5" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p className="text-xs">
                        {stats?.totalBets
                          ? `${Math.round(((stats.accuracy / 100) * stats.totalBets))} palpites corretos de ${stats.totalBets} totais`
                          : "Nenhum palpite registrado ainda"}
                      </p>
                    </TooltipContent>
                  </UITooltip>
                  <p className="text-xs text-muted-foreground mt-1">Aproveit.</p>
                </div>
                {/* Melhor posição */}
                <div className="text-center border-x border-border/30">
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1 cursor-help">
                        {stats?.bestPosition != null ? (
                          <>
                            {stats.bestPosition === 1 && <Crown className="w-4 h-4 text-yellow-400" />}
                            {stats.bestPosition === 2 && <Medal className="w-4 h-4 text-slate-300" />}
                            {stats.bestPosition === 3 && <Medal className="w-4 h-4 text-amber-600" />}
                            <p className={`font-mono font-bold text-2xl leading-none ${
                              stats.bestPosition === 1 ? "text-yellow-400" :
                              stats.bestPosition === 2 ? "text-slate-300" :
                              stats.bestPosition === 3 ? "text-amber-600" :
                              "text-foreground"
                            }`}>
                              {stats.bestPosition}º
                            </p>
                          </>
                        ) : (
                          <p className="font-mono font-bold text-2xl text-muted-foreground/40 leading-none">—</p>
                        )}
                        <Info className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[220px] text-center">
                      <p className="text-xs">
                        {stats?.bestPosition != null
                          ? `Sua melhor colocação final em bolões encerrados`
                          : "Nenhum bolão encerrado ainda"}
                      </p>
                    </TooltipContent>
                  </UITooltip>
                  <p className="text-xs text-muted-foreground mt-1">Melhor pos.</p>
                </div>
                {/* Total de palpites */}
                <div className="text-center">
                  <UITooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center justify-center gap-1 cursor-help">
                        <p className="font-mono font-bold text-2xl text-foreground leading-none">
                          {stats?.totalBets ?? 0}
                        </p>
                        <Info className="w-3 h-3 text-muted-foreground/40" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[200px] text-center">
                      <p className="text-xs">Total de palpites registrados em todos os seus bolões</p>
                    </TooltipContent>
                  </UITooltip>
                  <p className="text-xs text-muted-foreground mt-1">Palpites</p>
                </div>
              </div>
              </TooltipProvider>
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

            {/* Badges carrossel — exibe sempre que há badges na plataforma (inativos se nenhum conquistado) */}
            {badgesData && badgesData.length > 0 && (
              <DashboardBadgeCarousel
                badges={badgesData as any[]}
                stats={stats ?? null}
                userId={user?.id}
              />
            )}
          </div>

          {/* ── RIGHT: Content ── */}
          {/* Em mobile: order-2 (aparece depois do perfil); em desktop: order-none */}
          <div className="space-y-6 order-2 lg:order-none">

            {/* My pools */}
            <section data-tour="my-pools">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Meus Bolões</h3>
                <Link href="/pools/public" className="text-xs text-primary hover:underline">
                  Explorar bolões →
                </Link>
              </div>

              {poolsError ? (
                <ErrorCard error={poolsError} onRetry={() => refetchPools()} />
              ) : activePools.length === 0 && concludedPools.length === 0 ? (
                isNewUser ? (
                  <WelcomeCard
                    name={userData?.user?.name ?? user?.name ?? ""}
                    onCreatePool={() => setShowCreateModal(true)}
                    onEnterPool={() => navigate("/enter-pool")}
                  />
                ) : (
                <EmptyState
                  icon={Trophy}
                  title="Nenhum bolão ainda"
                  description="Crie seu primeiro bolão ou entre em um existente com código de convite."
                  actionLabel="Criar bolão"
                  onAction={() => setShowCreateModal(true)}
                  secondaryLabel="Entrar por código"
                  onSecondary={() => navigate("/enter-pool")}
                />
                )
              ) : (
                <div className="space-y-2.5">
                  {activePools.map(({ pool, member, rankPosition, totalMembers, pendingBetsCount }: { pool: any; member: any; rankPosition: number | null; totalMembers: number; pendingBetsCount: number }) => (
                    <Link key={pool.id} href={`/pool/${pool.slug}`}>
                      <div className={`group flex items-center gap-3 rounded-xl px-4 py-3.5 transition-all cursor-pointer border ${
                        pendingBetsCount > 0
                          ? "bg-primary/5 border-primary/30 hover:bg-primary/10 hover:border-primary/50"
                          : pool.status === "awaiting_conclusion"
                          ? "bg-primary/5 border-primary/25 hover:bg-primary/10 hover:border-primary/40"
                          : "bg-card border-border/40 hover:border-primary/40 hover:bg-primary/5"
                      }`}>
                        <div className="relative">
                          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 overflow-hidden bg-primary/10">
                            {pool.logoUrl ? (
                              <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
                            ) : (
                              pool.status === "awaiting_conclusion"
                                ? <Clock className="w-5 h-5 text-primary" />
                                : <Trophy className="w-5 h-5 text-primary" />
                            )}
                          </div>
                          {pendingBetsCount > 0 && (
                            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center px-1 leading-none border-2 border-card shadow-sm">
                              {pendingBetsCount > 9 ? "9+" : pendingBetsCount}
                            </span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="font-semibold text-sm truncate">{pool.name}</p>
                            {pool.plan === "pro" && <Crown className="w-3 h-3 text-primary shrink-0" />}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {pool.status === "awaiting_conclusion" ? (
                              <span className="text-xs font-semibold text-primary">Aguardando encerramento</span>
                            ) : rankPosition && totalMembers > 0 ? (
                              <span className="text-xs font-semibold" style={{ color: rankPosition === 1 ? "#FFB800" : rankPosition === 2 ? "#E5E5E5" : rankPosition === 3 ? "#CD7F32" : undefined }}>
                                {rankPosition === 1 ? "🥇" : rankPosition === 2 ? "🥈" : rankPosition === 3 ? "🥉" : `${rankPosition}º`} de {totalMembers}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                {member.role === "organizer" ? "Organizador" : "Participante"}
                              </span>
                            )}
                            {pendingBetsCount > 0 && (
                              <span className="text-xs font-semibold text-primary">
                                · {pendingBetsCount} palpite{pendingBetsCount > 1 ? "s" : ""} pendente{pendingBetsCount > 1 ? "s" : ""}
                              </span>
                            )}
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}

              {/* Seção de retrospectivas — bolões concluídos */}
              {concludedPools.length > 0 && (
                <div className="mt-4 space-y-3">
                  <div className="flex items-center gap-2 mb-1">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Retrospectivas</h4>
                  </div>
                  {concludedPools.map(({ pool, hasRetrospective, shareCardUrl, finalPosition, totalMembers }: { pool: any; hasRetrospective: boolean; shareCardUrl: string | null; finalPosition: number | null; totalMembers: number }) => (
                    <ShareCardDashboardItem
                      key={pool.id}
                      pool={pool}
                      hasRetrospective={hasRetrospective}
                      shareCardUrl={shareCardUrl}
                      finalPosition={finalPosition}
                      totalMembers={totalMembers}
                      onNavigate={(path) => navigate(path)}
                    />
                  ))}
                </div>
              )}
            </section>

            {/* Points evolution chart — pool-specific only */}
            <section>
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Evolução de Pontos</h3>
                </div>
                {activePools.length > 0 && (
                  <Select
                    value={selectedPoolId === null ? "" : String(selectedPoolId)}
                    onValueChange={(v) => setSelectedPoolId(v ? Number(v) : null)}
                  >
                    <SelectTrigger className="h-7 text-xs w-auto min-w-[160px] max-w-[220px] border-border/40 bg-card">
                      <SelectValue placeholder="Selecionar bolão…" />
                    </SelectTrigger>
                    <SelectContent>
                      {activePools.map((p: any) => (
                        <SelectItem key={p.pool.id} value={String(p.pool.id)}>
                          {p.pool.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="bg-card border border-border/30 rounded-xl p-4">
                {selectedPoolId === null ? (
                  /* State: no pool selected */
                  <div className="h-[160px] flex flex-col items-center justify-center gap-3">
                    <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Selecione um bolão para ver sua evolução de pontos.</p>
                      {activePools.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-center mt-3">
                          {activePools.slice(0, 3).map((p: any) => (
                            <button
                              key={p.pool.id}
                              onClick={() => setSelectedPoolId(p.pool.id)}
                              className="text-xs px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20"
                            >
                              {p.pool.name}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : chartData.length === 0 ? (
                  /* State: pool selected but no scored bets yet */
                  <div className="h-[160px] flex flex-col items-center justify-center gap-3">
                    <TrendingUp className="w-8 h-8 text-muted-foreground/20" />
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Nenhum jogo pontuado neste bolão ainda.</p>
                      <p className="font-mono font-bold text-3xl text-primary mt-2">
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
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: "var(--chart-indigo)" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 10, fill: "var(--chart-indigo)" }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid #2E3347", borderRadius: "8px", fontSize: "12px" }}
                        labelStyle={{ color: "var(--muted-foreground)" }}
                        formatter={(value: number) => [`${value} pts`, "Pontos acumulados"]}
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

            {/* Radar chart — apostador profile */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Radar className="w-4 h-4 text-muted-foreground" />
                <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
                  Perfil de Apostador
                </h3>
                {selectedPoolId !== null && (
                  <span className="text-xs text-muted-foreground/60 ml-1">
                    — {activePools.find((p: any) => p.pool.id === selectedPoolId)?.pool.name ?? "bolão selecionado"}
                  </span>
                )}
              </div>
              <div className="bg-card border border-border/30 rounded-xl p-4">
                {!activeRadarData || activeRadarData.every((d: any) => d.value === 0) ? (
                  <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                    <Radar className="w-8 h-8 text-muted-foreground/20" />
                    <p className="text-sm text-muted-foreground text-center">
                      Seu perfil de apostador aparecerá aqui após os primeiros jogos pontuados.
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <RadarChart data={activeRadarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke="rgba(255,255,255,0.08)" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                      />
                      <PolarRadiusAxis
                        angle={90}
                        domain={[0, 100]}
                        tick={{ fontSize: 9, fill: "var(--chart-indigo)" }}
                        tickCount={4}
                      />
                      <RechartsRadar
                        name="Perfil"
                        dataKey="value"
                        stroke="hsl(var(--primary))"
                        fill="hsl(var(--primary))"
                        fillOpacity={0.2}
                        strokeWidth={2}
                        dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                      />
                      <Tooltip
                        contentStyle={{ background: "var(--card)", border: "1px solid #2E3347", borderRadius: "8px", fontSize: "12px" }}
                        formatter={(value: number, name: string) => [`${value}%`, name]}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </section>

            {/* Próximas Conquistas */}
            <div data-tour="nearest-badges">
              <NearestBadges />
            </div>

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
                    {(recentBets as any[]).map((bet: any) => {
                      const icon =
                        bet.result === "exact" ? (
                          <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                        ) : bet.result === "correct" ? (
                          <Minus className="w-4 h-4 text-yellow-400 shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                        );
                      const resultColor =
                        bet.result === "exact" ? "text-green-400" : bet.result === "correct" ? "text-primary" : "text-red-400";

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
      {/* Tour guiado de primeiro acesso */}
      <OnboardingTour />

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

/* ───────────────────────────────────────────────────────────────────────────────
 * WelcomeCard — tela de boas-vindas para novos usuários (conta criada há < 10 min)
 * ─────────────────────────────────────────────────────────────────────────────── */
function WelcomeCard({
  name,
  onCreatePool,
  onEnterPool,
}: {
  name: string;
  onCreatePool: () => void;
  onEnterPool: () => void;
}) {
  const firstName = name.split(" ")[0] || "Apostador";
  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 via-background to-primary/10 p-6 space-y-5 text-center">
      {/* Emoji animado */}
      <div className="text-5xl select-none" role="img" aria-label="trofeu">
        🏆
      </div>

      {/* Mensagem de boas-vindas */}
      <div className="space-y-1.5">
        <h2 className="font-display font-bold text-xl">
          Bem-vindo ao Plakr!, {firstName}!
        </h2>
        <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">
          Aqui você cria bolões esportivos, faz palpites e compete com amigos em tempo real.
          Comece criando seu primeiro bolão ou entre em um que já existe.
        </p>
      </div>

      {/* Passos rápidos */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
        {[
          { icon: "🏆", step: "1", title: "Crie um bolão", desc: "Escolha um campeonato e configure as regras" },
          { icon: "👥", step: "2", title: "Convide amigos", desc: "Compartilhe o link de convite no WhatsApp" },
          { icon: "🎯", step: "3", title: "Faça palpites", desc: "Aposte nos resultados antes dos jogos" },
        ].map(({ icon, step, title, desc }) => (
          <div key={step} className="flex items-start gap-3 bg-card/60 border border-border/30 rounded-xl p-3">
            <span className="text-2xl shrink-0">{icon}</span>
            <div>
              <p className="text-xs font-bold text-primary uppercase tracking-wider mb-0.5">Passo {step}</p>
              <p className="text-sm font-semibold">{title}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button onClick={onCreatePool} className="gap-2" size="lg">
          <Plus className="w-4 h-4" /> Criar meu primeiro bolão
        </Button>
        <Button onClick={onEnterPool} variant="outline" className="gap-2" size="lg">
          <Search className="w-4 h-4" /> Entrar com código
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Plano gratuito inclui até 2 bolões e 50 participantes por bolão.
      </p>
    </div>
  );
}
