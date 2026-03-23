import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Download,
  FileText,
  GitBranch,
  Globe,
  Layers,
  Loader2,
  Plus,
  Trash2,
  Trophy,
  Upload,
  X,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ── Tipos internos ──────────────────────────────────────────────────────────
interface PhaseEntry {
  key: string;
  label: string;
  order: number;
  slots: number;
  isKnockout: boolean;
}

// ── Fases pré-definidas para Copa do Mundo (atalho) ──────────────────────────
const WORLD_CUP_PHASES: PhaseEntry[] = [
  { key: "group_a", label: "Grupo A", order: 1, slots: 4, isKnockout: false },
  { key: "group_b", label: "Grupo B", order: 2, slots: 4, isKnockout: false },
  { key: "group_c", label: "Grupo C", order: 3, slots: 4, isKnockout: false },
  { key: "group_d", label: "Grupo D", order: 4, slots: 4, isKnockout: false },
  { key: "group_e", label: "Grupo E", order: 5, slots: 4, isKnockout: false },
  { key: "group_f", label: "Grupo F", order: 6, slots: 4, isKnockout: false },
  { key: "group_g", label: "Grupo G", order: 7, slots: 4, isKnockout: false },
  { key: "group_h", label: "Grupo H", order: 8, slots: 4, isKnockout: false },
  { key: "round_of_32", label: "Rodada de 32", order: 9, slots: 32, isKnockout: true },
  { key: "round_of_16", label: "Oitavas de Final", order: 10, slots: 16, isKnockout: true },
  { key: "quarter_finals", label: "Quartas de Final", order: 11, slots: 8, isKnockout: true },
  { key: "semifinals", label: "Semifinais", order: 12, slots: 4, isKnockout: true },
  { key: "third_place", label: "Disputa 3º Lugar", order: 13, slots: 2, isKnockout: true },
  { key: "final", label: "Final", order: 14, slots: 2, isKnockout: true },
];

const LEAGUE_PHASES: PhaseEntry[] = [
  { key: "regular_season", label: "Temporada Regular", order: 1, slots: 20, isKnockout: false },
  { key: "semifinals", label: "Semifinais", order: 2, slots: 4, isKnockout: true },
  { key: "final", label: "Final", order: 3, slots: 2, isKnockout: true },
];

