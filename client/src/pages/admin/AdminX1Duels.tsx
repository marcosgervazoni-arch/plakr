/**
 * AdminX1Duels — Painel de gestão de Duelos (Vem pro X1)
 *
 * Funcionalidades:
 *  - Cards de estatísticas globais (total, pendentes, ativos, concluídos, expirados)
 *  - Tabela paginada com filtros por status
 *  - Ação de cancelamento forçado com motivo
 *  - Link para o detalhe do duelo
 */

import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Swords,
  Clock,
  Trophy,
  XCircle,
  Minus,
  ChevronLeft,
  ChevronRight,
  Ban,
  ExternalLink,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "wouter";

type StatusFilter = "all" | "pending" | "active" | "concluded" | "expired" | "declined" | "cancelled";

const STATUS_CONFIG = {
  pending: { label: "Aguardando", icon: Clock, className: "bg-amber-500/10 text-amber-400 border-amber-500/20" },
  active: { label: "Em andamento", icon: Swords, className: "bg-blue-500/10 text-blue-400 border-blue-500/20" },
  concluded: { label: "Concluído", icon: Trophy, className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" },
  expired: { label: "Expirado", icon: XCircle, className: "bg-muted/50 text-muted-foreground border-border/30" },
  declined: { label: "Recusado", icon: XCircle, className: "bg-red-500/10 text-red-400 border-red-500/20" },
  cancelled: { label: "Cancelado", icon: Minus, className: "bg-muted/50 text-muted-foreground border-border/30" },
};

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  next_round: "Próxima rodada",
  next_phase: "Próxima fase",
  full_tournament: "Torneio completo",
  next_game: "Próximo jogo",
  specific_game: "Jogo específico",
  top_scorer: "Artilheiro",
  champion: "Campeão",
};

