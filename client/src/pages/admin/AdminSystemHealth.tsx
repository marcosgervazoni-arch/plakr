import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Shield, Mail, Bell, AlertCircle, CheckCircle2, RefreshCw,
  Clock, XCircle, Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

function StatusDot({ status }: { status: "ok" | "warning" | "error" }) {
  const map = {
    ok: "bg-emerald-400",
    warning: "bg-yellow-400",
    error: "bg-red-400 animate-pulse",
  };
  return <span className={`inline-block w-2.5 h-2.5 rounded-full ${map[status]}`} />;
}

function StatusBadge({ status }: { status: "ok" | "warning" | "error" }) {
  const map = {
    ok: { label: "Operacional", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    warning: { label: "Atenção", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    error: { label: "Problema", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  }[status];
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${map.className}`}>
      {map.label}
    </span>
  );
}

export default function AdminSystemHealth() {
  const { data: health, isLoading, refetch } = trpc.adminDashboard.getSystemHealth.useQuery();

  const emailStatus: "ok" | "warning" | "error" =
    (health?.emailQueue.failed ?? 0) > 0 ? "error" :
    (health?.emailQueue.pending ?? 0) > 20 ? "warning" : "ok";

  const overallStatus: "ok" | "warning" | "error" =
    emailStatus === "error" || (health?.recentErrors.length ?? 0) > 5 ? "error" :
    emailStatus === "warning" || (health?.recentErrors.length ?? 0) > 0 ? "warning" : "ok";

  return (
    <AdminLayout activeSection="system">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand" />
              Saúde do Sistema
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Monitoramento de jobs, filas e erros operacionais
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!isLoading && (
              <div className="flex items-center gap-2">
                <StatusDot status={overallStatus} />
                <StatusBadge status={overallStatus} />
              </div>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Cards de status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Fila de Email */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand" />
                  Fila de E-mail
                </span>
                {!isLoading && <StatusBadge status={emailStatus} />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Pendentes</span>
                    <span className={`font-mono font-medium ${(health?.emailQueue.pending ?? 0) > 10 ? "text-yellow-400" : ""}`}>
                      {health?.emailQueue.pending ?? 0}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Enviados (24h)</span>
                    <span className="font-mono font-medium text-emerald-400">{health?.emailQueue.sentToday ?? 0}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Falhas</span>
                    <span className={`font-mono font-medium ${(health?.emailQueue.failed ?? 0) > 0 ? "text-red-400" : ""}`}>
                      {health?.emailQueue.failed ?? 0}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                    Processado a cada 5 minutos
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Push Notifications */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Bell className="h-4 w-4 text-brand" />
                  Push Notifications
                </span>
                {!isLoading && <StatusBadge status="ok" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Assinaturas ativas</span>
                    <span className="font-mono font-medium">{health?.pushSubscriptions ?? 0}</span>
                  </div>

                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                    Enviadas via Web Push API
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Jobs de Cron */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-brand" />
                  Jobs Agendados
                </span>
                {!isLoading && <StatusBadge status="ok" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/4" />
                </div>
              ) : (
                <>
                  {[
                    { name: "Fila de E-mail", interval: "5 min" },
                    { name: "Lembretes de Palpite", interval: "1h" },
                    { name: "Expiração de Planos", interval: "24h" },
                  ].map((job: {name: string; interval: string}) => (
                    <div key={job.name} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{job.name}</span>
                      <span className="text-xs font-mono text-muted-foreground">{job.interval}</span>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                    Todos os jobs em execução
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Erros recentes */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-brand" />
                Erros Recentes (últimas 24h)
              </span>
              {!isLoading && (
                <Badge
                  variant="outline"
                  className={
                    (health?.recentErrors.length ?? 0) > 0
                      ? "border-red-500/30 text-red-400 bg-red-500/10"
                      : "border-emerald-500/30 text-emerald-400 bg-emerald-500/10"
                  }
                >
                  {health?.recentErrors.length ?? 0} erro(s)
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (health?.recentErrors.length ?? 0) === 0 ? (
              <div className="p-8 text-center">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto mb-2" />
                <p className="text-sm font-medium text-emerald-400">Nenhum erro nas últimas 24h</p>
                <p className="text-xs text-muted-foreground mt-1">Sistema operando normalmente</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {health?.recentErrors.map((err, i) => (
                  <div key={i} className="px-4 py-3 flex items-start gap-3">
                    <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-red-400 truncate">{err.action}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {err.entityType ?? "sistema"} — {format(new Date(err.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Jogos pendentes de resultado */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-brand" />
                Jogos Pendentes de Resultado
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Acesse &quot;Resultados&quot; para ver jogos pendentes</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
