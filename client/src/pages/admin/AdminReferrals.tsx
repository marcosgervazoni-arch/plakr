import { Zap, Users, TrendingUp, Award, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color = "text-brand",
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color?: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className={`text-2xl font-bold font-mono ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
          </div>
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
            <Icon className={`h-4 w-4 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AdminReferrals() {
  const { data, isLoading, refetch } = trpc.adminDashboard.getReferralStats.useQuery();

  return (
    <AdminLayout activeSection="referrals">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Zap className="h-5 w-5 text-brand" />
              Programa de Convites
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Acompanhe o desempenho do programa de indicações
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar
          </Button>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/50">
                <CardContent className="p-4">
                  <Skeleton className="h-4 w-20 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <MetricCard
                icon={Users}
                label="Total de Convites"
                value={data?.total ?? 0}
                sub="enviados até hoje"
              />
              <MetricCard
                icon={Award}
                label="Aceitos"
                value={data?.accepted ?? 0}
                sub="usuários registrados"
                color="text-emerald-400"
              />
              <MetricCard
                icon={Zap}
                label="Pendentes"
                value={data?.pending ?? 0}
                sub="aguardando registro"
                color="text-yellow-400"
              />
              <MetricCard
                icon={TrendingUp}
                label="Taxa de Conversão"
                value={`${data?.conversionRate ?? 0}%`}
                sub="convites → usuários"
                color={(data?.conversionRate ?? 0) >= 30 ? "text-emerald-400" : "text-brand"}
              />
            </>
          )}
        </div>

        {/* Barra de progresso de conversão */}
        {!isLoading && (data?.total ?? 0) > 0 && (
          <Card className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Taxa de conversão global</span>
                <span className="text-sm font-mono font-bold text-brand">{data?.conversionRate}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand rounded-full transition-all duration-500"
                  style={{ width: `${data?.conversionRate ?? 0}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                {data?.accepted} de {data?.total} convites resultaram em cadastro
              </p>
            </CardContent>
          </Card>
        )}

        {/* Top convitadores */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-brand" />
              Top Convitadores
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32 mb-1" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                  </div>
                ))}
              </div>
            ) : (data?.topInviters.length ?? 0) === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum convite enviado ainda</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Os dados aparecerão aqui quando os usuários começarem a convidar amigos
                </p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {data?.topInviters.map((inviter, index) => {
                  const convRate = inviter.total > 0
                    ? Math.round((inviter.accepted / inviter.total) * 100)
                    : 0;
                  return (
                    <div key={inviter.userId} className="px-4 py-3 flex items-center gap-3">
                      {/* Posição */}
                      <span className={`text-sm font-bold font-mono w-5 shrink-0 ${
                        index === 0 ? "text-yellow-400" :
                        index === 1 ? "text-slate-400" :
                        index === 2 ? "text-[#CD7F32]" :
                        "text-muted-foreground"
                      }`}>
                        {index + 1}
                      </span>

                      {/* Avatar */}
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarImage src={inviter.avatarUrl ?? undefined} />
                        <AvatarFallback className="text-xs bg-brand/10 text-brand">
                          {inviter.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Nome e stats */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{inviter.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {inviter.accepted} aceitos de {inviter.total} enviados
                        </p>
                      </div>

                      {/* Taxa de conversão */}
                      <div className="text-right shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            convRate >= 50
                              ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                              : convRate >= 25
                              ? "border-brand/30 text-brand bg-brand/5"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {convRate}% conv.
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Nota sobre dados futuros */}
        {!isLoading && (data?.total ?? 0) === 0 && (
          <Card className="border-dashed border-border/50">
            <CardContent className="p-6 text-center">
              <Zap className="h-10 w-10 text-brand/30 mx-auto mb-3" />
              <p className="font-medium text-muted-foreground">Programa de convites pronto</p>
              <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
                Quando os usuários começarem a convidar amigos, o ranking e as métricas de conversão aparecerão aqui automaticamente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
