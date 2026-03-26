import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  Award,
  Ban,
  Bell,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  Crown,
  Download,
  FileText,
  Gift,
  Import,
  Info,
  Loader2,
  Megaphone,
  Search,
  Settings,
  Shield,
  Trash2,
  UserX,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

// Mapeamento de ações para labels legíveis e ícones
const ACTION_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  block_user: { label: "Usuário bloqueado", icon: Ban, color: "border-red-400/30 text-red-400" },
  unblock_user: { label: "Usuário desbloqueado", icon: Shield, color: "border-green-400/30 text-green-400" },
  promote_admin: { label: "Promovido a Admin", icon: Crown, color: "border-yellow-400/30 text-yellow-400" },
  demote_admin: { label: "Rebaixado de Admin", icon: UserX, color: "border-primary/30 text-primary" },
  remove_user: { label: "Usuário removido", icon: Trash2, color: "border-red-400/30 text-red-400" },
  send_notification: { label: "Notificação enviada", icon: Bell, color: "border-blue-400/30 text-blue-400" },
  broadcast: { label: "Broadcast enviado", icon: Megaphone, color: "border-blue-400/30 text-blue-400" },
  delete_pool: { label: "Bolão excluído", icon: Trash2, color: "border-red-400/30 text-red-400" },
  delete_tournament: { label: "Campeonato excluído", icon: Trash2, color: "border-red-400/30 text-red-400" },
  delete_game: { label: "Jogo excluído", icon: Trash2, color: "border-red-400/30 text-red-400" },
  delete_team: { label: "Time excluído", icon: Trash2, color: "border-red-400/30 text-red-400" },
  update_settings: { label: "Configurações atualizadas", icon: Settings, color: "border-brand/30 text-brand" },
  update_platform_settings: { label: "Config. plataforma atualizadas", icon: Settings, color: "border-brand/30 text-brand" },
  import_games: { label: "Jogos importados", icon: Import, color: "border-purple-400/30 text-purple-400" },
  recalculate_pool: { label: "Pontos recalculados", icon: FileText, color: "border-green-400/30 text-green-400" },
  set_result: { label: "Resultado registrado", icon: FileText, color: "border-green-400/30 text-green-400" },
  generate_vapid:    { label: "VAPID keys geradas",       icon: Shield, color: "border-yellow-400/30 text-yellow-400" },
  // Badges
  "badges.create":       { label: "Badge criado",             icon: Award, color: "border-primary/30 text-primary" },
  "badges.update":       { label: "Badge atualizado",         icon: Award, color: "border-primary/30 text-primary" },
  "badges.delete":       { label: "Badge excluído",           icon: Trash2, color: "border-red-400/30 text-red-400" },
  "badges.assignManual": { label: "Badge atribuído (manual)", icon: Gift,  color: "border-purple-400/30 text-purple-400" },
  "badges.revoke":       { label: "Badge revogado",           icon: Award, color: "border-primary/30 text-primary" },
};

const ENTITY_LABELS: Record<string, string> = {
  user: "Usuário",
  pool: "Bolão",
  platform: "Plataforma",
  platform_settings: "Configurações",
  tournament: "Campeonato",
  game: "Jogo",
  team: "Time",
  badge: "Badge",
  user_badge: "Conquista",
};

const LEVEL_META: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  info: { label: "Info", icon: Info, color: "text-blue-400 border-blue-400/30" },
  warn: { label: "Aviso", icon: AlertTriangle, color: "text-yellow-400 border-yellow-400/30" },
  error: { label: "Erro", icon: XCircle, color: "text-red-400 border-red-400/30" },
};

type LogEntry = {
  id: number;
  adminId: number;
  adminName?: string;
  action: string;
  entityType?: string | null;
  entityId?: number | null;
  details?: Record<string, unknown> | null;
  previousValue?: Record<string, unknown> | null;
  correlationId?: string | null;
  level?: string | null;
  ipAddress?: string | null;
  poolId?: number | null;
  createdAt: Date;
};