export default function AdminTournaments() {
  const [, navigate] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [wizardStep, setWizardStep] = useState<1 | 2 | 3>(1);
  const [createdTournamentId, setCreatedTournamentId] = useState<number | null>(null);

  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvContent, setCsvContent] = useState("");
  const [csvPoolId, setCsvPoolId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const { data: tournaments, refetch } = trpc.tournaments.list.useQuery();

  // ── Step 1: info form ──
  const [form, setForm] = useState({
    name: "", slug: "", country: "BR", season: new Date().getFullYear().toString(),
    startDate: "", endDate: "", logoUrl: "", isGlobal: true,
  });

  // ── Step 2: phases ──
  const [phases, setPhases] = useState<PhaseEntry[]>([]);
  const [phaseForm, setPhaseForm] = useState<PhaseEntry>({ key: "", label: "", order: 1, slots: 4, isKnockout: false });

  // ── Step 3: add game (optional) ──
  const [gameForm, setGameForm] = useState({ phase: "", teamAName: "", teamBName: "", matchDate: "", venue: "" });

  // ── Mutations ──
  const createMutation = trpc.tournaments.create.useMutation({
    onSuccess: (data) => {
      setCreatedTournamentId(data.id);
      setWizardStep(2);
    },
    onError: (e) => toast.error(e.message),
  });

  const addPhaseMutation = trpc.tournaments.addPhase.useMutation({
    onSuccess: () => { refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const addGameMutation = trpc.tournaments.addGame.useMutation({
    onSuccess: () => {
      toast.success("Jogo adicionado.");
      setGameForm({ phase: "", teamAName: "", teamBName: "", matchDate: "", venue: "" });
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

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

  const importCsvMutation = trpc.tournaments.importGames.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.imported} jogos importados com sucesso!`);
      setShowCsvImport(false);
      setCsvContent("");
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Helpers ──
  const handleNameChange = (name: string) => {
    const autoSlug = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    setForm((f) => ({ ...f, name, slug: autoSlug }));
  };

  const resetWizard = () => {
    setWizardStep(1);
    setCreatedTournamentId(null);
    setForm({ name: "", slug: "", country: "BR", season: new Date().getFullYear().toString(), startDate: "", endDate: "", logoUrl: "", isGlobal: true });
    setPhases([]);
    setPhaseForm({ key: "", label: "", order: 1, slots: 4, isKnockout: false });
    setGameForm({ phase: "", teamAName: "", teamBName: "", matchDate: "", venue: "" });
  };

  const handleOpenCreate = () => {
    resetWizard();
    setShowCreate(true);
  };

  const handleStep1 = () => {
    if (!form.name || !form.slug) return toast.error("Nome e slug são obrigatórios.");
    createMutation.mutate({
      name: form.name, slug: form.slug, country: form.country,
      season: form.season, isGlobal: form.isGlobal,
      startDate: form.startDate ? new Date(form.startDate) : undefined,
      endDate: form.endDate ? new Date(form.endDate) : undefined,
      logoUrl: form.logoUrl || undefined,
    });
  };

  const handleAddPhase = () => {
    if (!phaseForm.label || !phaseForm.key) return toast.error("Nome e chave da fase são obrigatórios.");
    if (!createdTournamentId) return;
    setPhases((prev) => [...prev, { ...phaseForm }]);
    addPhaseMutation.mutate({
      tournamentId: createdTournamentId,
      key: phaseForm.key,
      label: phaseForm.label,
      order: phaseForm.order,
      slots: phaseForm.slots,
      isKnockout: phaseForm.isKnockout,
    });
    const nextOrder = phaseForm.order + 1;
    setPhaseForm({ key: "", label: "", order: nextOrder, slots: 4, isKnockout: false });
  };

  const handleApplyTemplate = (template: PhaseEntry[]) => {
    if (!createdTournamentId) return;
    setPhases(template);
    template.forEach((p) => {
      addPhaseMutation.mutate({
        tournamentId: createdTournamentId,
        key: p.key, label: p.label, order: p.order, slots: p.slots, isKnockout: p.isKnockout,
      });
    });
    toast.success(`${template.length} fases adicionadas.`);
  };

  const handleRemovePhase = (idx: number) => {
    setPhases((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAddGame = () => {
    if (!createdTournamentId || !gameForm.teamAName || !gameForm.teamBName || !gameForm.matchDate) {
      return toast.error("Preencha Time A, Time B e Data/Hora.");
    }
    addGameMutation.mutate({
      tournamentId: createdTournamentId,
      phase: gameForm.phase || "Sem fase",
      teamAName: gameForm.teamAName,
      teamBName: gameForm.teamBName,
      matchDate: new Date(gameForm.matchDate).getTime(),
      venue: gameForm.venue || undefined,
    });
  };

  const handleFinish = () => {
    toast.success("Campeonato criado com sucesso!");
    setShowCreate(false);
    refetch();
    if (createdTournamentId) navigate(`/admin/tournaments/${createdTournamentId}`);
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

  const CSV_TEMPLATE = `homeTeamId,awayTeamId,matchDate,bettingDeadlineMinutes,phase,venue\n1,2,2026-06-15T15:00:00Z,60,Grupo A,Estádio Nacional\n3,4,2026-06-15T18:00:00Z,60,Grupo A,Arena Fonte Nova`;

  // ── Wizard step labels ──
  const steps = [
    { n: 1, label: "Informações" },
    { n: 2, label: "Fases" },
    { n: 3, label: "Jogos" },
  ];

  return (
    <AdminLayout activeSection="tournaments">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold font-display">Campeonatos</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Gerencie campeonatos globais e importe jogos via CSV
              </p>
            </div>
            <Button size="sm" onClick={handleOpenCreate} className="gap-2 bg-brand hover:bg-brand/90 shrink-0">
              <Plus className="h-4 w-4" />
              Novo Campeonato
            </Button>
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowCsvImport(true)} className="gap-2">
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
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
                <Button size="sm" onClick={handleOpenCreate} className="gap-2">
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

      {/* ── Confirm Delete ── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campeonato "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente e irreversível</strong>. Todos os jogos e times vinculados serão removidos.
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

      {/* ── Wizard: Criar Campeonato ── */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) { setShowCreate(false); if (createdTournamentId) { refetch(); navigate(`/admin/tournaments/${createdTournamentId}`); } } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" />
              Novo Campeonato
            </DialogTitle>
          </DialogHeader>

          {/* Step indicator */}
          <div className="flex items-center gap-1 mb-2">
            {steps.map((s, i) => (
              <div key={s.n} className="flex items-center gap-1 flex-1">
                <div className={`flex items-center gap-1.5 ${wizardStep === s.n ? "text-brand" : wizardStep > s.n ? "text-green-400" : "text-muted-foreground"}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border ${wizardStep === s.n ? "border-brand bg-brand/10 text-brand" : wizardStep > s.n ? "border-green-400 bg-green-400/10 text-green-400" : "border-muted-foreground/30 text-muted-foreground"}`}>
                    {wizardStep > s.n ? <CheckCircle2 className="h-3.5 w-3.5" /> : s.n}
                  </div>
                  <span className="text-xs font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && (
                  <div className={`flex-1 h-px mx-1 ${wizardStep > s.n ? "bg-green-400/50" : "bg-border/50"}`} />
                )}
              </div>
            ))}
          </div>

          {/* ── Etapa 1: Informações ── */}
          {wizardStep === 1 && (
            <div className="space-y-4">
              <div className="space-y-1">
                <Label>Nome *</Label>
                <Input placeholder="Copa do Mundo 2026" value={form.name} onChange={(e) => handleNameChange(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>Slug (URL) *</Label>
                <Input placeholder="copa-mundo-2026" value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") }))} />
                <p className="text-xs text-muted-foreground">Gerado automaticamente. Edite se necessário.</p>
              </div>
              <div className="space-y-1">
                <Label>Tipo</Label>
                <div className="flex gap-2">
                  <Button type="button" variant={form.isGlobal ? "default" : "outline"} size="sm"
                    className={form.isGlobal ? "bg-brand hover:bg-brand/90" : ""}
                    onClick={() => setForm((f) => ({ ...f, isGlobal: true }))}>
                    <Globe className="h-3.5 w-3.5 mr-1.5" /> Global (plataforma)
                  </Button>
                  <Button type="button" variant={!form.isGlobal ? "default" : "outline"} size="sm"
                    className={!form.isGlobal ? "bg-brand hover:bg-brand/90" : ""}
                    onClick={() => setForm((f) => ({ ...f, isGlobal: false }))}>
                    Personalizado
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>País</Label>
                  <Input placeholder="BR" value={form.country} onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Temporada</Label>
                  <Input placeholder="2026" value={form.season} onChange={(e) => setForm((f) => ({ ...f, season: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Data de início</Label>
                  <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-1">
                  <Label>Data de fim</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>URL do Logo</Label>
                <Input placeholder="https://..." value={form.logoUrl} onChange={(e) => setForm((f) => ({ ...f, logoUrl: e.target.value }))} />
              </div>
              <Button className="w-full bg-brand hover:bg-brand/90 gap-2" onClick={handleStep1}
                disabled={createMutation.isPending || !form.name || !form.slug}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                Próximo: Criar Fases
              </Button>
            </div>
          )}

          {/* ── Etapa 2: Fases ── */}
          {wizardStep === 2 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Defina as fases do campeonato. Use os atalhos abaixo ou adicione manualmente.
              </p>

              {/* Templates rápidos */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Atalhos</Label>
                <div className="flex gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-amber-400/30 text-amber-400 hover:bg-amber-400/10"
                    onClick={() => handleApplyTemplate(WORLD_CUP_PHASES)}
                    disabled={addPhaseMutation.isPending}>
                    <Trophy className="h-3.5 w-3.5" /> Copa do Mundo (14 fases)
                  </Button>
                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-8 border-blue-400/30 text-blue-400 hover:bg-blue-400/10"
                    onClick={() => handleApplyTemplate(LEAGUE_PHASES)}
                    disabled={addPhaseMutation.isPending}>
                    <Layers className="h-3.5 w-3.5" /> Liga (3 fases)
                  </Button>
                </div>
              </div>

              {/* Fases adicionadas */}
              {phases.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground uppercase tracking-wide">Fases configuradas ({phases.length})</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                    {phases.map((p, i) => (
                      <div key={i} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-1.5">
                        {p.isKnockout ? <GitBranch className="h-3.5 w-3.5 text-amber-400 shrink-0" /> : <Trophy className="h-3.5 w-3.5 text-brand shrink-0" />}
                        <span className="text-sm flex-1 truncate">{p.label}</span>
                        <span className="text-xs text-muted-foreground font-mono">{p.slots} vagas</span>
                        <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-red-400 shrink-0"
                          onClick={() => handleRemovePhase(i)}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Adicionar fase manual */}
              <div className="border border-border/50 rounded-lg p-3 space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Adicionar fase manualmente</Label>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Nome da fase *</Label>
                    <Input placeholder="Grupo A" value={phaseForm.label} className="h-8 text-sm"
                      onChange={(e) => {
                        const label = e.target.value;
                        const key = label.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
                        setPhaseForm((f) => ({ ...f, label, key }));
                      }} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Chave (slug) *</Label>
                    <Input placeholder="group_a" value={phaseForm.key} className="h-8 text-sm"
                      onChange={(e) => setPhaseForm((f) => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Vagas (slots)</Label>
                    <Input type="number" min={2} value={phaseForm.slots} className="h-8 text-sm"
                      onChange={(e) => setPhaseForm((f) => ({ ...f, slots: Number(e.target.value) }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Ordem</Label>
                    <Input type="number" min={1} value={phaseForm.order} className="h-8 text-sm"
                      onChange={(e) => setPhaseForm((f) => ({ ...f, order: Number(e.target.value) }))} />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Fase eliminatória?</Label>
                  <Switch checked={phaseForm.isKnockout} onCheckedChange={(v) => setPhaseForm((f) => ({ ...f, isKnockout: v }))} />
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs"
                  onClick={handleAddPhase}
                  disabled={!phaseForm.label || !phaseForm.key || addPhaseMutation.isPending}>
                  {addPhaseMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar Fase
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 flex-1" onClick={() => setWizardStep(1)}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button className="gap-2 flex-1 bg-brand hover:bg-brand/90" onClick={() => setWizardStep(3)}>
                  Próximo: Jogos <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* ── Etapa 3: Jogos ── */}
          {wizardStep === 3 && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Adicione os jogos de cada fase. Esta etapa é opcional — você pode adicionar jogos depois na página do campeonato ou importar via Google Sheets.
              </p>

              <div className="border border-border/50 rounded-lg p-3 space-y-3">
                <Label className="text-xs text-muted-foreground uppercase tracking-wide">Adicionar jogo</Label>
                <div className="space-y-1">
                  <Label className="text-xs">Fase</Label>
                  <select
                    className="w-full h-8 text-sm rounded-md border border-input bg-background px-2 text-foreground"
                    value={gameForm.phase}
                    onChange={(e) => setGameForm((f) => ({ ...f, phase: e.target.value }))}
                  >
                    <option value="">Selecionar fase...</option>
                    {phases.map((p) => (
                      <option key={p.key} value={p.label}>{p.label}</option>
                    ))}
                    <option value="Sem fase">Sem fase</option>
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Time A *</Label>
                    <Input placeholder="Brasil" value={gameForm.teamAName} className="h-8 text-sm"
                      onChange={(e) => setGameForm((f) => ({ ...f, teamAName: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Time B *</Label>
                    <Input placeholder="Argentina" value={gameForm.teamBName} className="h-8 text-sm"
                      onChange={(e) => setGameForm((f) => ({ ...f, teamBName: e.target.value }))} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Data e Hora *</Label>
                    <Input type="datetime-local" value={gameForm.matchDate} className="h-8 text-sm"
                      onChange={(e) => setGameForm((f) => ({ ...f, matchDate: e.target.value }))} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Estádio / Local</Label>
                    <Input placeholder="Maracanã" value={gameForm.venue} className="h-8 text-sm"
                      onChange={(e) => setGameForm((f) => ({ ...f, venue: e.target.value }))} />
                  </div>
                </div>
                <Button size="sm" variant="outline" className="w-full gap-1.5 h-8 text-xs"
                  onClick={handleAddGame}
                  disabled={!gameForm.teamAName || !gameForm.teamBName || !gameForm.matchDate || addGameMutation.isPending}>
                  {addGameMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                  Adicionar Jogo
                </Button>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" className="gap-2 flex-1" onClick={() => setWizardStep(2)}>
                  <ArrowLeft className="h-4 w-4" /> Voltar
                </Button>
                <Button className="gap-2 flex-1 bg-brand hover:bg-brand/90" onClick={handleFinish}>
                  <CheckCircle2 className="h-4 w-4" /> Concluir
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal: Importar CSV ── */}
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
              <Input placeholder="Ex: 1" value={csvPoolId} onChange={(e) => setCsvPoolId(e.target.value)} />
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
