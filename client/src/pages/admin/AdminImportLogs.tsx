import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileSpreadsheet,
  Loader2,
  XCircle,
} from "lucide-react";
import { useState, useEffect } from "react";

type ImportLog = {
  id: number;
  tournamentId: number | null;
  tournamentName: string | null;
  sheetUrl: string | null;
  status: string | null;
  gamesImported: number | null;
  gamesUpdated: number | null;
  errors: string | null;
  triggeredByName: string | null;
  createdAt: Date | null;
};

function StatusBadge({ status }: { status: string | null }) {
  if (status === "success") return (
    <Badge variant="outline" className="text-xs border-green-400/30 text-green-400">
      <CheckCircle2 className="h-3 w-3 mr-1" />Sucesso
    </Badge>
  );
  if (status === "error") return (
    <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">
      <XCircle className="h-3 w-3 mr-1" />Erro
    </Badge>
  );
  if (status === "partial") return (
    <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">
      <AlertTriangle className="h-3 w-3 mr-1" />Parcial
    </Badge>
  );
  return <Badge variant="outline" className="text-xs">{status ?? "—"}</Badge>;
}

function LogRow({ log }: { log: ImportLog }) {
  const [expanded, setExpanded] = useState(false);
  const hasErrors = log.errors && log.errors.trim().length > 0;

  return (
    <Card className={`border-border/50 ${log.status === "error" ? "border-red-400/20" : log.status === "partial" ? "border-yellow-400/20" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="h-4 w-4 text-brand" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">
                {log.tournamentName ?? `Campeonato #${log.tournamentId}`}
              </span>
              <StatusBadge status={log.status} />
            </div>
            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
              {(log.gamesImported ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {log.gamesImported} importados
                </span>
              )}
              {(log.gamesUpdated ?? 0) > 0 && (
                <span className="text-xs text-muted-foreground">
                  {log.gamesUpdated} atualizados
                </span>
              )}
              {log.triggeredByName && (
                <span className="text-xs text-muted-foreground">
                  por {log.triggeredByName}
                </span>
              )}
            </div>
          </div>
          <div className="text-right shrink-0 flex flex-col items-end gap-1">
            {log.createdAt && (
              <p className="text-xs text-muted-foreground">
                {format(new Date(log.createdAt), "dd/MM/yy HH:mm", { locale: ptBR })}
              </p>
            )}
            <div className="flex items-center gap-1">
              {log.sheetUrl && (
                <a
                  href={log.sheetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-brand hover:underline flex items-center gap-0.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3" />
                  Sheet
                </a>
              )}
              {hasErrors && (
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
        </div>
        {expanded && hasErrors && (
          <div className="mt-3 pt-3 border-t border-border/30">
            <p className="text-xs text-muted-foreground mb-1 font-medium">Erros encontrados</p>
            <pre className="text-xs font-mono text-red-400/80 bg-red-400/5 rounded p-2 overflow-auto max-h-40 whitespace-pre-wrap">
              {log.errors}
            </pre>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminImportLogs() {
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error" | "partial">("all");
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allLogs, setAllLogs] = useState<ImportLog[]>([]);

  const { data: page, isLoading, isFetching } = trpc.adminDashboard.getImportLogs.useQuery({
    limit: 50,
    cursor,
    status: statusFilter,
  });

  useEffect(() => {
    if (!page) return;
    const newLogs = (page.items ?? []) as ImportLog[];
    if (!cursor) {
      setAllLogs(newLogs);
    } else {
      setAllLogs((prev) => {
        const existingIds = new Set(prev.map(l => l.id));
        return [...prev, ...newLogs.filter(l => !existingIds.has(l.id))];
      });
    }
  }, [page]);

  const handleStatusChange = (v: "all" | "success" | "error" | "partial") => {
    setStatusFilter(v);
    setCursor(undefined);
    setAllLogs([]);
  };

  const successCount = allLogs.filter(l => l.status === "success").length;
  const errorCount = allLogs.filter(l => l.status === "error").length;
  const partialCount = allLogs.filter(l => l.status === "partial").length;

  return (
    <AdminLayout activeSection="import-logs">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand/10">
            <FileSpreadsheet className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Log de Importações</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              Histórico de todas as importações de jogos via Google Sheets
            </p>
          </div>
        </div>

        {/* Cards de resumo */}
        {allLogs.length > 0 && (
          <div className="grid grid-cols-3 gap-3">
            <div
              className="p-3 rounded-lg border border-green-400/20 bg-green-400/5 cursor-pointer hover:bg-green-400/10 transition-colors"
              onClick={() => handleStatusChange("success")}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <span className="text-sm font-medium text-green-400">{successCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Com sucesso</p>
            </div>
            <div
              className="p-3 rounded-lg border border-yellow-400/20 bg-yellow-400/5 cursor-pointer hover:bg-yellow-400/10 transition-colors"
              onClick={() => handleStatusChange("partial")}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <span className="text-sm font-medium text-yellow-400">{partialCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Parciais</p>
            </div>
            <div
              className="p-3 rounded-lg border border-red-400/20 bg-red-400/5 cursor-pointer hover:bg-red-400/10 transition-colors"
              onClick={() => handleStatusChange("error")}
            >
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-sm font-medium text-red-400">{errorCount}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Com erro</p>
            </div>
          </div>
        )}

        {/* Filtro */}
        <div className="flex items-center gap-3">
          <Select value={statusFilter} onValueChange={(v) => handleStatusChange(v as typeof statusFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="success">Sucesso</SelectItem>
              <SelectItem value="partial">Parcial</SelectItem>
              <SelectItem value="error">Erro</SelectItem>
            </SelectContent>
          </Select>
          {statusFilter !== "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStatusChange("all")}
            >
              Limpar filtro
            </Button>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {allLogs.length} registros carregados
            {page?.hasMore && " (há mais)"}
          </span>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : allLogs.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 opacity-20" />
            <p className="text-sm font-medium">Nenhuma importação registrada</p>
            <p className="text-xs mt-1">
              Os logs aparecerão aqui quando você importar jogos via Google Sheets nos campeonatos.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {allLogs.map((log) => (
              <LogRow key={log.id} log={log} />
            ))}
            {page?.hasMore && (
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
