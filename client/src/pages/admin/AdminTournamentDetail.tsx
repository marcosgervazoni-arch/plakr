/**
 * AdminTournamentDetail — /admin/tournaments/:id
 * Accordion por fase, bracket visual para eliminatórias, edição inline de jogos, gerenciamento de fases.
 */
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
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
  Calendar,
  CheckCircle2,
  ChevronDown,
  Clock,
  Globe,
  Layers,
  Loader2,
  MapPin,
  Plus,
  Shield,
  Trash2,
  Trophy,
  Users,
  Pencil,
  Flag,
  RefreshCw,
  FileSpreadsheet,
  Save,
  X,
  Zap,
  GitBranch,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type GameStatus = "scheduled" | "live" | "finished" | "cancelled";

interface EditGameForm {
  teamAName: string;
  teamBName: string;
  matchDate: string;
  venue: string;
  status: GameStatus;
  roundNumber: string;
}

export default function AdminTournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const tournamentId = Number(id);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const { data, isLoading, refetch } = trpc.tournaments.getById.useQuery(
    { id: tournamentId },
    { enabled: !isNaN(tournamentId) }
  );

  // ── Recalculate ──
  const recalculateMutation = trpc.tournaments.recalculatePool.useMutation({
    onSuccess: (data) => {
      toast.success(`Pontuação recalculada! ${data.totalRecalculated} membros atualizados.`);
      refetch();
      // Recalcular afeta palpites e rankings de todos os bolões deste campeonato
      utils.bets.myBets.invalidate();
      utils.rankings.myPoolPosition.invalidate();
    },
    onError: (e: { message: string }) => toast.error("Erro ao recalcular", { description: e.message }),
  });

  // ── Import from Sheets ──
  const [showSheetsModal, setShowSheetsModal] = useState(false);
  const [sheetsUrl, setSheetsUrl] = useState("");
  const importSheetsMutation = trpc.tournaments.importFromSheets.useMutation({
    onSuccess: (data) => {
      toast.success(`Importação concluída! ${data.imported} jogos importados, ${data.skipped} ignorados.`);
      setShowSheetsModal(false);
      setSheetsUrl("");
      refetch();
    },
    onError: (e: { message: string }) => toast.error("Erro na importação", { description: e.message }),
  });

  // ── Add Team form ──
  const [showAddTeam, setShowAddTeam] = useState(false);
  const [teamForm, setTeamForm] = useState({ name: "", code: "", flagUrl: "", groupName: "" });

  // ── Add Game form ──
  const [showAddGame, setShowAddGame] = useState(false);
  const [gameForm, setGameForm] = useState({ phase: "", teamAName: "", teamBName: "", matchDate: "", venue: "", roundNumber: "" });

  // ── Set Result form ──
  const [showSetResult, setShowSetResult] = useState(false);
  const [resultTarget, setResultTarget] = useState<{ gameId: number; teamA: string; teamB: string } | null>(null);
  const [resultForm, setResultForm] = useState({ scoreA: "", scoreB: "" });

  // ── Edit Game inline ──
  const [editingGameId, setEditingGameId] = useState<number | null>(null);
  const [editGameForm, setEditGameForm] = useState<EditGameForm>({ teamAName: "", teamBName: "", matchDate: "", venue: "", status: "scheduled", roundNumber: "" });

  // ── Add Phase form ──
  const [showAddPhase, setShowAddPhase] = useState(false);
  const [phaseForm, setPhaseForm] = useState({ key: "", label: "", order: 1, slots: 2, isKnockout: false });

  // ── Edit Phase ──
  const [editingPhaseId, setEditingPhaseId] = useState<number | null>(null);
  const [editPhaseLabel, setEditPhaseLabel] = useState("");

  // ── Delete targets ──
  const [deleteGameTarget, setDeleteGameTarget] = useState<{ id: number; teamA: string; teamB: string } | null>(null);
  const [deleteTeamTarget, setDeleteTeamTarget] = useState<{ id: number; name: string } | null>(null);
  const [deletePhaseTarget, setDeletePhaseTarget] = useState<{ id: number; label: string } | null>(null);

  // ── Batch edit state ──
  const [batchPhase, setBatchPhase] = useState<string | null>(null);
  const [batchEdits, setBatchEdits] = useState<Record<number, Partial<EditGameForm>>>({});

  // ── Mutations ──
  const addTeamMutation = trpc.tournaments.addTeam.useMutation({
    onSuccess: () => { toast.success("Time adicionado."); setShowAddTeam(false); setTeamForm({ name: "", code: "", flagUrl: "", groupName: "" }); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const addGameMutation = trpc.tournaments.addGame.useMutation({
    onSuccess: () => { toast.success("Jogo adicionado."); setShowAddGame(false); setGameForm({ phase: "", teamAName: "", teamBName: "", matchDate: "", venue: "", roundNumber: "" }); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setResultMutation = trpc.tournaments.setResult.useMutation({
    onSuccess: () => {
      toast.success("Resultado registrado.");
      setShowSetResult(false);
      setResultTarget(null);
      refetch();
      // Resultado de jogo afeta palpites (resultType/pontos) e rankings
      utils.bets.myBets.invalidate();
      utils.rankings.myPoolPosition.invalidate();
      // Invalida dados dos bolões para que placar apareça atualizado na PoolPage
      utils.pools.getBySlug.invalidate();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deleteGameMutation = trpc.tournaments.deleteGame.useMutation({
    onSuccess: () => { toast.success("Jogo excluído."); setDeleteGameTarget(null); refetch(); },
    onError: (e: { message: string }) => { toast.error("Erro ao excluir jogo", { description: e.message }); setDeleteGameTarget(null); },
  });

  const deleteTeamMutation = trpc.tournaments.deleteTeam.useMutation({
    onSuccess: () => { toast.success("Time excluído."); setDeleteTeamTarget(null); refetch(); },
    onError: (e: { message: string }) => { toast.error("Erro ao excluir time", { description: e.message }); setDeleteTeamTarget(null); },
  });

  const updateGameMutation = trpc.tournaments.updateGame.useMutation({
    onSuccess: () => { toast.success("Jogo atualizado."); setEditingGameId(null); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const addPhaseMutation = trpc.tournaments.addPhase.useMutation({
    onSuccess: () => { toast.success("Fase adicionada."); setShowAddPhase(false); setPhaseForm({ key: "", label: "", order: 1, slots: 2, isKnockout: false }); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const updatePhaseMutation = trpc.tournaments.updatePhase.useMutation({
    onSuccess: () => { toast.success("Fase atualizada."); setEditingPhaseId(null); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const deletePhaseMutation = trpc.tournaments.deletePhase.useMutation({
    onSuccess: () => { toast.success("Fase excluída."); setDeletePhaseTarget(null); refetch(); },
    onError: (e: { message: string }) => { toast.error("Erro ao excluir fase", { description: e.message }); setDeletePhaseTarget(null); },
  });

  const batchUpdateMutation = trpc.tournaments.batchUpdateGames.useMutation({
    onSuccess: (d) => { toast.success(`${d.updated} jogos atualizados em lote.`); setBatchPhase(null); setBatchEdits({}); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const generateNextPhaseMutation = trpc.tournaments.generateNextPhase.useMutation({
    onSuccess: (d) => { toast.success(`${d.created} jogos gerados para a próxima fase.`); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <AdminLayout activeSection="tournaments">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!data) {
    return (
      <AdminLayout activeSection="tournaments">
        <div className="text-center py-16">
          <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">Campeonato não encontrado.</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/admin/tournaments")}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
          </Button>
        </div>
      </AdminLayout>
    );
  }

  const { tournament, phases, teams, games } = data;

  // Map games to phases — indexed by the game's phase value (e.g. "group_a" or "Grupo A")
  const gamesByPhaseKey: Record<string, typeof games> = {};
  for (const g of games) {
    const key = g.phase ?? "Sem fase";
    if (!gamesByPhaseKey[key]) gamesByPhaseKey[key] = [];
    gamesByPhaseKey[key].push(g);
  }

  // Build ordered phase list from phases table, then orphan groups
  // Match by phase.key first ("group_a"), then by phase.label ("Grupo A") for backwards compat
  const orderedPhases = phases.map((p) => ({
    id: p.id,
    key: p.key,
    label: p.label,
    isKnockout: p.isKnockout,
    slots: p.slots,
    games: gamesByPhaseKey[p.key] ?? gamesByPhaseKey[p.label] ?? [],
  }));
  // Orphan games not matched to any phase key or label
  const knownKeys = new Set(phases.flatMap((p) => [p.key, p.label]));
  const orphanGames = games.filter((g) => !knownKeys.has(g.phase ?? ""));
  if (orphanGames.length > 0) {
    orderedPhases.push({ id: -1, key: "orphan", label: "Sem fase", isKnockout: false, slots: null, games: orphanGames });
  }

  const statusBadge = (status: GameStatus | string | null) => {
    if (!status || status === "scheduled") return <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground gap-1"><Clock className="h-2.5 w-2.5" />Agendado</Badge>;
    if (status === "live") return <Badge variant="outline" className="text-xs border-green-400/50 text-green-400 gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Ao vivo</Badge>;
    if (status === "finished") return <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Encerrado</Badge>;
    if (status === "cancelled") return <Badge variant="outline" className="text-xs border-red-400/30 text-red-400 gap-1"><X className="h-2.5 w-2.5" />Cancelado</Badge>;
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
  };

  // Bracket visual for knockout phases
  // Shows real games + placeholder slots when slots > games.length
  const KnockoutBracket = ({ phaseGames, slots }: { phaseGames: typeof games; slots: number | null }) => {
    // Build a list of match slots: real games first, then empty placeholders
    const totalMatches = slots ? Math.max(Math.ceil(slots / 2), phaseGames.length) : phaseGames.length;
    const matchSlots: Array<typeof games[0] | null> = [
      ...phaseGames,
      ...Array(Math.max(0, totalMatches - phaseGames.length)).fill(null),
    ];
    // Group into pairs (match 1 vs match 2 side by side)
    const pairs: Array<[typeof games[0] | null, typeof games[0] | null]> = [];
    for (let i = 0; i < matchSlots.length; i += 2) {
      pairs.push([matchSlots[i] ?? null, matchSlots[i + 1] ?? null]);
    }
    const MatchSlot = ({ game, idx }: { game: typeof games[0] | null; idx: number }) => (
      <div className={`border rounded-lg px-3 py-2 w-52 flex items-center justify-between gap-2 ${
        game ? "bg-muted/30 border-border/40" : "bg-muted/10 border-border/20 border-dashed"
      }`}>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-medium truncate ${!game ? "text-muted-foreground/50 italic" : ""}`}>
            {game?.teamAName ?? "A Definir"}
          </p>
          <p className={`text-xs truncate ${!game ? "text-muted-foreground/40 italic" : "text-muted-foreground"}`}>
            {game?.teamBName ?? "A Definir"}
          </p>
        </div>
        {game ? (
          game.scoreA !== null && game.scoreB !== null ? (
            <span className="font-mono text-sm font-bold text-brand shrink-0">{game.scoreA}–{game.scoreB}</span>
          ) : (
            <span className="text-muted-foreground text-xs font-mono shrink-0">vs</span>
          )
        ) : (
          <span className="text-muted-foreground/30 text-xs font-mono shrink-0">#{idx + 1}</span>
        )}
      </div>
    );
    return (
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-3 min-w-max">
          {pairs.map((pair, pi) => (
            <div key={pi} className="flex flex-col gap-1.5">
              <MatchSlot game={pair[0]} idx={pi * 2} />
              <MatchSlot game={pair[1]} idx={pi * 2 + 1} />
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout activeSection="tournaments">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground -ml-2 mt-0.5"
            onClick={() => navigate("/admin/tournaments")}>
            <ArrowLeft className="h-4 w-4" /> Campeonatos
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-4">
          {/* Logo + Info */}
          <div className="flex items-start gap-3 flex-1 min-w-0">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
              {tournament.logoUrl ? (
                <img src={tournament.logoUrl} alt={tournament.name} className="w-9 h-9 sm:w-10 sm:h-10 object-contain rounded" />
              ) : (
                <Trophy className="h-6 w-6 sm:h-7 sm:w-7 text-brand" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold font-display leading-tight">{tournament.name}</h1>
                {tournament.isGlobal && (
                  <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
                    <Globe className="h-2.5 w-2.5 mr-1" />Global
                  </Badge>
                )}
              </div>
              <p className="text-xs sm:text-sm text-muted-foreground font-mono mt-0.5 break-all">
                {tournament.slug}
                {tournament.country && ` · ${tournament.country}`}
                {tournament.season && ` · ${tournament.season}`}
              </p>
              {(tournament.startDate || tournament.endDate) && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {tournament.startDate && format(new Date(tournament.startDate), "dd/MM/yyyy", { locale: ptBR })}
                  {tournament.startDate && tournament.endDate && " → "}
                  {tournament.endDate && format(new Date(tournament.endDate), "dd/MM/yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
          {/* Action buttons — full width on mobile, inline on desktop */}
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setShowAddTeam(true)}>
              <Shield className="h-3.5 w-3.5" /> <span className="sm:inline">Time</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setShowAddPhase(true)}>
              <Layers className="h-3.5 w-3.5" /> <span className="sm:inline">Fase</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none" onClick={() => setShowSheetsModal(true)}>
              <FileSpreadsheet className="h-3.5 w-3.5" /> <span className="sm:inline">Sheets</span>
            </Button>
            <Button size="sm" variant="outline" className="gap-1.5 flex-1 sm:flex-none text-primary border-primary/30 hover:bg-primary/10"
              disabled={recalculateMutation.isPending}
              onClick={() => recalculateMutation.mutate({ tournamentId })}>
              {recalculateMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="sm:inline">Recalcular</span>
            </Button>
            <Button size="sm" className="gap-1.5 flex-1 sm:flex-none bg-brand hover:bg-brand/90" onClick={() => setShowAddGame(true)}>
              <Plus className="h-3.5 w-3.5" /> <span className="sm:inline">Jogo</span>
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Shield className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-2xl font-bold font-mono">{teams.length}</p>
                <p className="text-xs text-muted-foreground">Times</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Layers className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-2xl font-bold font-mono">{phases.length}</p>
                <p className="text-xs text-muted-foreground">Fases</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <Trophy className="h-5 w-5 text-brand shrink-0" />
              <div>
                <p className="text-2xl font-bold font-mono">{games.length}</p>
                <p className="text-xs text-muted-foreground">Jogos</p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <div>
                <p className="text-2xl font-bold font-mono">{games.filter(g => g.status === "finished").length}</p>
                <p className="text-xs text-muted-foreground">Encerrados</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Teams accordion */}
        {teams.length > 0 && (
          <Accordion type="single" collapsible defaultValue="teams">
            <AccordionItem value="teams" className="border border-border/50 rounded-xl px-4">
              <AccordionTrigger className="hover:no-underline py-3">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-brand" />
                  <span className="font-semibold text-sm">Times</span>
                  <Badge variant="outline" className="text-xs ml-1">{teams.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2 group">
                      {team.flagUrl ? (
                        <img src={team.flagUrl} alt={team.name} className="w-5 h-5 object-contain rounded-sm shrink-0" />
                      ) : (
                        <Flag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      )}
                      <span className="text-sm font-medium truncate flex-1">{team.name}</span>
                      {team.code && <span className="text-xs text-muted-foreground font-mono shrink-0">({team.code})</span>}
                      {team.groupName && <span className="text-xs text-muted-foreground shrink-0">Gr.{team.groupName}</span>}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => setDeleteTeamTarget({ id: team.id, name: team.name })}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        )}

        {/* Phases accordion */}
        {orderedPhases.length > 0 ? (
          <Accordion type="multiple" defaultValue={orderedPhases.slice(0, 2).map(p => p.key)}>
            {orderedPhases.map((phase) => (
              <AccordionItem key={phase.key} value={phase.key} className="border border-border/50 rounded-xl px-4 mb-3">
                <AccordionTrigger className="hover:no-underline py-3">
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {phase.isKnockout ? (
                      <GitBranch className="h-4 w-4 text-primary shrink-0" />
                    ) : (
                      <Trophy className="h-4 w-4 text-brand shrink-0" />
                    )}
                    {editingPhaseId === phase.id ? (
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <Input
                          value={editPhaseLabel}
                          onChange={(e) => setEditPhaseLabel(e.target.value)}
                          className="h-7 text-sm w-48"
                          autoFocus
                        />
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-green-400"
                          onClick={() => updatePhaseMutation.mutate({ phaseId: phase.id, label: editPhaseLabel })}>
                          <Save className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground"
                          onClick={() => setEditingPhaseId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : (
                      <span className="font-semibold text-sm truncate">{phase.label}</span>
                    )}
                    <Badge variant="outline" className="text-xs ml-1 shrink-0">{phase.games.length} jogos</Badge>
                    {phase.isKnockout && (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary shrink-0">Eliminatória</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1 mr-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                    {phase.id > 0 && (
                      <>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-foreground"
                          onClick={() => { setEditingPhaseId(phase.id); setEditPhaseLabel(phase.label); }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-primary"
                          title="Edição em lote"
                          onClick={() => { setBatchPhase(phase.label); setBatchEdits({}); }}>
                          <Zap className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => setDeletePhaseTarget({ id: phase.id, label: phase.label })}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  {/* Bracket visual for knockout phases — shows slots even when empty */}
                  {phase.isKnockout && (
                    <div className="mb-4 p-3 bg-muted/20 rounded-lg border border-border/30">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <GitBranch className="h-3 w-3" /> Chaveamento
                        </p>
                        {phase.slots && (
                          <span className="text-xs text-muted-foreground font-mono">
                            {phase.games.length}/{Math.ceil(phase.slots / 2)} jogos
                          </span>
                        )}
                      </div>
                      <KnockoutBracket phaseGames={phase.games} slots={phase.slots} />
                    </div>
                  )}

                  {/* Batch edit mode */}
                  {batchPhase === phase.label && (
                    <div className="mb-4 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-xs font-medium text-primary flex items-center gap-1">
                          <Zap className="h-3 w-3" /> Edição em lote — {phase.label}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1 border-primary/30 text-primary"
                            disabled={batchUpdateMutation.isPending}
                            onClick={() => {
                              const updates = Object.entries(batchEdits).map(([gameId, fields]) => ({
                                gameId: Number(gameId),
                                teamAName: fields.teamAName,
                                teamBName: fields.teamBName,
                                matchDate: fields.matchDate ? new Date(fields.matchDate) : undefined,
                                venue: fields.venue,
                              }));
                              if (updates.length === 0) { toast.error("Nenhuma alteração feita."); return; }
                              batchUpdateMutation.mutate({ tournamentId, phase: phase.label, updates });
                            }}>
                            {batchUpdateMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                            Salvar lote
                          </Button>
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => { setBatchPhase(null); setBatchEdits({}); }}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        {phase.games.map((g) => (
                          <div key={g.id} className="grid grid-cols-4 gap-2 items-center">
                            <Input
                              placeholder={g.teamAName ?? "Time A"}
                              value={batchEdits[g.id]?.teamAName ?? ""}
                              onChange={(e) => setBatchEdits(prev => ({ ...prev, [g.id]: { ...prev[g.id], teamAName: e.target.value } }))}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder={g.teamBName ?? "Time B"}
                              value={batchEdits[g.id]?.teamBName ?? ""}
                              onChange={(e) => setBatchEdits(prev => ({ ...prev, [g.id]: { ...prev[g.id], teamBName: e.target.value } }))}
                              className="h-7 text-xs"
                            />
                            <Input
                              type="datetime-local"
                              value={batchEdits[g.id]?.matchDate ?? ""}
                              onChange={(e) => setBatchEdits(prev => ({ ...prev, [g.id]: { ...prev[g.id], matchDate: e.target.value } }))}
                              className="h-7 text-xs"
                            />
                            <Input
                              placeholder={g.venue ?? "Local"}
                              value={batchEdits[g.id]?.venue ?? ""}
                              onChange={(e) => setBatchEdits(prev => ({ ...prev, [g.id]: { ...prev[g.id], venue: e.target.value } }))}
                              className="h-7 text-xs"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Games list */}
                  <div className="space-y-2">
                    {phase.games.length === 0 ? (
                      <div className="text-center py-6 text-muted-foreground text-sm">
                        <Trophy className="h-8 w-8 mx-auto mb-2 opacity-20" />
                        Nenhum jogo nesta fase.
                        <Button size="sm" variant="outline" className="mt-3 gap-1 flex mx-auto"
                          onClick={() => { setGameForm(f => ({ ...f, phase: phase.label })); setShowAddGame(true); }}>
                          <Plus className="h-3.5 w-3.5" /> Adicionar jogo
                        </Button>
                      </div>
                    ) : (() => {
                      // Group games by roundNumber when phase has rounds
                      const hasRounds = phase.games.some(g => g.roundNumber != null);
                      if (!hasRounds) {
                        return phase.games.map((g) => (
                          <div key={g.id}>
                          {editingGameId === g.id ? (
                            /* Inline edit form */
                            <div className="p-3 rounded-lg border border-brand/30 bg-brand/5 space-y-3">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Time A</Label>
                                  <Input value={editGameForm.teamAName} onChange={(e) => setEditGameForm(f => ({ ...f, teamAName: e.target.value }))} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Time B</Label>
                                  <Input value={editGameForm.teamBName} onChange={(e) => setEditGameForm(f => ({ ...f, teamBName: e.target.value }))} className="h-8 text-sm" />
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs">Data/Hora</Label>
                                  <Input type="datetime-local" value={editGameForm.matchDate} onChange={(e) => setEditGameForm(f => ({ ...f, matchDate: e.target.value }))} className="h-8 text-sm" />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs">Local</Label>
                                  <Input value={editGameForm.venue} onChange={(e) => setEditGameForm(f => ({ ...f, venue: e.target.value }))} className="h-8 text-sm" placeholder="Estádio" />
                                </div>
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Rodada <span className="text-muted-foreground">(número)</span></Label>
                                <Input
                                  type="number"
                                  min={1}
                                  placeholder="Ex: 5"
                                  value={editGameForm.roundNumber}
                                  onChange={(e) => setEditGameForm(f => ({ ...f, roundNumber: e.target.value }))}
                                  className="h-8 text-sm"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingGameId(null)}>
                                  <X className="h-3.5 w-3.5 mr-1" /> Cancelar
                                </Button>
                                <Button size="sm" className="h-7 text-xs bg-brand hover:bg-brand/90 gap-1"
                                  disabled={updateGameMutation.isPending}
                                  onClick={() => {
                                    const rn = editGameForm.roundNumber ? parseInt(editGameForm.roundNumber, 10) : undefined;
                                    updateGameMutation.mutate({
                                      gameId: g.id,
                                      teamAName: editGameForm.teamAName || undefined,
                                      teamBName: editGameForm.teamBName || undefined,
                                      matchDate: editGameForm.matchDate ? new Date(editGameForm.matchDate) : undefined,
                                      venue: editGameForm.venue || undefined,
                                      status: editGameForm.status,
                                      roundNumber: rn && rn > 0 ? rn : null,
                                    });
                                  }}>
                                  {updateGameMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                                  Salvar
                                </Button>
                              </div>
                            </div>
                          ) : (
                            /* Normal game row */
                            <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                              <div className="flex-1 min-w-0">
                                {/* Teams + score */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-medium text-sm truncate max-w-[100px] sm:max-w-none">{g.teamAName ?? "A Definir"}</span>
                                  {g.scoreA !== null && g.scoreB !== null ? (
                                    <span className="font-mono text-sm font-bold text-brand shrink-0">{g.scoreA}×{g.scoreB}</span>
                                  ) : (
                                    <span className="text-muted-foreground text-xs font-mono shrink-0">vs</span>
                                  )}
                                  <span className="font-medium text-sm truncate max-w-[100px] sm:max-w-none">{g.teamBName ?? "A Definir"}</span>
                                </div>
                                {/* Date + venue */}
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0">
                                    <Calendar className="h-2.5 w-2.5" />
                                    {format(new Date(g.matchDate), "dd/MM/yy HH:mm", { locale: ptBR })}
                                  </span>
                                  {g.venue && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[120px] sm:max-w-none">
                                      <MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{g.venue}</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 shrink-0">
                                {statusBadge(g.status)}
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-foreground"
                                  onClick={() => {
                                    setEditingGameId(g.id);
                                    setEditGameForm({
                                      teamAName: g.teamAName ?? "",
                                      teamBName: g.teamBName ?? "",
                                      matchDate: g.matchDate ? format(new Date(g.matchDate), "yyyy-MM-dd'T'HH:mm") : "",
                                      venue: g.venue ?? "",
                                      status: (g.status as GameStatus) ?? "scheduled",
                                      roundNumber: g.roundNumber != null ? String(g.roundNumber) : "",
                                    });
                                  }}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {g.status !== "finished" && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 text-xs gap-1 sm:opacity-0 sm:group-hover:opacity-100 hidden sm:flex"
                                    onClick={() => {
                                      setResultTarget({ gameId: g.id, teamA: g.teamAName ?? "Time A", teamB: g.teamBName ?? "Time B" });
                                      setResultForm({ scoreA: g.scoreA?.toString() ?? "", scoreB: g.scoreB?.toString() ?? "" });
                                      setShowSetResult(true);
                                    }}
                                  >
                                    <CheckCircle2 className="h-3 w-3" /> Resultado
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                                  onClick={() => setDeleteGameTarget({ id: g.id, teamA: g.teamAName ?? "Time A", teamB: g.teamBName ?? "Time B" })}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      ));
                      }
                      // Group by phase+roundNumber (chave composta para evitar sobreposição)
                      // Ex: "1st_phase|1", "2nd_phase|1" são grupos distintos
                      const phaseLabel = (p: string | null, rn: number | string | null): string => {
                        const phaseNames: Record<string, string> = {
                          "1st_phase": "1ª Fase",
                          "2nd_phase": "2ª Fase",
                          "3rd_phase": "3ª Fase",
                          "regular_season": "Temporada Regular",
                          "apertura": "Apertura",
                          "clausura": "Clausura",
                          "group_stage": "Fase de Grupos",
                          "round_of_16": "Oitavas de Final",
                          "quarter_finals": "Quartas de Final",
                          "semi_finals": "Semifinais",
                          "third_place": "3º Lugar",
                          "final": "Final",
                        };
                        const pName = p ? (phaseNames[p] ?? p) : null;
                        if (rn == null) return pName ?? "Sem rodada";
                        if (pName && pName !== "Fase de Grupos") return `${pName} — Rodada ${rn}`;
                        return `Rodada ${rn}`;
                      };
                      const roundMap = new Map<string, typeof games>();
                      for (const g of phase.games) {
                        const rk = `${g.phase ?? ""}|${g.roundNumber ?? ""}`;
                        if (!roundMap.has(rk)) roundMap.set(rk, []);
                        roundMap.get(rk)!.push(g);
                      }
                      const sortedRounds = [...roundMap.keys()].sort((a, b) => {
                        const [pa, ra] = a.split("|");
                        const [pb, rb] = b.split("|");
                        if (pa !== pb) return pa.localeCompare(pb);
                        const na = parseInt(ra) || 0;
                        const nb = parseInt(rb) || 0;
                        return na - nb;
                      });
                      return (
                        <div className="space-y-4">
                          {sortedRounds.map((rk) => {
                            const [phaseKey, roundNum] = rk.split("|");
                            const firstGame = roundMap.get(rk)![0];
                            const label = phaseLabel(firstGame.phase ?? null, firstGame.roundNumber ?? null);
                            return (
                            <div key={rk}>
                              <div className="flex items-center gap-2 mb-2 px-1">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                  {label}
                                </span>
                                <span className="text-xs text-muted-foreground font-mono">({roundMap.get(rk)!.length} jogos)</span>
                                <div className="flex-1 h-px bg-border/40" />
                              </div>
                              <div className="space-y-1.5">
                                {roundMap.get(rk)!.map((g) => (
                                  <div key={g.id}>
                                    {editingGameId === g.id ? (
                                      /* Inline edit form (round view) */
                                      <div className="p-3 rounded-lg border border-brand/30 bg-brand/5 space-y-3">
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1"><Label className="text-xs">Time A</Label><Input value={editGameForm.teamAName} onChange={(e) => setEditGameForm(f => ({ ...f, teamAName: e.target.value }))} className="h-8 text-sm" /></div>
                                          <div className="space-y-1"><Label className="text-xs">Time B</Label><Input value={editGameForm.teamBName} onChange={(e) => setEditGameForm(f => ({ ...f, teamBName: e.target.value }))} className="h-8 text-sm" /></div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                          <div className="space-y-1"><Label className="text-xs">Data/Hora</Label><Input type="datetime-local" value={editGameForm.matchDate} onChange={(e) => setEditGameForm(f => ({ ...f, matchDate: e.target.value }))} className="h-8 text-sm" /></div>
                                          <div className="space-y-1"><Label className="text-xs">Local</Label><Input value={editGameForm.venue} onChange={(e) => setEditGameForm(f => ({ ...f, venue: e.target.value }))} className="h-8 text-sm" placeholder="Estádio" /></div>
                                        </div>
                                        <div className="space-y-1"><Label className="text-xs">Rodada</Label><Input type="number" min={1} value={editGameForm.roundNumber} onChange={(e) => setEditGameForm(f => ({ ...f, roundNumber: e.target.value }))} className="h-8 text-sm" /></div>
                                        <div className="flex gap-2 justify-end">
                                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingGameId(null)}><X className="h-3.5 w-3.5 mr-1" /> Cancelar</Button>
                                          <Button size="sm" className="h-7 text-xs bg-brand hover:bg-brand/90 gap-1" disabled={updateGameMutation.isPending} onClick={() => { const rn = editGameForm.roundNumber ? parseInt(editGameForm.roundNumber, 10) : undefined; updateGameMutation.mutate({ gameId: g.id, teamAName: editGameForm.teamAName || undefined, teamBName: editGameForm.teamBName || undefined, matchDate: editGameForm.matchDate ? new Date(editGameForm.matchDate) : undefined, venue: editGameForm.venue || undefined, status: editGameForm.status, roundNumber: rn && rn > 0 ? rn : null }); }}>{updateGameMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />} Salvar</Button>
                                        </div>
                                      </div>
                                    ) : (
                                      /* Normal game row (round view) */
                                      <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors group">
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="font-medium text-sm truncate max-w-[100px] sm:max-w-none">{g.teamAName ?? "A Definir"}</span>
                                            {g.scoreA !== null && g.scoreB !== null ? (<span className="font-mono text-sm font-bold text-brand shrink-0">{g.scoreA}×{g.scoreB}</span>) : (<span className="text-muted-foreground text-xs font-mono shrink-0">vs</span>)}
                                            <span className="font-medium text-sm truncate max-w-[100px] sm:max-w-none">{g.teamBName ?? "A Definir"}</span>
                                          </div>
                                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                            <span className="text-xs text-muted-foreground flex items-center gap-1 shrink-0"><Calendar className="h-2.5 w-2.5" />{format(new Date(g.matchDate), "dd/MM/yy HH:mm", { locale: ptBR })}</span>
                                            {g.venue && (<span className="text-xs text-muted-foreground flex items-center gap-1 truncate max-w-[120px] sm:max-w-none"><MapPin className="h-2.5 w-2.5 shrink-0" /><span className="truncate">{g.venue}</span></span>)}
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          {statusBadge(g.status)}
                                          <Button size="icon" variant="ghost" className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-foreground" onClick={() => { setEditingGameId(g.id); setEditGameForm({ teamAName: g.teamAName ?? "", teamBName: g.teamBName ?? "", matchDate: g.matchDate ? format(new Date(g.matchDate), "yyyy-MM-dd'T'HH:mm") : "", venue: g.venue ?? "", status: (g.status as GameStatus) ?? "scheduled", roundNumber: g.roundNumber != null ? String(g.roundNumber) : "" }); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                          {g.status !== "finished" && (<Button size="sm" variant="outline" className="h-7 text-xs gap-1 sm:opacity-0 sm:group-hover:opacity-100 hidden sm:flex" onClick={() => { setResultTarget({ gameId: g.id, teamA: g.teamAName ?? "Time A", teamB: g.teamBName ?? "Time B" }); setResultForm({ scoreA: g.scoreA?.toString() ?? "", scoreB: g.scoreB?.toString() ?? "" }); setShowSetResult(true); }}><CheckCircle2 className="h-3 w-3" /> Resultado</Button>)}
                                          <Button variant="ghost" size="icon" className="h-7 w-7 sm:opacity-0 sm:group-hover:opacity-100 text-muted-foreground hover:text-red-400 hover:bg-red-500/10" onClick={() => setDeleteGameTarget({ id: g.id, teamA: g.teamAName ?? "Time A", teamB: g.teamBName ?? "Time B" })}><Trash2 className="h-3.5 w-3.5" /></Button>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                          })}
                        </div>
                      );
                    })()
                  }
                  </div>

                  {/* Generate next phase button — available for any phase with finished games */}
                  {phase.games.some(g => g.status === "finished") && (() => {
                    const currentIdx = orderedPhases.findIndex(p => p.key === phase.key);
                    const nextPhase = currentIdx >= 0 ? orderedPhases[currentIdx + 1] : undefined;
                    if (!nextPhase || nextPhase.id < 0) return null;
                    return (
                      <div className="mt-3 pt-3 border-t border-border/30">
                        <Button size="sm" variant="outline" className="gap-2 text-xs text-primary border-primary/30 hover:bg-primary/10"
                          disabled={generateNextPhaseMutation.isPending}
                          onClick={() => {
                            generateNextPhaseMutation.mutate({
                              tournamentId,
                              currentPhase: phase.label,
                              nextPhase: nextPhase.key,
                              nextPhaseLabel: nextPhase.label,
                            });
                          }}>
                          {generateNextPhaseMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5" />}
                          Gerar "{nextPhase.label}" automaticamente
                        </Button>
                      </div>
                    );
                  })()}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        ) : (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-8 text-center">
              <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhuma fase cadastrada ainda.</p>
              <div className="flex gap-2 justify-center mt-4">
                <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAddPhase(true)}>
                  <Layers className="h-4 w-4" /> Adicionar fase
                </Button>
                <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90" onClick={() => setShowAddGame(true)}>
                  <Plus className="h-4 w-4" /> Adicionar jogo
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Delete Game */}
      <AlertDialog open={!!deleteGameTarget} onOpenChange={(open) => !open && setDeleteGameTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir jogo?</AlertDialogTitle>
            <AlertDialogDescription>
              Excluir <strong>{deleteGameTarget?.teamA} vs {deleteGameTarget?.teamB}</strong>? Esta ação é permanente e todos os palpites deste jogo serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteGameTarget && deleteGameMutation.mutate({ gameId: deleteGameTarget.id })}
              disabled={deleteGameMutation.isPending}>
              {deleteGameMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir jogo
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Team */}
      <AlertDialog open={!!deleteTeamTarget} onOpenChange={(open) => !open && setDeleteTeamTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir time "{deleteTeamTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação é permanente. O time será removido do campeonato.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTeamTarget && deleteTeamMutation.mutate({ teamId: deleteTeamTarget.id })}
              disabled={deleteTeamMutation.isPending}>
              {deleteTeamMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir time
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete Phase */}
      <AlertDialog open={!!deletePhaseTarget} onOpenChange={(open) => !open && setDeletePhaseTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir fase "{deletePhaseTarget?.label}"?</AlertDialogTitle>
            <AlertDialogDescription>A fase será removida do chaveamento. Os jogos associados permanecem mas ficam sem fase.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deletePhaseTarget && deletePhaseMutation.mutate({ phaseId: deletePhaseTarget.id })}
              disabled={deletePhaseMutation.isPending}>
              {deletePhaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Excluir fase
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Modal: Adicionar Time */}
      <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Shield className="h-5 w-5 text-brand" /> Adicionar Time</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="Brasil" value={teamForm.name} onChange={(e) => setTeamForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Código</Label>
                <Input placeholder="BRA" maxLength={10} value={teamForm.code} onChange={(e) => setTeamForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1">
                <Label>Grupo</Label>
                <Input placeholder="A" maxLength={10} value={teamForm.groupName} onChange={(e) => setTeamForm(f => ({ ...f, groupName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL da Bandeira</Label>
              <Input placeholder="https://..." value={teamForm.flagUrl} onChange={(e) => setTeamForm(f => ({ ...f, flagUrl: e.target.value }))} />
            </div>
            <Button className="w-full bg-brand hover:bg-brand/90"
              disabled={!teamForm.name || addTeamMutation.isPending}
              onClick={() => addTeamMutation.mutate({ tournamentId, name: teamForm.name, code: teamForm.code || undefined, flagUrl: teamForm.flagUrl || undefined, groupName: teamForm.groupName || undefined })}>
              {addTeamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Adicionar Time
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Fase */}
      <Dialog open={showAddPhase} onOpenChange={setShowAddPhase}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Layers className="h-5 w-5 text-brand" /> Adicionar Fase</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome da fase *</Label>
              <Input placeholder="Quartas de Final" value={phaseForm.label} onChange={(e) => setPhaseForm(f => ({ ...f, label: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Chave (slug) *</Label>
              <Input placeholder="quarter_finals" value={phaseForm.key} onChange={(e) => setPhaseForm(f => ({ ...f, key: e.target.value.toLowerCase().replace(/\s+/g, "_") }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Ordem</Label>
                <Input type="number" min={1} value={phaseForm.order} onChange={(e) => setPhaseForm(f => ({ ...f, order: Number(e.target.value) }))} />
              </div>
              <div className="space-y-1">
                <Label>Vagas (slots)</Label>
                <Input type="number" min={2} value={phaseForm.slots} onChange={(e) => setPhaseForm(f => ({ ...f, slots: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <Label>Fase eliminatória?</Label>
              <Switch checked={phaseForm.isKnockout} onCheckedChange={(v) => setPhaseForm(f => ({ ...f, isKnockout: v }))} />
            </div>
            <Button className="w-full bg-brand hover:bg-brand/90"
              disabled={!phaseForm.label || !phaseForm.key || addPhaseMutation.isPending}
              onClick={() => addPhaseMutation.mutate({ tournamentId, key: phaseForm.key, label: phaseForm.label, order: phaseForm.order, slots: phaseForm.slots, isKnockout: phaseForm.isKnockout })}>
              {addPhaseMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Adicionar Fase
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Adicionar Jogo */}
      <Dialog open={showAddGame} onOpenChange={setShowAddGame}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Trophy className="h-5 w-5 text-brand" /> Adicionar Jogo</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Fase</Label>
              <Select value={gameForm.phase} onValueChange={(v) => setGameForm(f => ({ ...f, phase: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecionar fase..." /></SelectTrigger>
                <SelectContent>
                  {phases.map((p) => (
                    <SelectItem key={p.key} value={p.label}>{p.label}</SelectItem>
                  ))}
                  <SelectItem value="Sem fase">Sem fase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Time A *</Label>
                <Input placeholder="Brasil" value={gameForm.teamAName} onChange={(e) => setGameForm(f => ({ ...f, teamAName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Time B *</Label>
                <Input placeholder="Argentina" value={gameForm.teamBName} onChange={(e) => setGameForm(f => ({ ...f, teamBName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" value={gameForm.matchDate} onChange={(e) => setGameForm(f => ({ ...f, matchDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Estádio / Local</Label>
              <Input placeholder="Maracanã, Rio de Janeiro" value={gameForm.venue} onChange={(e) => setGameForm(f => ({ ...f, venue: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Rodada <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Input
                type="number"
                min={1}
                placeholder="Ex: 5"
                value={gameForm.roundNumber}
                onChange={(e) => setGameForm(f => ({ ...f, roundNumber: e.target.value }))}
              />
            </div>
            <Button className="w-full bg-brand hover:bg-brand/90"
              disabled={!gameForm.teamAName || !gameForm.teamBName || !gameForm.matchDate || addGameMutation.isPending}
              onClick={() => {
                const rn = gameForm.roundNumber ? parseInt(gameForm.roundNumber, 10) : undefined;
                addGameMutation.mutate({
                  tournamentId,
                  phase: gameForm.phase || "Sem fase",
                  teamAName: gameForm.teamAName,
                  teamBName: gameForm.teamBName,
                  matchDate: new Date(gameForm.matchDate).getTime(),
                  venue: gameForm.venue || undefined,
                  roundNumber: rn && rn > 0 ? rn : undefined,
                });
              }}>
              {addGameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Adicionar Jogo
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal: Registrar Resultado */}
      <Dialog open={showSetResult} onOpenChange={(open) => { setShowSetResult(open); if (!open) setResultTarget(null); }}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><CheckCircle2 className="h-5 w-5 text-green-400" /> Registrar Resultado</DialogTitle>
          </DialogHeader>
          {resultTarget && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium">{resultTarget.teamA}</p>
                  <Input type="number" min="0" max="99" className="w-16 text-center font-mono text-xl mt-2"
                    value={resultForm.scoreA} onChange={(e) => setResultForm(f => ({ ...f, scoreA: e.target.value }))} />
                </div>
                <span className="text-muted-foreground font-mono text-lg">×</span>
                <div className="text-center">
                  <p className="text-sm font-medium">{resultTarget.teamB}</p>
                  <Input type="number" min="0" max="99" className="w-16 text-center font-mono text-xl mt-2"
                    value={resultForm.scoreB} onChange={(e) => setResultForm(f => ({ ...f, scoreB: e.target.value }))} />
                </div>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700"
                disabled={resultForm.scoreA === "" || resultForm.scoreB === "" || setResultMutation.isPending}
                onClick={() => setResultMutation.mutate({ gameId: resultTarget.gameId, scoreA: Number(resultForm.scoreA), scoreB: Number(resultForm.scoreB) })}>
                {setResultMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Confirmar Resultado
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal: Importar via Google Sheets */}
      <Dialog open={showSheetsModal} onOpenChange={(open) => { setShowSheetsModal(open); if (!open) setSheetsUrl(""); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-green-400" /> Importar Jogos via Google Sheets</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole a URL pública da planilha. Colunas esperadas:
              <span className="font-mono text-xs block mt-1 bg-muted/50 px-2 py-1 rounded">Time A, Time B, Data/Hora, Prazo, Fase, Local</span>
            </p>
            <div className="space-y-1.5">
              <Label>URL da Planilha</Label>
              <Input placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetsUrl} onChange={(e) => setSheetsUrl(e.target.value)} />
            </div>
            <Button className="w-full bg-green-600 hover:bg-green-700"
              disabled={!sheetsUrl.trim() || importSheetsMutation.isPending}
              onClick={() => importSheetsMutation.mutate({ tournamentId, sheetsUrl: sheetsUrl.trim() })}>
              {importSheetsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileSpreadsheet className="h-4 w-4 mr-2" />}
              Importar Jogos
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