export default function AdminX1Duels() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const [cancelDialog, setCancelDialog] = useState<{ open: boolean; challengeId: number; reason: string } | null>(null);

  const { data: stats, refetch: refetchStats } = trpc.x1.adminStats.useQuery();
  const { data, isLoading, refetch } = trpc.x1.adminList.useQuery(
    { status: statusFilter, page, pageSize: 20 },
    { placeholderData: (prev: any) => prev }
  );

  const forceCancel = trpc.x1.adminForceCancel.useMutation({
    onSuccess: () => {
      toast.success("Duelo cancelado com sucesso.");
      setCancelDialog(null);
      refetch();
      refetchStats();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleStatusChange = (v: string) => {
    setStatusFilter(v as StatusFilter);
    setPage(1);
  };

  const statCards = [
    { label: "Total", value: stats?.total ?? 0, color: "text-foreground", icon: Swords },
    { label: "Pendentes", value: stats?.pending ?? 0, color: "text-amber-400", icon: Clock },
    { label: "Ativos", value: stats?.active ?? 0, color: "text-blue-400", icon: Swords },
    { label: "Concluídos", value: stats?.concluded ?? 0, color: "text-emerald-400", icon: Trophy },
    { label: "Expirados", value: stats?.expired ?? 0, color: "text-muted-foreground", icon: XCircle },
  ];

  return (
    <AdminLayout activeSection="x1-duels">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Swords className="w-5 h-5 text-primary" />
              Duelos X1
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Gestão e moderação de todos os desafios da plataforma
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => { refetch(); refetchStats(); }}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Atualizar
          </Button>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {statCards.map((s) => {
            const Icon = s.icon;
            return (
              <div
                key={s.label}
                className="bg-card border border-border/40 rounded-xl p-4 text-center cursor-pointer hover:border-border/60 transition-all"
                onClick={() => {
                  if (s.label !== "Total") {
                    handleStatusChange(s.label.toLowerCase().replace("ó", "o").replace("ê", "e").replace("í", "i"));
                  } else {
                    handleStatusChange("all");
                  }
                }}
              >
                <Icon className={`w-5 h-5 mx-auto mb-1.5 ${s.color}`} />
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            );
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-48 h-9">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="pending">Aguardando</SelectItem>
              <SelectItem value="active">Em andamento</SelectItem>
              <SelectItem value="concluded">Concluídos</SelectItem>
              <SelectItem value="expired">Expirados</SelectItem>
              <SelectItem value="declined">Recusados</SelectItem>
              <SelectItem value="cancelled">Cancelados</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground ml-auto">
            {data?.total ?? 0} resultado(s)
          </span>
        </div>

        {/* Tabela */}
        <div className="bg-card border border-border/40 rounded-xl overflow-hidden">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !data?.items.length ? (
            <div className="text-center py-16">
              <Swords className="w-10 h-10 mx-auto mb-3 opacity-15" />
              <p className="text-sm text-muted-foreground">Nenhum duelo encontrado.</p>
            </div>
          ) : (
            <>
              {/* Header da tabela */}
              <div className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 px-4 py-2.5 border-b border-border/30 text-xs font-medium text-muted-foreground">
                <span>Desafiante</span>
                <span>Desafiado</span>
                <span>Bolão / Tipo</span>
                <span>Status</span>
                <span>Ações</span>
              </div>

              {/* Linhas */}
              <div className="divide-y divide-border/20">
                {data.items.map((c) => {
                  const statusCfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.cancelled;
                  const StatusIcon = statusCfg.icon;
                  const canCancel = c.status === "pending" || c.status === "active";

                  return (
                    <div
                      key={c.id}
                      className="grid grid-cols-[1fr_1fr_1fr_auto_auto] gap-3 px-4 py-3 items-center hover:bg-muted/20 transition-colors"
                    >
                      {/* Desafiante */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(c.challenger as any)?.name ?? `#${c.challengerId}`}
                        </p>
                        {c.status !== "pending" && (
                          <p className="text-xs text-muted-foreground">
                            {c.challengerPoints ?? 0} pts
                          </p>
                        )}
                      </div>

                      {/* Desafiado */}
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {(c.challenged as any)?.name ?? `#${c.challengedId}`}
                        </p>
                        {c.status !== "pending" && (
                          <p className="text-xs text-muted-foreground">
                            {c.challengedPoints ?? 0} pts
                          </p>
                        )}
                      </div>

                      {/* Bolão / Tipo */}
                      <div className="min-w-0">
                        <p className="text-xs text-muted-foreground truncate">
                          {(c.pool as any)?.name ?? `Bolão #${c.poolId}`}
                        </p>
                        <p className="text-xs font-medium truncate">
                          {CHALLENGE_TYPE_LABELS[c.challengeType] ?? c.challengeType}
                        </p>
                        <p className="text-[10px] text-muted-foreground/60">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                        </p>
                      </div>

                      {/* Status */}
                      <Badge className={`text-[10px] gap-1 py-0 h-5 shrink-0 ${statusCfg.className}`}>
                        <StatusIcon className="w-2.5 h-2.5" />
                        {statusCfg.label}
                      </Badge>

                      {/* Ações */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Link href={`/x1/${c.id}`}>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            title="Ver detalhe"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </Link>
                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            title="Cancelar duelo"
                            onClick={() => setCancelDialog({ open: true, challengeId: c.id, reason: "" })}
                          >
                            <Ban className="w-3.5 h-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Paginação */}
        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="gap-1.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {data.totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1.5"
            >
              Próxima
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Dialog: cancelar duelo */}
      {cancelDialog && (
        <Dialog open={cancelDialog.open} onOpenChange={(o) => !o && setCancelDialog(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Cancelar Duelo #{cancelDialog.challengeId}
              </DialogTitle>
              <DialogDescription>
                Esta ação é irreversível. O duelo será marcado como cancelado e os participantes serão notificados.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <label className="text-sm font-medium">Motivo (opcional)</label>
              <Input
                placeholder="Ex: Violação das regras, solicitação dos participantes..."
                value={cancelDialog.reason}
                onChange={(e) => setCancelDialog({ ...cancelDialog, reason: e.target.value })}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialog(null)}>
                Voltar
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  forceCancel.mutate({
                    challengeId: cancelDialog.challengeId,
                    reason: cancelDialog.reason || undefined,
                  })
                }
                disabled={forceCancel.isPending}
              >
                {forceCancel.isPending ? "Cancelando..." : "Confirmar cancelamento"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </AdminLayout>
  );
}
