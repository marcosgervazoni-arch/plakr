import { useState } from "react";
import { Link } from "wouter";
import {
  Users, Trophy, Target, TrendingUp, DollarSign, Activity,
  Zap, AlertTriangle, AlertCircle, Info, ChevronRight,
  ClipboardList, Megaphone, Settings,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

// ─── CARD DE MÉTRICA ─────────────────────────────────────────────────────────
function MetricCard({
  title, value, sub, icon: Icon, color, bg,
}: {
  title: string; value: string; sub: string;
  icon: React.ElementType; color: string; bg: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground truncate">{title}</p>
            <p className={`text-2xl font-bold font-mono mt-1 ${color}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1 truncate">{sub}</p>
          </div>
          <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center shrink-0 ml-2`}>
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── ALERTA CONTEXTUAL ────────────────────────────────────────────────────────
function AlertBanner({
  type, message, action, actionPath,
}: {
  type: "warning" | "error" | "info";
  message: string;
  action?: string;
  actionPath?: string;
}) {
  const styles = {
    warning: { bg: "bg-yellow-500/10 border-yellow-500/30", text: "text-yellow-400", Icon: AlertTriangle },
    error: { bg: "bg-red-500/10 border-red-500/30", text: "text-red-400", Icon: AlertCircle },
    info: { bg: "bg-blue-500/10 border-blue-500/30", text: "text-blue-400", Icon: Info },
  }[type];

  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-2.5 rounded-lg border ${styles.bg}`}>
      <div className="flex items-center gap-2 min-w-0">
        <styles.Icon className={`h-4 w-4 shrink-0 ${styles.text}`} />
        <span className={`text-sm font-medium ${styles.text} truncate`}>{message}</span>
      </div>
      {action && actionPath && (
        <Link href={actionPath}>
          <Button variant="ghost" size="sm" className={`text-xs shrink-0 ${styles.text}`}>
            {action} <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </Link>
      )}
    </div>
  );
}

// ─── QUICK ACTION ─────────────────────────────────────────────────────────────
function QuickAction({
  icon: Icon, label, path, badge,
}: {
  icon: React.ElementType; label: string; path: string; badge?: number;
}) {
  return (
    <Link href={path}>
      <div className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:border-brand/40 hover:bg-brand/5 transition-all cursor-pointer group">
        <div className="w-8 h-8 rounded-md bg-brand/10 flex items-center justify-center shrink-0 group-hover:bg-brand/20 transition-colors">
          <Icon className="h-4 w-4 text-brand" />
        </div>
        <span className="text-sm font-medium flex-1">{label}</span>
        {badge !== undefined && badge > 0 && (
          <Badge variant="destructive" className="text-xs h-5 min-w-[20px] px-1.5">{badge}</Badge>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
      </div>
    </Link>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────
export default function AdminDashboard() {
  const [chartMetric, setChartMetric] = useState<"users" | "pools" | "bets">("users");

  const { data: enriched, isLoading: loadingStats } = trpc.adminDashboard.getEnrichedStats.useQuery();
  const { data: growth, isLoading: loadingGrowth } = trpc.adminDashboard.getGrowthSeries.useQuery();
  const { data: alerts, isLoading: loadingAlerts } = trpc.adminDashboard.getDashboardAlerts.useQuery();
  const { data: pending } = trpc.adminDashboard.getPendingGames.useQuery();
  const { data: health } = trpc.adminDashboard.getSystemHealth.useQuery();

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const metricCards = enriched
    ? [
        {
          title: "Usuários Totais",
          value: enriched.totalUsers.toLocaleString("pt-BR"),
          sub: `${enriched.dau} ativos hoje · ${enriched.wau} esta semana`,
          icon: Users, color: "text-indigo-400", bg: "bg-indigo-500/10",
        },
        {
          title: "MRR Estimado",
          value: fmtBrl(enriched.mrrBrl),
          sub: `ARR: ${fmtBrl(enriched.arrBrl)}`,
          icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10",
        },
        {
          title: "Bolões Ativos",
          value: enriched.activePools.toLocaleString("pt-BR"),
          sub: `${enriched.proPlans} Pro · ${enriched.activePools - enriched.proPlans} Free`,
          icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10",
        },
        {
          title: "Conversão Free→Pro",
          value: `${enriched.conversionRate}%`,
          sub: `${enriched.proPlans} de ${enriched.totalPools} bolões`,
          icon: TrendingUp, color: "text-brand", bg: "bg-brand/10",
        },
        {
          title: "Palpites Hoje",
          value: enriched.betsToday.toLocaleString("pt-BR"),
          sub: `${enriched.totalBets.toLocaleString("pt-BR")} no total`,
          icon: Target, color: "text-primary", bg: "bg-primary/10",
        },
        {
          title: "Campeonatos",
          value: enriched.totalTournaments.toLocaleString("pt-BR"),
          sub: "cadastrados na plataforma",
          icon: Activity, color: "text-purple-400", bg: "bg-purple-500/10",
        },
      ]
    : [];

  const chartColors = { users: "var(--chart-indigo)", pools: "var(--chart-success)", bets: "var(--chart-warning)" };
  const chartLabels = { users: "Usuários", pools: "Bolões", bets: "Palpites" };

  return (
    <AdminLayout activeSection="dashboard">
      <div className="space-y-6">
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

        {/* Alertas contextuais */}
        {!loadingAlerts && alerts && alerts.length > 0 && (
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <AlertBanner key={i} {...a} />
            ))}
          </div>
        )}

        {/* Cards de métricas */}
        {loadingStats ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-7 w-16 mb-1" />
                  <Skeleton className="h-3 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {metricCards.map((m) => (
              <MetricCard key={m.title} {...m} />
            ))}
          </div>
        )}

        {/* Gráfico de crescimento */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                Crescimento da Plataforma
              </CardTitle>
              <div className="flex items-center gap-1">
                {(["users", "pools", "bets"] as const).map((m) => (
                  <Button
                    key={m}
                    variant={chartMetric === m ? "default" : "ghost"}
                    size="sm"
                    className="text-xs h-7 px-2"
                    onClick={() => setChartMetric(m)}
                  >
                    {chartLabels[m]}
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
                    <linearGradient id="metricGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartColors[chartMetric]} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartColors[chartMetric]} stopOpacity={0} />
                    </linearGradient>
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
                  <Area
                    type="monotone"
                    dataKey={chartMetric}
                    stroke={chartColors[chartMetric]}
                    fill="url(#metricGrad)"
                    strokeWidth={2}
                    name={chartLabels[chartMetric]}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + Status do Sistema */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand" />
                Ações Rápidas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAction icon={ClipboardList} label="Registrar Resultados" path="/admin/game-results" badge={pending?.length} />
              <QuickAction icon={Users} label="Gerenciar Usuários" path="/admin/users" />
              <QuickAction icon={Trophy} label="Assinaturas Pro" path="/admin/subscriptions" />
              <QuickAction icon={Megaphone} label="Enviar Broadcast" path="/admin/broadcasts" />
              <QuickAction icon={Settings} label="Saúde do Sistema" path="/admin/system" badge={health?.emailQueue.failed} />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                Status do Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                {
                  label: "Fila de E-mail",
                  dot: (health?.emailQueue.failed ?? 0) > 0 ? "bg-red-400" : (health?.emailQueue.pending ?? 0) > 10 ? "bg-yellow-400" : "bg-emerald-400",
                  value: `${health?.emailQueue.pending ?? 0} pendentes${(health?.emailQueue.failed ?? 0) > 0 ? ` · ${health?.emailQueue.failed} falhas` : ""}`,
                  valueColor: (health?.emailQueue.failed ?? 0) > 0 ? "text-red-400" : "text-muted-foreground",
                },
                {
                  label: "Push Notifications",
                  dot: "bg-emerald-400",
                  value: `${health?.pushSubscriptions ?? 0} assinaturas`,
                  valueColor: "text-muted-foreground",
                },
                {
                  label: "Resultados Pendentes",
                  dot: (pending?.length ?? 0) > 0 ? "bg-yellow-400" : "bg-emerald-400",
                  value: `${pending?.length ?? 0} jogos`,
                  valueColor: (pending?.length ?? 0) > 0 ? "text-yellow-400" : "text-muted-foreground",
                },
                {
                  label: "Erros Recentes",
                  dot: (health?.recentErrors.length ?? 0) > 0 ? "bg-red-400" : "bg-emerald-400",
                  value: `${health?.recentErrors.length ?? 0} erros`,
                  valueColor: (health?.recentErrors.length ?? 0) > 0 ? "text-red-400" : "text-muted-foreground",
                },
              ].map((row, i, arr) => (
                <div key={row.label} className={`flex items-center justify-between py-2 ${i < arr.length - 1 ? "border-b border-border/30" : ""}`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${row.dot}`} />
                    <span className="text-sm">{row.label}</span>
                  </div>
                  <span className={`text-xs font-medium ${row.valueColor}`}>{row.value}</span>
                </div>
              ))}
              <Link href="/admin/system">
                <Button variant="outline" size="sm" className="w-full text-xs mt-1">
                  Ver detalhes do sistema
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
