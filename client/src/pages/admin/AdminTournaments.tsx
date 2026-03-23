import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Calendar,
  ChevronRight,
  Download,
  Edit,
  FileText,
  Globe,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Upload,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminTournaments() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvPoolId, setCsvPoolId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { data: tournaments, refetch } = trpc.tournaments.list.useQuery();

  const deleteTournament = trpc.tournaments.delete.useMutation({
    onSuccess: () => {
      toast.success("Campeonato excluído com sucesso.");
      setDeleteTarget(null);
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao excluir", { description: err.message });
      setDeleteTarget(null);
    },
  });

  const createMutation = trpc.tournaments.create.useMutation({
    onSuccess: () => {
      toast.success("Campeonato criado com sucesso!");
      setShowCreate(false);
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const importCsvMutation = trpc.tournaments.importGames.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} jogos importados com sucesso!`);
      setShowCsvImport(false);
      setCsvContent("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [form, setForm] = useState({
    name: "", slug: "", country: "BR", season: new Date().getFullYear().toString(),
    startDate: "", endDate: "", logoUrl: "",
  });

  const handleCreate = () => {
    if (!form.name || !form.slug) return toast.error("Nome e slug são obrigatórios.");
    createMutation.mutate({
      name: form.name, slug: form.slug, country: form.country,
      season: form.season, isGlobal: true,
      startDate: form.startDate ? new Date(form.startDate) : undefined,
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      logoUrl: form.logoUrl || undefined,
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setCsvContent(ev.target?.result as string);
    reader.readAsText(file);
  };

  const handleImportCsv = () => {
    if (!csvContent || !csvPoolId) return toast.error("Selecione um arquivo CSV e informe o ID do campeonato.");
    importCsvMutation.mutate({ tournamentId: parseInt(csvPoolId), csvData: csvContent });
  };

  const CSV_TEMPLATE = `homeTeamId,awayTeamId,matchDate,bettingDeadlineMinutes,phase,venue
1,2,2026-06-15T15:00:00Z,60,Grupo A,Estádio Nacional
3,4,2026-06-15T18:00:00Z,60,Grupo A,Arena Fonte Nova`;

  return (
    <AdminLayout activeSection="tournaments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Campeonatos</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie campeonatos globais e importe jogos via CSV
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)} className="gap-2">
              <Upload className="h-4 w-4" />
              Importar CSV
            </Button>
            <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2 bg-brand hover:bg-brand/90">
              <Plus className="h-4 w-4" />
              Novo Campeonato
            </Button>
          </div>
        </div>

        {/* Lista de campeonatos */}
        <div className="space-y-3">
          {!tournaments ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : tournaments.length === 0 ? (
            <Card className="border-dashed border-border/50">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <Trophy className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground text-sm">Nenhum campeonato cadastrado.</p>
                <Button size="sm" onClick={() => setShowCreate(true)} className="gap-2">
                  <Plus className="h-4 w-4" /> Criar primeiro campeonato
                </Button>
              </CardContent>
            </Card>
          ) : (
            tournaments.map((t) => (
              <Card key={t.id} className="border-border/50 hover:border-brand/30 transition-colors cursor-pointer"
                onClick={() => navigate(`/admin/tournaments/${t.id}`)}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    {t.logoUrl ? (
                      <img src={t.logoUrl} alt={t.name} className="w-8 h-8 object-contain rounded" />
                    ) : (
                      <Trophy className="h-5 w-5 text-brand" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium truncate">{t.name}</p>
                      {t.isGlobal && (
                        <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
                          <Globe className="h-2.5 w-2.5 mr-1" />Global
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">{t.slug} · {t.country} · {t.season}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {t.startDate && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-muted-foreground">Início</p>
                        <p className="text-xs font-medium">
                          {format(new Date(t.startDate), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      </div>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                      onClick={(e) => { e.stopPropagation(); setDeleteTarget({ id: t.id, name: t.name }); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Confirm Delete Tournament Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campeonato "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente e irreversível</strong>. Todos os jogos e times vinculados serão removidos. Os organizadores dos bolões vinculados serão notificados.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deleteTournament.mutate({ id: deleteTarget.id })}
              disabled={deleteTournament.isPending}
            >
              {deleteTournament.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Sim, excluir campeonato
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Criar Campeonato */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" />
              Novo Campeonato
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Nome *</Label>
                <Input placeholder="Copa do Mundo 2026" value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Slug (URL) *</Label>
                <Input placeholder="copa-mundo-2026" value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
              </div>
              <div className="space-y-1">
                <Label>País</Label>
                <Input placeholder="BR" value={form.country}
                  onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Temporada</Label>
                <Input placeholder="2026" value={form.season}
                  onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data de início</Label>
                <Input type="date" value={form.startDate}
                  onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Data de fim</Label>
                <Input type="date" value={form.endDate}
                  onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>URL do Logo</Label>
                <Input placeholder="https://..." value={form.logoUrl}
                  onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} />
              </div>
            </div>
            <Button className="w-full bg-brand hover:bg-brand/90" onClick={handleCreate}
              disabled={createMutation.isPending}>
              {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Campeonato
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Importar CSV */}
      <Dialog open={showCsvImport} onOpenChange={setShowCsvImport}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-brand" />
              Importar Jogos via CSV
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>ID do Campeonato *</Label>
              <Input placeholder="Ex: 1" value={csvPoolId}
                onChange={(e) => setCsvPoolId(e.target.value)} />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Arquivo CSV</Label>
                <Button variant="ghost" size="sm" className="gap-1 text-xs h-7"
                  onClick={() => {
                    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url; a.download = "jogos-template.csv"; a.click();
                  }}>
                  <Download className="h-3 w-3" /> Template
                </Button>
              </div>
              <div
                className="border-2 border-dashed border-border/50 rounded-lg p-6 text-center cursor-pointer hover:border-brand/30 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                <FileText className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  {csvContent ? "✓ Arquivo carregado" : "Clique para selecionar o arquivo CSV"}
                </p>
                <input ref={fileInputRef} type="file" accept=".csv" className="hidden" onChange={handleFileUpload} />
              </div>
            </div>
            {csvContent && (
              <div className="space-y-1">
                <Label>Prévia do conteúdo</Label>
                <Textarea value={csvContent.slice(0, 300) + (csvContent.length > 300 ? "..." : "")}
                  readOnly className="font-mono text-xs h-24 resize-none" />
              </div>
            )}
            <Button className="w-full bg-brand hover:bg-brand/90" onClick={handleImportCsv}
              disabled={importCsvMutation.isPending || !csvContent || !csvPoolId}>
              {importCsvMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Importar Jogos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
