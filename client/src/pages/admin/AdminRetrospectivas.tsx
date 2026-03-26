import { useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import {
  Search,
  RefreshCw,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Film,
  Users,
  ImageIcon,
} from "lucide-react";

const STATUS_CONFIG = {
  complete: {
    label: "Completo",
    icon: CheckCircle2,
    variant: "default" as const,
    className: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  },
  partial: {
    label: "Parcial",
    icon: AlertCircle,
    variant: "secondary" as const,
    className: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  pending: {
    label: "Pendente",
    icon: Clock,
    variant: "outline" as const,
    className: "bg-zinc-800 text-zinc-400 border-zinc-700",
  },
};

export default function AdminRetrospectivas() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [reprocessingId, setReprocessingId] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.pools.adminGetRetrospectives.useQuery({
    page,
    limit: 20,
    search: search || undefined,
  });

  const reprocess = trpc.pools.adminReprocessRetrospective.useMutation({
    onSuccess: () => {
      toast.success("Retrospectiva reprocessada com sucesso.");
      setReprocessingId(null);
      refetch();
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao reprocessar retrospectiva.");
      setReprocessingId(null);
    },
  });

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
  };

  const handleReprocess = (poolId: number) => {
    setReprocessingId(poolId);
    reprocess.mutate({ poolId });
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Métricas resumidas
  const totalComplete = data?.items.filter((i) => i.status === "complete").length ?? 0;
  const totalPartial = data?.items.filter((i) => i.status === "partial").length ?? 0;
  const totalPending = data?.items.filter((i) => i.status === "pending").length ?? 0;

  return (
    <AdminLayout activeSection="retrospectivas">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Film className="h-6 w-6 text-brand-500" />
            Retrospectivas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Geração de retrospectivas e cards de compartilhamento dos bolões concluídos.
          </p>
        </div>

        {/* Cards de resumo */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="bg-surface border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Completos</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{totalComplete}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-500/10">
                  <AlertCircle className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Parciais</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{totalPartial}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-surface border-border">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-zinc-700/30">
                  <Clock className="h-5 w-5 text-zinc-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                  <p className="text-2xl font-bold text-foreground font-mono">{totalPending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabela */}
        <Card className="bg-surface border-border">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
              <CardTitle className="text-base font-semibold">Bolões Concluídos</CardTitle>
              <div className="flex gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar bolão..."
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    className="pl-8 bg-background border-border text-sm"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSearch}
                  className="border-border"
                >
                  Buscar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                Carregando retrospectivas...
              </div>
            ) : !data?.items.length ? (
              <div className="p-12 text-center">
                <Film className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground text-sm">
                  {search ? "Nenhum bolão encontrado para esta busca." : "Nenhum bolão concluído ainda."}
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent">
                      <TableHead className="text-xs text-muted-foreground font-medium">Bolão</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Organizador</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Concluído em</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <Users className="h-3 w-3" />
                          Retrospectivas
                        </div>
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <ImageIcon className="h-3 w-3" />
                          Cards
                        </div>
                      </TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium">Status</TableHead>
                      <TableHead className="text-xs text-muted-foreground font-medium text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.items.map((item) => {
                      const cfg = STATUS_CONFIG[item.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.pending;
                      const StatusIcon = cfg.icon;
                      const isReprocessing = reprocessingId === item.id;

                      return (
                        <TableRow key={item.id} className="border-border hover:bg-white/[0.02]">
                          <TableCell>
                            <div>
                              <p className="font-medium text-sm text-foreground">{item.name}</p>
                              <p className="text-xs text-muted-foreground font-mono">{item.slug}</p>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">{item.ownerName}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground font-mono text-xs">
                              {formatDate(item.concludedAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-mono text-sm text-foreground">
                              {item.totalRetrospectives}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className={`font-mono text-sm ${item.totalCards < item.totalRetrospectives ? "text-amber-400" : "text-emerald-400"}`}>
                              {item.totalCards}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className={`text-xs border ${cfg.className} flex items-center gap-1 w-fit`}>
                              <StatusIcon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      disabled={isReprocessing}
                                      className="h-8 w-8 p-0 hover:bg-brand-500/10 hover:text-brand-400"
                                    >
                                      <RefreshCw className={`h-4 w-4 ${isReprocessing ? "animate-spin" : ""}`} />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent className="bg-surface border-border">
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Reprocessar retrospectiva?</AlertDialogTitle>
                                      <AlertDialogDescription>
                                        Isso vai regenerar os cards de compartilhamento de todos os participantes do bolão <strong>{item.name}</strong>. Cards existentes serão substituídos.
                                      </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel className="border-border">Cancelar</AlertDialogCancel>
                                      <AlertDialogAction
                                        onClick={() => handleReprocess(item.id)}
                                        className="bg-brand-500 hover:bg-brand-600 text-white"
                                      >
                                        Reprocessar
                                      </AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                              </TooltipTrigger>
                              <TooltipContent>Reprocessar cards</TooltipContent>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                {/* Paginação */}
                {(data?.totalPages ?? 1) > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-border">
                    <p className="text-xs text-muted-foreground">
                      {data?.total} bolão{(data?.total ?? 0) !== 1 ? "ões" : ""} concluído{(data?.total ?? 0) !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                        className="h-7 w-7 p-0 border-border"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <span className="text-xs text-muted-foreground font-mono">
                        {page} / {data?.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(data?.totalPages ?? 1, p + 1))}
                        disabled={page === (data?.totalPages ?? 1)}
                        className="h-7 w-7 p-0 border-border"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
