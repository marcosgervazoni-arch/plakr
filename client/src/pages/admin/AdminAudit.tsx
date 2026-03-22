import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Ban,
  Bell,
  ClipboardList,
  Crown,
  FileText,
  Import,
  Loader2,
  Megaphone,
  Search,
  Settings,
  Shield,
  Trash2,
  UserX,
} from "lucide-react";
import { useState } from "react";

// Mapeamento de ações para labels legíveis e ícones
const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  block_user: { label: "Usuário bloqueado", icon: Ban, color: "border-red-400/30 text-red-400" },
  unblock_user: { label: "Usuário desbloqueado", icon: Shield, color: "border-green-400/30 text-green-400" },
  promote_admin: { label: "Promovido a Admin", icon: Crown, color: "border-yellow-400/30 text-yellow-400" },
  demote_admin: { label: "Rebaixado de Admin", icon: UserX, color: "border-orange-400/30 text-orange-400" },
  remove_user: { label: "Usuário removido", icon: Trash2, color: "border-red-400/30 text-red-400" },
  send_notification: { label: "Notificação enviada", icon: Bell, color: "border-blue-400/30 text-blue-400" },
  broadcast: { label: "Broadcast enviado", icon: Megaphone, color: "border-blue-400/30 text-blue-400" },
  delete_pool: { label: "Bolão excluído", icon: Trash2, color: "border-red-400/30 text-red-400" },
  update_settings: { label: "Configurações atualizadas", icon: Settings, color: "border-brand/30 text-brand" },
  update_platform_settings: { label: "Config. plataforma atualizadas", icon: Settings, color: "border-brand/30 text-brand" },
  import_games: { label: "Jogos importados", icon: Import, color: "border-purple-400/30 text-purple-400" },
  recalculate_pool: { label: "Pontos recalculados", icon: FileText, color: "border-green-400/30 text-green-400" },
  set_result: { label: "Resultado registrado", icon: FileText, color: "border-green-400/30 text-green-400" },
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  pool: "Bolão",
  platform: "Plataforma",
  platform_settings: "Configurações",
  tournament: "Campeonato",
  game: "Jogo",
};

export default function AdminAudit() {
  const [search, setSearch] = useState("");
  const { data: logs, isLoading } = trpc.platform.getAuditLogs.useQuery({ limit: 200 });

  const filtered = (logs ?? []).filter((log) => {
    if (!search) return true;
    const meta = ACTION_META[log.action];
    const label = meta?.label ?? log.action;
    return label.toLowerCase().includes(search.toLowerCase()) || log.action.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <AdminLayout activeSection="audit">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand/10">
            <ClipboardList className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Logs de Auditoria</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Histórico completo de ações administrativas</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filtrar por ação..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => {
              const meta = ACTION_META[log.action];
              const Icon = meta?.icon ?? Shield;
              const color = meta?.color ?? "border-muted text-muted-foreground";
              const label = meta?.label ?? log.action;
              const entityLabel = log.entityType ? ENTITY_LABELS[log.entityType] ?? log.entityType : null;

              return (
                <Card key={log.id} className="border-border/50">
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`text-xs ${color}`}>
                          {label}
                        </Badge>
                        {entityLabel && log.entityId && (
                          <span className="text-xs text-muted-foreground">
                            {entityLabel} #{log.entityId}
                          </span>
                        )}
                      </div>
                      {log.details && (
                        <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                          {typeof log.details === "object"
                            ? Object.entries(log.details as Record<string, unknown>)
                                .map(([k, v]) => `${k}: ${v}`)
                                .join(" · ")
                            : String(log.details)}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Admin <span className="font-mono">#{log.adminId}</span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {search ? "Nenhum log encontrado para este filtro." : "Nenhum log de auditoria ainda."}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