function DiffView({ before, after }: { before: Record<string, unknown>; after: Record<string, unknown> }) {
  const allKeys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));
  const changed = allKeys.filter((k) => JSON.stringify(before[k]) !== JSON.stringify(after[k]));
  if (changed.length === 0) return <p className="text-xs text-muted-foreground">Sem alterações detectadas.</p>;

  return (
    <div className="space-y-1">
      {changed.map((key) => (
        <div key={key} className="text-xs font-mono">
          <span className="text-muted-foreground">{key}: </span>
          {before[key] !== undefined && (
            <span className="text-red-400 line-through mr-1">{JSON.stringify(before[key])}</span>
          )}
          {after[key] !== undefined && (
            <span className="text-green-400">{JSON.stringify(after[key])}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function LogCard({ log }: { log: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const meta = ACTION_META[log.action];
  const Icon = meta?.icon ?? Shield;
  const color = meta?.color ?? "border-muted text-muted-foreground";
  const label = meta?.label ?? log.action;
  const entityLabel = log.entityType ? ENTITY_LABELS[log.entityType] ?? log.entityType : null;
  const levelMeta = LEVEL_META[log.level ?? "info"];
  const LevelIcon = levelMeta?.icon ?? Info;
  const hasDetails = log.details || log.previousValue || log.correlationId || log.ipAddress;

  return (
    <Card className={`border-border/50 ${log.level === "error" ? "border-red-400/20" : log.level === "warn" ? "border-yellow-400/20" : ""}`}>
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          {/* Ícone da ação */}
          <div className={`w-8 h-8 rounded-full bg-muted/30 flex items-center justify-center shrink-0`}>
            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>

          {/* Conteúdo principal */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${color}`}>
                {label}
              </Badge>
              {log.level && log.level !== "info" && (
                <Badge variant="outline" className={`text-xs ${levelMeta?.color}`}>
                  <LevelIcon className="h-3 w-3 mr-1" />
                  {levelMeta?.label}
                </Badge>
              )}
              {entityLabel && log.entityId && (
                <span className="text-xs text-muted-foreground">
                  {entityLabel} #{log.entityId}
                </span>
              )}
            </div>

            {/* Resumo dos details */}
            {log.details && !expanded && (
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                {typeof log.details === "object"
                  ? Object.entries(log.details as Record<string, unknown>)
                      .slice(0, 3)
                      .map(([k, v]) => `${k}: ${v}`)
                      .join(" · ")
                  : String(log.details)}
              </p>
            )}

            {/* correlationId e IP em linha */}
            {(log.correlationId || log.ipAddress) && (
              <div className="flex items-center gap-3 mt-0.5">
                {log.correlationId && (
                  <span className="text-xs text-muted-foreground font-mono">
                    corr: {log.correlationId.slice(0, 8)}…
                  </span>
                )}
                {log.ipAddress && (
                  <span className="text-xs text-muted-foreground font-mono">
                    ip: {log.ipAddress}
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Data e admin */}
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            <p className="text-xs text-muted-foreground">
              {format(new Date(log.createdAt), "dd/MM HH:mm", { locale: ptBR })}
            </p>
            <p className="text-xs text-muted-foreground">
              {log.adminName ?? `Admin #${log.adminId}`}
            </p>
            {hasDetails && (
              <Button
                variant="ghost"
                size="sm"
                className="h-5 px-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={() => setExpanded(!expanded)}
              >
                {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              </Button>
            )}
          </div>
        </div>

        {/* Painel expandido */}
        {expanded && hasDetails && (
          <div className="mt-3 pt-3 border-t border-border/30 space-y-3">
            {log.correlationId && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Correlation ID</p>
                <p className="text-xs font-mono text-foreground/70">{log.correlationId}</p>
              </div>
            )}
            {log.ipAddress && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Endereço IP</p>
                <p className="text-xs font-mono text-foreground/70">{log.ipAddress}</p>
              </div>
            )}
            {log.previousValue && log.details && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Diff (antes → depois)</p>
                <div className="bg-muted/20 rounded p-2">
                  <DiffView
                    before={log.previousValue as Record<string, unknown>}
                    after={log.details as Record<string, unknown>}
                  />
                </div>
              </div>
            )}
            {log.details && !(log.previousValue) && (
              <div>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Detalhes</p>
                <pre className="text-xs font-mono text-foreground/70 bg-muted/20 rounded p-2 overflow-auto max-h-40">
                  {JSON.stringify(log.details, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminAudit() {
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState<"all" | "info" | "warn" | "error">("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allLogs, setAllLogs] = useState<LogEntry[]>([]);

  const { data: page, isLoading, isFetching } = trpc.adminDashboard.getAuditLogsPaged.useQuery(
    { limit: 50, cursor, level: levelFilter },
  );

  useEffect(() => {
    if (!page) return;
    const newLogs = (page.logs ?? []) as LogEntry[];
    if (!cursor) {
      setAllLogs(newLogs);
    } else {
      setAllLogs((prev) => {
        const existingIds = new Set(prev.map(l => l.id));
        return [...prev, ...newLogs.filter(l => !existingIds.has(l.id))];
      });
    }
  }, [page]);

  const handleLevelChange = (v: "all" | "info" | "warn" | "error") => {
    setLevelFilter(v);
    setCursor(undefined);
    setAllLogs([]);
  };

  const filtered = allLogs.filter((log) => {
    if (entityFilter !== "all" && log.entityType !== entityFilter) return false;
    if (search) {
      const meta = ACTION_META[log.action];
      const label = meta?.label ?? log.action;
      const searchLower = search.toLowerCase();
      return (
        label.toLowerCase().includes(searchLower) ||
        log.action.toLowerCase().includes(searchLower) ||
        (log.correlationId ?? "").toLowerCase().includes(searchLower) ||
        (log.ipAddress ?? "").toLowerCase().includes(searchLower) ||
        (log.adminName ?? "").toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  const errorCount = allLogs.filter((l) => l.level === "error").length;
  const warnCount = allLogs.filter((l) => l.level === "warn").length;

  return (
    <AdminLayout activeSection="audit">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand/10">
            <ClipboardList className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Logs de Auditoria</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Histórico completo de ações administrativas com structured logging</p>
          </div>
        </div>

        {/* Resumo de alertas */}
        {(errorCount > 0 || warnCount > 0) && (
          <div className="flex gap-3">
            {errorCount > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-red-400/20 bg-red-400/5 cursor-pointer"
                onClick={() => setLevelFilter("error")}
              >
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm text-red-400 font-medium">{errorCount} erro{errorCount > 1 ? "s" : ""}</span>
              </div>
            )}
            {warnCount > 0 && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-yellow-400/20 bg-yellow-400/5 cursor-pointer"
                onClick={() => setLevelFilter("warn")}
              >
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-yellow-400 font-medium">{warnCount} aviso{warnCount > 1 ? "s" : ""}</span>
              </div>
            )}
          </div>
        )}

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por ação, correlation ID ou IP..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={levelFilter} onValueChange={(v) => handleLevelChange(v as typeof levelFilter)}>
            <SelectTrigger className="w-36 h-10">
              <SelectValue placeholder="Nível" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os níveis</SelectItem>
              <SelectItem value="info">Info</SelectItem>
              <SelectItem value="warn">Aviso</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
          <Select value={entityFilter} onValueChange={setEntityFilter}>
            <SelectTrigger className="w-40 h-10">
              <SelectValue placeholder="Entidade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as entidades</SelectItem>
              <SelectItem value="user">Usuário</SelectItem>
              <SelectItem value="pool">Bolão</SelectItem>
              <SelectItem value="tournament">Campeonato</SelectItem>
              <SelectItem value="game">Jogo</SelectItem>
              <SelectItem value="platform_settings">Configurações</SelectItem>
            </SelectContent>
          </Select>
          {(levelFilter !== "all" || entityFilter !== "all" || search) && (
            <Button
              variant="outline"
              size="sm"
              className="h-10"
              onClick={() => { setLevelFilter("all"); setEntityFilter("all"); setSearch(""); }}
            >
              Limpar filtros
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-10 ml-auto"
            disabled={filtered.length === 0}
            onClick={() => {
              const header = "ID,Admin,Ação,Tipo,Nível,Data";
              const rows = filtered.map(l => [
                l.id,
                `"${(l.adminName ?? `Admin #${l.adminId}`).replace(/"/g, '""')}"`,
                `"${(ACTION_META[l.action]?.label ?? l.action).replace(/"/g, '""')}"`,
                l.entityType ?? "",
                l.level ?? "info",
                l.createdAt ? new Date(l.createdAt).toLocaleString("pt-BR") : "",
              ].join(","));
              const csv = [header, ...rows].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `logs-auditoria-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar CSV
          </Button>
        </div>

        {/* Contagem */}
        <p className="text-xs text-muted-foreground">
          {filtered.length} de {allLogs.length} carregados
          {page?.nextCursor && " (há mais)"}
        </p>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((log) => (
              <LogCard key={log.id} log={log as LogEntry} />
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <ClipboardList className="h-8 w-8 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {search || levelFilter !== "all" || entityFilter !== "all"
                    ? "Nenhum log encontrado para os filtros aplicados."
                    : "Nenhum log de auditoria ainda."}
                </p>
              </div>
            )}
            {/* Carregar mais */}
            {page?.nextCursor && (
              <div className="flex justify-center pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isFetching}
                  onClick={() => setCursor(page.nextCursor ?? undefined)}
                >
                  {isFetching ? (
                    <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Carregando...</>
                  ) : (
                    <>Carregar mais 50 registros</>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
