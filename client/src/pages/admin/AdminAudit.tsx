import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ClipboardList, Loader2, Shield } from "lucide-react";

const actionColors: Record<string, string> = {
  block_user: "border-red-400/30 text-red-400",
  unblock_user: "border-green-400/30 text-green-400",
  promote_admin: "border-yellow-400/30 text-yellow-400",
  broadcast: "border-blue-400/30 text-blue-400",
  delete_pool: "border-red-400/30 text-red-400",
  update_settings: "border-brand/30 text-brand",
  import_games: "border-purple-400/30 text-purple-400",
};

export default function AdminAudit() {
  const { data: logs, isLoading } = trpc.platform.getAuditLogs.useQuery({ limit: 100 });

  return (
    <AdminLayout activeSection="audit">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Auditoria</h1>
          <p className="text-muted-foreground text-sm mt-1">Histórico de ações administrativas</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {(logs ?? []).map((log) => (
              <Card key={log.id} className="border-border/50">
                <CardContent className="p-3 flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-muted/30 flex items-center justify-center shrink-0">
                    <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge
                        variant="outline"
                        className={`text-xs ${actionColors[log.action] ?? "border-muted text-muted-foreground"}`}
                      >
                        {log.action}
                      </Badge>
                      {log.entityType && (
                        <span className="text-xs text-muted-foreground">
                          {log.entityType} #{log.entityId}
                        </span>
                      )}
                    </div>
                    {log.details && (
                      <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                        {typeof log.details === "object" ? JSON.stringify(log.details) : String(log.details)}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">
                      {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
                    </p>
                    <p className="text-xs text-muted-foreground">Admin #{log.adminId}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(logs ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">Nenhum log de auditoria ainda.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
