/**
 * Admin Dashboard — Visão Geral
 * Zona A: Barra de Saúde (semáforos operacionais)
 * Zona B: Métricas em duas linhas temáticas (Financeiro + Produto)
 * Zona C: Gráfico multi-série + Ações Contextuais
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  Users, Trophy, Target, TrendingUp, DollarSign, Activity,
  Zap, AlertTriangle, AlertCircle, Info, ChevronRight,
  ClipboardList, Megaphone, Settings, Mail, CreditCard,
  Clock, Star, BarChart3, Handshake,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── SEMÁFORO DE SAÚDE ────────────────────────────────────────────────────────
type HealthStatus = "ok" | "warn" | "error";

function HealthPill({
  label, status, value, path,
}: {
  label: string; status: HealthStatus; value: string; path: string;
}) {
  const dot = status === "ok" ? "bg-emerald-400" : status === "warn" ? "bg-yellow-400 animate-pulse" : "bg-red-400 animate-pulse";
  const text = status === "ok" ? "text-muted-foreground" : status === "warn" ? "text-yellow-400" : "text-red-400";
  const border = status === "ok" ? "border-border/40" : status === "warn" ? "border-yellow-500/30" : "border-red-500/30";
  const bg = status === "ok" ? "" : status === "warn" ? "bg-yellow-500/5" : "bg-red-500/5";

  return (
    <Link href={path}>
      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${border} ${bg} hover:border-brand/40 hover:bg-brand/5 transition-all cursor-pointer group`}>
        <div className={`w-2 h-2 rounded-full shrink-0 ${dot}`} />
        <div className="min-w-0">
          <p className="text-xs font-medium truncate">{label}</p>
          <p className={`text-xs truncate ${text}`}>{value}</p>
        </div>
      </div>
    </Link>
  );
}

// ─── CARD DE MÉTRICA ─────────────────────────────────────────────────────────
function MetricCard({
  title, value, sub, delta, icon: Icon, color, bg, path,
}: {
  title: string; value: string; sub: string; delta?: string;
  icon: React.ElementType; color: string; bg: string; path?: string;
}) {
  const content = (
    <Card className="border-border/50 hover:border-brand/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <p className="text-xs text-muted-foreground truncate">{sub}</p>
              {delta && (
                <Badge variant="outline" className="text-xs h-4 px-1.5 py-0 text-emerald-400 border-emerald-500/30">
                  {delta}
                </Badge>
              )}
            </div>
          </div>
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0 ml-2`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return path ? <Link href={path}>{content}</Link> : content;
}

// ─── AÇÃO CONTEXTUAL ──────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, path, badge, urgent,
}: {
  icon: React.ElementType; label: string; path: string; badge?: number; urgent?: boolean;
}) {
  return (
    <Link href={path}>
      <div className={`flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer group ${
        urgent
          ? "border-red-500/40 bg-red-500/5 hover:bg-red-500/10"
          : "border-border/50 hover:border-brand/40 hover:bg-brand/5"
      }`}>
        <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 transition-colors ${
          urgent ? "bg-red-500/15 group-hover:bg-red-500/25" : "bg-brand/10 group-hover:bg-brand/20"
        }`}>
          <Icon className={`h-4 w-4 ${urgent ? "text-red-400" : "text-brand"}`} />
        </div>
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant="destructive" className="text-xs h-5 min-w-[20px] px-1.5">{badge}</Badge>
        )}
        <ChevronRight className={`h-4 w-4 transition-colors ${urgent ? "text-red-400" : "text-muted-foreground group-hover:text-brand"}`} />
      </div>
    </Link>
  );
}

// ─── SKELETON ROW ─────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <Skeleton className="h-3 w-20 mb-2" />
        <Skeleton className="h-7 w-16 mb-1" />
        <Skeleton className="h-3 w-28" />
      </CardContent>
    </Card>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [showAllSeries, setShowAllSeries] = useState(true);
  const [chartMetric, setChartMetric] = useState<"users" | "pools" | "bets">("users");

  const { data: enriched, isLoading: loadingStats } = trpc.adminDashboard.getEnrichedStats.useQuery();
  const { data: subs, isLoading: loadingSubs } = trpc.adminDashboard.getSubscriptionStats.useQuery();
  const { data: growth, isLoading: loadingGrowth } = trpc.adminDashboard.getGrowthSeries.useQuery();
  const { data: pending } = trpc.adminDashboard.getPendingGames.useQuery();
  const { data: health } = trpc.adminDashboard.getSystemHealth.useQuery();

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  // ─── ZONA A: Barra de Saúde ───────────────────────────────────────────────
  const emailStatus: HealthStatus = (health?.emailQueue.failed ?? 0) > 0 ? "error" : (health?.emailQueue.pending ?? 0) > 10 ? "warn" : "ok";
  const stripeStatus: HealthStatus = !health?.integrations.stripe.keysConfigured ? "error" : !health?.integrations.stripe.isLive ? "warn" : "ok";
  const cronErrors = health?.cronJobs ? Object.values(health.cronJobs).filter((j: any) => j.lastRunSuccess === false).length : 0;
  const cronStatus: HealthStatus = cronErrors > 0 ? "error" : "ok";
  const pendingCount = pending?.length ?? 0;
  const pendingStatus: HealthStatus = pendingCount > 5 ? "error" : pendingCount > 0 ? "warn" : "ok";
  const expiringStatus: HealthStatus = (subs?.expiringSoon ?? 0) > 0 ? "warn" : "ok";
  const errorsStatus: HealthStatus = (health?.recentErrors.length ?? 0) > 0 ? "warn" : "ok";

  const healthPills = [
    {
      label: "E-mail",
      status: emailStatus,
      value: emailStatus === "error" ? `${health?.emailQueue.failed} falhas` : emailStatus === "warn" ? `${health?.emailQueue.pending} pendentes` : `${health?.emailQueue.sentToday ?? 0} enviados hoje`,
      path: "/admin/system",
    },
    {
      label: "Stripe",
      status: stripeStatus,
      value: !health?.integrations.stripe.keysConfigured ? "Não configurado" : !health?.integrations.stripe.isLive ? "Modo teste" : "Live ativo",
      path: "/admin/integrations",
    },
    {
      label: "Cron Jobs",
      status: cronStatus,
      value: cronStatus === "error" ? `${cronErrors} com falha` : "Todos operacionais",
      path: "/admin/system",
    },
    {
      label: "Resultados",
      status: pendingStatus,
      value: pendingCount > 0 ? `${pendingCount} pendentes` : "Em dia",
      path: "/admin/game-results",
    },
    {
      label: "Assinaturas",
      status: expiringStatus,
      value: (subs?.expiringSoon ?? 0) > 0 ? `${subs?.expiringSoon} vencem em 7d` : "Sem vencimentos",
      path: "/admin/subscriptions",
    },
    {
      label: "Erros",
      status: errorsStatus,
      value: (health?.recentErrors.length ?? 0) > 0 ? `${health?.recentErrors.length} recentes` : "Sem erros",
      path: "/admin/system",
    },
  ];

  // ─── ZONA B: Métricas Financeiras ─────────────────────────────────────────
  const financialCards = subs && enriched ? [
    {
      title: "MRR",
      value: fmtBrl(subs.mrrBrl),
      sub: `ARR: ${fmtBrl(subs.arrBrl)}`,
      delta: subs.newThisMonth > 0 ? `+${subs.newThisMonth} este mês` : undefined,
      icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10",
      path: "/admin/subscriptions",
    },
    {
      title: "Churn Rate",
      value: `${subs.churnRate}%`,
      sub: `${subs.churned} cancelamentos (30d)`,
      icon: TrendingUp, color: subs.churnRate > 5 ? "text-red-400" : "text-emerald-400", bg: subs.churnRate > 5 ? "bg-red-500/10" : "bg-emerald-500/10",
      path: "/admin/subscriptions",
    },
    {
      title: "Ticket Médio",
      value: fmtBrl(subs.ticketMedio),
      sub: `${subs.totalPro} assinaturas ativas`,
      icon: CreditCard, color: "text-brand", bg: "bg-brand/10",
      path: "/admin/subscriptions",
    },
    {
      title: "Naming Rights",
      value: `${enriched.activeSponsors}`,
      sub: `${enriched.sponsorImpressions.toLocaleString("pt-BR")} impressões (30d)`,
      delta: enriched.sponsorCtr > 0 ? `CTR ${enriched.sponsorCtr}%` : undefined,
      icon: Handshake, color: "text-cyan-400", bg: "bg-cyan-500/10",
      path: "/admin/sponsorship",
    },
  ] : [];

  // ─── ZONA B: Métricas de Produto ──────────────────────────────────────────
  const productCards = enriched ? [
    {
      title: "Usuários Totais",
      value: enriched.totalUsers.toLocaleString("pt-BR"),
      sub: `${enriched.dau} hoje · ${enriched.wau} esta semana`,
      icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10",
      path: "/admin/users",
    },
    {
      title: "Bolões Ativos",
      value: enriched.activePools.toLocaleString("pt-BR"),
      sub: `${enriched.proPlans} Pro · ${enriched.activePools - enriched.proPlans} Free`,
      icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10",
      path: "/admin/pools",
    },
    {
      title: "Palpites Hoje",
      value: enriched.betsToday.toLocaleString("pt-BR"),
      sub: `${enriched.totalBets.toLocaleString("pt-BR")} no total`,
      icon: Target, color: "text-primary", bg: "bg-primary/10",
    },
    {
      title: "Conversão Free→Pro",
      value: `${enriched.conversionRate}%`,
      sub: `${enriched.proPlans} de ${enriched.totalPools} bolões`,
      icon: BarChart3, color: "text-purple-400", bg: "bg-purple-500/10",
      path: "/admin/subscriptions",
    },
  ] : [];

  // ─── ZONA C: Ações Contextuais ────────────────────────────────────────────
  const contextActions = [
    ...(pendingCount > 0 ? [{
      icon: ClipboardList, label: `Registrar ${pendingCount} resultado${pendingCount > 1 ? "s" : ""} pendente${pendingCount > 1 ? "s" : ""}`,
      path: "/admin/game-results", badge: pendingCount, urgent: true,
    }] : []),
    ...(!health?.integrations.stripe.isLive ? [{
      icon: AlertTriangle, label: "Stripe em modo teste — ativar live",
      path: "/admin/integrations", urgent: true,
    }] : []),
    { icon: Users, label: "Gerenciar Usuários", path: "/admin/users" },
    { icon: Trophy, label: "Assinaturas Pro", path: "/admin/subscriptions" },
    { icon: Megaphone, label: "Enviar Broadcast", path: "/admin/broadcasts" },
    { icon: Settings, label: "Saúde do Sistema", path: "/admin/system", badge: (health?.emailQueue.failed ?? 0) + (health?.recentErrors.length ?? 0) || undefined },
  ];

  const chartColors = {
    users: "var(--chart-indigo, #818cf8)",
    pools: "var(--chart-success, #34d399)",
    bets: "var(--chart-warning, #fbbf24)",
  };

  return (
    <AdminLayout activeSection="dashboard">
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Visão Geral</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Métricas em tempo real da plataforma</p>
          </div>
          <Badge variant="outline" className="text-xs gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Ao vivo
          </Badge>
        </div>

        {/* ─── ZONA A: Barra de Saúde ─────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Saúde Operacional</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
            {healthPills.map((p) => (
              <HealthPill key={p.label} {...p} />
            ))}
          </div>
        </div>

        {/* ─── ZONA B: Linha Financeira ────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Financeiro</p>
          {loadingSubs || loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {financialCards.map((m) => <MetricCard key={m.title} {...m} />)}
            </div>
          )}
        </div>

        {/* ─── ZONA B: Linha de Produto ────────────────────────────────────── */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Produto</p>
          {loadingStats ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {productCards.map((m) => <MetricCard key={m.title} {...m} />)}
            </div>
          )}
        </div>

        {/* ─── ZONA C: Gráfico + Ações ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gráfico multi-série */}
          <Card className="border-border/50 md:col-span-2">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-brand" />
                  Crescimento (6 meses)
                </CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant={showAllSeries ? "default" : "ghost"}
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setShowAllSeries(true)}
                  >
                    Todas
                  </Button>
                  {(["users", "pools", "bets"] as const).map((m) => (
                    <Button
                      key={m}
                      variant={!showAllSeries && chartMetric === m ? "default" : "ghost"}
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => { setShowAllSeries(false); setChartMetric(m); }}
                    >
                      {{ users: "Usuários", pools: "Bolões", bets: "Palpites" }[m]}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loadingGrowth ? (
                <Skeleton className="h-[220px] w-full" />
              ) : (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={growth ?? []}>
                    <defs>
                      {(["users", "pools", "bets"] as const).map((m) => (
                        <linearGradient key={m} id={`grad-${m}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={chartColors[m]} stopOpacity={0.25} />
                          <stop offset="95%" stopColor={chartColors[m]} stopOpacity={0} />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis dataKey="month" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                        fontSize: "12px",
                      }}
                    />
                    {showAllSeries && <Legend wrapperStyle={{ fontSize: "11px" }} />}
                    {showAllSeries ? (
                      (["users", "pools", "bets"] as const).map((m) => (
                        <Area
                          key={m}
                          type="monotone"
                          dataKey={m}
                          stroke={chartColors[m]}
                          fill={`url(#grad-${m})`}
                          strokeWidth={2}
                          name={{ users: "Usuários", pools: "Bolões", bets: "Palpites" }[m]}
                        />
                      ))
                    ) : (
                      <Area
                        type="monotone"
                        dataKey={chartMetric}
                        stroke={chartColors[chartMetric]}
                        fill={`url(#grad-${chartMetric})`}
                        strokeWidth={2}
                        name={{ users: "Usuários", pools: "Bolões", bets: "Palpites" }[chartMetric]}
                      />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Ações Contextuais */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand" />
                Ações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {contextActions.map((a, i) => (
                <QuickAction key={i} {...a} />
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
