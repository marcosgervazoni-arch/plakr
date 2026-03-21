import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  BarChart3,
  Crown,
  DollarSign,
  Loader2,
  TrendingUp,
  Trophy,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export default function AdminDashboard() {
  const { data: stats, isLoading } = trpc.platform.getStats.useQuery();

  const mockGrowthData = [
    { month: "Out", users: 12, pools: 3, revenue: 0 },
    { month: "Nov", users: 28, pools: 7, revenue: 0 },
    { month: "Dez", users: 45, pools: 12, revenue: 0 },
    { month: "Jan", users: 67, pools: 18, revenue: 0 },
    { month: "Fev", users: 89, pools: 24, revenue: 0 },
    { month: "Mar", users: stats?.totalUsers ?? 0, pools: stats?.totalPools ?? 0, revenue: 0 },
  ];

  const metricCards = [
    {
      title: "Total de Usuários",
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
      sub: "cadastrados na plataforma",
    },
    {
      title: "Bolões Ativos",
      value: stats?.activePools ?? 0,
      icon: Trophy,
      color: "text-green-400",
      bg: "bg-green-400/10",
      sub: "em andamento agora",
    },
    {
      title: "Assinaturas Pro",
      value: stats?.proPlans ?? 0,
      icon: Crown,
      color: "text-yellow-400",
      bg: "bg-yellow-400/10",
      sub: "bolões com Plano Pro",
    },
    {
      title: "Palpites Registrados",
      value: stats?.totalBets ?? 0,
      icon: Activity,
      color: "text-brand",
      bg: "bg-brand/10",
      sub: "total na plataforma",
    },
  ];

  return (
    <AdminLayout activeSection="dashboard">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display">Dashboard Global</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Visão geral da plataforma ApostAI —{" "}
            {format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>

        {/* Métricas principais */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {metricCards.map((m) => (
              <Card key={m.title} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">{m.title}</p>
                      <p className={`text-2xl font-bold font-mono mt-1 ${m.color}`}>
                        {m.value.toLocaleString("pt-BR")}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{m.sub}</p>
                    </div>
                    <div className={`w-9 h-9 rounded-lg ${m.bg} flex items-center justify-center`}>
                      <m.icon className={`h-4 w-4 ${m.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Gráfico de crescimento */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-brand" />
                Crescimento da Plataforma
              </CardTitle>
              <Badge variant="outline" className="text-xs">Últimos 6 meses</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={mockGrowthData}>
                <defs>
                  <linearGradient id="usersGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="poolsGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
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
                <Area type="monotone" dataKey="users" stroke="#6366f1" fill="url(#usersGrad)" strokeWidth={2} name="Usuários" />
                <Area type="monotone" dataKey="pools" stroke="#22c55e" fill="url(#poolsGrad)" strokeWidth={2} name="Bolões" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Stats secundárias */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Campeonatos Globais</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono text-brand">
                {stats?.totalTournaments ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">cadastrados na plataforma</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Taxa de Conversão Pro</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono text-yellow-400">
                {stats?.totalPools
                  ? `${Math.round(((stats.proPlans ?? 0) / stats.totalPools) * 100)}%`
                  : "0%"}
              </p>
              <p className="text-xs text-muted-foreground mt-1">bolões que assinaram o Pro</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">Total de Bolões</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold font-mono text-green-400">
                {stats?.totalPools ?? 0}
              </p>
              <p className="text-xs text-muted-foreground mt-1">criados na plataforma</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
