import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  DollarSign, TrendingDown, TrendingUp, Crown, AlertTriangle,
  ExternalLink, Gift, XCircle, Search, RefreshCw,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; className: string }> = {
    active: { label: "Ativa", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" },
    expiring_soon: { label: "Vence em 7 dias", className: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30" },
    expired: { label: "Expirada", className: "bg-red-500/15 text-red-400 border-red-500/30" },
  };
  const s = map[status] ?? map.active;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${s.className}`}>
      {s.label}
    </span>
  );
}

function GrantProModal({
  userId, poolName, open, onClose,
}: {
  userId: number; poolName: string; open: boolean; onClose: () => void;
}) {
  const [days, setDays] = useState(30);
  const [reason, setReason] = useState("");
  const utils = trpc.useUtils();

  const grantMutation = trpc.adminDashboard.grantPoolPro.useMutation({
    onSuccess: () => {
      toast.success(`Plano Pro concedido ao dono do bolão "${poolName}" por ${days} dias.`);
      utils.adminDashboard.getSubscriptionStats.invalidate();
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-brand" />
            Conceder / Estender Plano Pro
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div>
            <p className="text-sm text-muted-foreground">Bolão</p>
            <p className="font-medium">{poolName}</p>
          </div>
          <div className="space-y-1.5">
            <Label>Duração (dias)</Label>
            <Input type="number" min={1} max={365} value={days} onChange={(e) => setDays(Number(e.target.value))} />
            <p className="text-xs text-muted-foreground">
              Expira em: {format(new Date(Date.now() + days * 86400000), "dd/MM/yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Motivo (opcional)</Label>
            <Input placeholder="Ex: Compensação por problema técnico" value={reason} onChange={(e) => setReason(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => grantMutation.mutate({ userId, durationDays: days, reason })} disabled={grantMutation.isPending}>
            {grantMutation.isPending ? "Concedendo..." : "Conceder Pro"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function AdminSubscriptions() {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "expiring_soon" | "expired">("all");
  const [grantModal, setGrantModal] = useState<{ userId: number; userName: string } | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<{ userId: number; userName: string } | null>(null);
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.adminDashboard.getSubscriptionStats.useQuery();

  const revokeMutation = trpc.adminDashboard.revokePoolPro.useMutation({
    onSuccess: () => {
      toast.success("Plano Pro revogado.");
      utils.adminDashboard.getSubscriptionStats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const filtered = (data?.subscriptions ?? []).filter((s) => {
    const matchSearch = !search || s.userName.toLowerCase().includes(search.toLowerCase());
    const matchFilter = filter === "all" || s.status === filter;
    return matchSearch && matchFilter;
  });

  const fmtBrl = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 0 });

  const statCards = data
    ? [
        { title: "MRR", value: fmtBrl(data.mrrBrl), sub: "Receita mensal recorrente", icon: DollarSign, color: "text-emerald-400", bg: "bg-emerald-500/10" },
        { title: "ARR", value: fmtBrl(data.arrBrl), sub: "Receita anual projetada", icon: TrendingUp, color: "text-brand", bg: "bg-brand/10" },
        { title: "Ticket Médio", value: fmtBrl(data.ticketMedio), sub: "Por bolão Pro/mês", icon: Crown, color: "text-yellow-400", bg: "bg-yellow-500/10" },
        { title: "Churn Rate", value: `${data.churnRate}%`, sub: `${data.churned} cancelamentos este mês`, icon: TrendingDown, color: data.churnRate > 10 ? "text-red-400" : "text-muted-foreground", bg: "bg-muted/20" },
      ]
    : [];

  return (
    <AdminLayout activeSection="subscriptions">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">Assinaturas Pro</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gestão financeira e de planos</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => utils.adminDashboard.getSubscriptionStats.invalidate()}>
            <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
            Atualizar
          </Button>
        </div>

        {data && data.expiringSoon > 0 && (
          <div className="flex items-center gap-3 px-4 py-2.5 rounded-lg border bg-yellow-500/10 border-yellow-500/30">
            <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
            <span className="text-sm font-medium text-yellow-400">
              {data.expiringSoon} bolão(ões) Pro vencem nos próximos 7 dias
            </span>
          </div>
        )}

        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/50"><CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-7 w-24 mb-1" />
                <Skeleton className="h-3 w-28" />
              </CardContent></Card>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statCards.map((c) => (
              <Card key={c.title} className="border-border/50">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">{c.title}</p>
                      <p className={`text-xl font-bold font-mono mt-1 ${c.color}`}>{c.value}</p>
                      <p className="text-xs text-muted-foreground mt-1 truncate">{c.sub}</p>
                    </div>
                    <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center shrink-0 ml-2`}>
                      <c.icon className={`h-4 w-4 ${c.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="text-base">Bolões Pro ({data?.totalPro ?? 0})</CardTitle>
              <div className="flex items-center gap-1 flex-wrap">
                {(["all", "active", "expiring_soon", "expired"] as const).map((f) => (
                  <Button key={f} variant={filter === f ? "default" : "ghost"} size="sm" className="text-xs h-7 px-2" onClick={() => setFilter(f)}>
                    {{ all: "Todos", active: "Ativos", expiring_soon: "Vencendo", expired: "Expirados" }[f]}
                  </Button>
                ))}
              </div>
            </div>
            <div className="relative mt-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome do bolão ou organizador..." className="pl-9 h-9" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}</div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">Nenhuma assinatura encontrada.</div>
            ) : (
              <div className="divide-y divide-border/30">
                {filtered.map((sub) => (
                  <div key={sub.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/20 transition-colors">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm truncate">{sub.userName}</span>
                        <StatusBadge status={sub.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <a href={`/profile/${sub.userId}`} target="_blank" rel="noopener noreferrer" className="text-xs text-muted-foreground hover:text-primary transition-colors">ID: {sub.userId}</a>
                        {sub.planExpiresAt && (
                          <span className="text-xs text-muted-foreground">
                            Expira: {format(new Date(sub.planExpiresAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {sub.stripeSubscriptionId && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => window.open(`https://dashboard.stripe.com/subscriptions/${sub.stripeSubscriptionId}`, "_blank")}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1" />Stripe
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-brand hover:text-brand" onClick={() => setGrantModal({ userId: sub.userId, userName: sub.userName })}>
                        <Gift className="h-3.5 w-3.5 mr-1" />Estender
                      </Button>
                      {sub.status !== "expired" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-xs text-red-400 hover:text-red-400"
                          onClick={() => setRevokeTarget({ userId: sub.userId, userName: sub.userName })}
                          disabled={revokeMutation.isPending}
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />Revogar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-muted-foreground text-center">
          Valores de MRR são estimativas baseadas nos dados locais. Para dados auditáveis, acesse o{" "}
          <a href="https://dashboard.stripe.com" target="_blank" rel="noopener noreferrer" className="text-brand underline">Stripe Dashboard</a>.
        </p>
      </div>

      {grantModal && (
        <GrantProModal userId={grantModal.userId} poolName={grantModal.userName} open={true} onClose={() => setGrantModal(null)} />
      )}

      {/* AlertDialog de confirmação para revogar Pro */}
      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar plano Pro?</AlertDialogTitle>
            <AlertDialogDescription>
              O usuário <strong>&ldquo;{revokeTarget?.userName}&rdquo;</strong> perderá imediatamente o acesso
              a todos os recursos Pro. Esta ação não pode ser desfeita automaticamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => {
                if (revokeTarget) revokeMutation.mutate({ userId: revokeTarget.userId });
                setRevokeTarget(null);
              }}
            >
              Revogar Pro
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
