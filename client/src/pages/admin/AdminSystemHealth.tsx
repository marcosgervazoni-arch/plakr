import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Shield, Mail, Bell, AlertCircle, CheckCircle2, RefreshCw,
  Clock, XCircle, Activity, CreditCard, Megaphone, Zap, Timer,
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

function IntegrationRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm py-1">
      <div className="flex items-center gap-2">
        {ok
          ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
        <span className={ok ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      </div>
      {detail && <span className="text-xs text-muted-foreground font-mono">{detail}</span>}
    </div>
  );
}

function CronJobRow({
  name,
  interval,
  lastRunAt,
  lastRunSuccess,
  lastError,
  runCount,
}: {
  name: string;
  interval: string;
  lastRunAt: Date | string | null;
  lastRunSuccess: boolean | null;
  lastError: string | null;
  runCount: number;
}) {
  const status: "ok" | "warning" | "error" =
    lastRunSuccess === false ? "error" :
    lastRunAt === null ? "warning" : "ok";

  const lastRunDate = lastRunAt ? new Date(lastRunAt) : null;

  return (
    <div className="flex items-start justify-between py-2 border-b border-border/20 last:border-0">
      <div className="flex items-start gap-2 min-w-0">
        <StatusDot status={status} />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{name}</p>
          {lastError && (
            <p className="text-xs text-red-400 mt-0.5 truncate max-w-[220px]" title={lastError}>{lastError}</p>
          )}
          {!lastError && lastRunDate && (
            <p className="text-xs text-muted-foreground mt-0.5">
              Última execução: {formatDistanceToNow(lastRunDate, { addSuffix: true, locale: ptBR })}
            </p>
          )}
          {!lastRunDate && (
            <p className="text-xs text-muted-foreground mt-0.5">Aguardando primeira execução</p>
          )}
        </div>
      </div>
      <div className="text-right shrink-0 ml-2">
        <span className="text-xs font-mono text-muted-foreground">{interval}</span>
        <p className="text-xs text-muted-foreground">{runCount}x</p>
      </div>
    </div>
  );
}

export default function AdminSystemHealth() {
  const { data: health, isLoading, refetch } = trpc.adminDashboard.getSystemHealth.useQuery();

  const emailStatus: "ok" | "warning" | "error" =
    (health?.emailQueue.failed ?? 0) > 0 ? "error" :
    (health?.emailQueue.pending ?? 0) > 20 ? "warning" : "ok";

  const stripeStatus: "ok" | "warning" | "error" =
    !health?.integrations?.stripe?.keysConfigured ? "error" :
    !health?.integrations?.stripe?.webhookConfigured ? "warning" :
    !health?.integrations?.stripe?.pricesConfigured ? "warning" : "ok";

  const adsterraStatus: "ok" | "warning" | "error" =
    !health?.integrations?.adsterra?.configured ? "warning" :
    !health?.integrations?.adsterra?.enabled ? "warning" : "ok";

  const overallStatus: "ok" | "warning" | "error" =
    emailStatus === "error" || stripeStatus === "error" || (health?.recentErrors.length ?? 0) > 5 ? "error" :
    emailStatus === "warning" || stripeStatus === "warning" || adsterraStatus === "warning" || (health?.recentErrors.length ?? 0) > 0 ? "warning" : "ok";

  const cronJobs = health?.cronJobs ? Object.values(health.cronJobs) : [];

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
              Monitoramento de integrações, jobs e erros operacionais
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

        {/* ─── Integrações externas ─────────────────────────────────────────── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Stripe */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-brand" />
                  Stripe — Pagamentos
                </span>
                {!isLoading && <StatusBadge status={stripeStatus} />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-2/4" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  <IntegrationRow
                    label="Chaves de API"
                    ok={health?.integrations?.stripe?.keysConfigured ?? false}
                    detail={health?.integrations?.stripe?.isLive ? "Produção (pk_live_)" : "Teste (pk_test_)"}
                  />
                  <IntegrationRow
                    label="Webhook Secret"
                    ok={health?.integrations?.stripe?.webhookConfigured ?? false}
                    detail={health?.integrations?.stripe?.webhookConfigured ? "whsec_..." : "Não configurado"}
                  />
                  <IntegrationRow
                    label="Price IDs dos planos"
                    ok={health?.integrations?.stripe?.pricesConfigured ?? false}
                    detail={health?.integrations?.stripe?.pricesConfigured ? "Pro + Ilimitado" : "Incompleto"}
                  />
                  <IntegrationRow
                    label="Ambiente de produção"
                    ok={health?.integrations?.stripe?.isLive ?? false}
                    detail={health?.integrations?.stripe?.isLive ? "Live" : "Modo teste"}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          {/* Adsterra */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Megaphone className="h-4 w-4 text-brand" />
                  Adsterra — Anúncios
                </span>
                {!isLoading && <StatusBadge status={adsterraStatus} />}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <div className="space-y-0.5">
                  <IntegrationRow
                    label="Códigos configurados"
                    ok={health?.integrations?.adsterra?.configured ?? false}
                    detail={`${health?.integrations?.adsterra?.positionsConfigured ?? 0} posições`}
                  />
                  <IntegrationRow
                    label="Anúncios ativos"
                    ok={health?.integrations?.adsterra?.enabled ?? false}
                    detail={health?.integrations?.adsterra?.enabled ? "Exibindo" : "Desativado"}
                  />
                  <div className="pt-2 border-t border-border/20 mt-1">
                    <p className="text-xs text-muted-foreground">
                      Aprovação Adsterra: 24-72h após cadastro. Verifique o e-mail de confirmação.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Fila de Email + Push + Jobs ─────────────────────────────────── */}
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
                    <span className="text-muted-foreground">Enviados (total)</span>
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

          {/* Servidor */}
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand" />
                  Servidor
                </span>
                {!isLoading && <StatusBadge status="ok" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? (
                <Skeleton className="h-4 w-full" />
              ) : (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Hora do servidor</span>
                    <span className="font-mono text-xs">
                      {health?.serverTime
                        ? format(new Date(health.serverTime), "HH:mm:ss", { locale: ptBR })
                        : "--"}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Status</span>
                    <span className="text-emerald-400 text-xs font-medium">Online</span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1 border-t border-border/30">
                    Node.js + tRPC + MySQL
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ─── Cron Jobs detalhados ─────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Timer className="h-4 w-4 text-brand" />
              Jobs Agendados
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : cronJobs.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhum job registrado</p>
            ) : (
              <div>
                {cronJobs.map((job: any) => (
                  <CronJobRow
                    key={job.name}
                    name={job.name}
                    interval={job.interval}
                    lastRunAt={job.lastRunAt}
                    lastRunSuccess={job.lastRunSuccess}
                    lastError={job.lastError}
                    runCount={job.runCount}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ─── Erros recentes ───────────────────────────────────────────────── */}
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

        {/* ─── Jogos pendentes ──────────────────────────────────────────────── */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Activity className="h-4 w-4 text-brand" />
              Jogos Pendentes de Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <div className="flex items-center gap-2 text-emerald-400">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm">Acesse "Resultados" para ver jogos pendentes</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
