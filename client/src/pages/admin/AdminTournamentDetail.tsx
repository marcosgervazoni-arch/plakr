/**
 * AdminTournamentDetail — /admin/tournaments/:id
 * Página de detalhes de um campeonato: times, jogos, fases, edição inline.
 */
import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Globe,
  Loader2,
  Plus,
  Shield,
  Trophy,
  Users,
  Pencil,
  Flag,
  RefreshCw,
  FileSpreadsheet,
} from "lucide-react";
import { useState } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";

type GameStatus = "scheduled" | "live" | "finished" | "cancelled";

export default function AdminTournamentDetail() {
  const { id } = useParams<{ id: string }>();
  const tournamentId = Number(id);
  const [, navigate] = useLocation();

  const { data, isLoading, refetch } = trpc.tournaments.getById.useQuery(
    { id: tournamentId },
    { enabled: !isNaN(tournamentId) }
  );

  // ── Recalculate ──
  const recalculateMutation = trpc.tournaments.recalculatePool.useMutation({
    onSuccess: (data) => {
      toast.success(`Pontuação recalculada! ${data.totalRecalculated} membros atualizados.`);
      refetch();
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
  const [gameForm, setGameForm] = useState({
    phase: "group",
    teamAName: "",
    teamBName: "",
    matchDate: "",
    venue: "",
  });

  // ── Set Result form ──
  const [showSetResult, setShowSetResult] = useState(false);
  const [resultTarget, setResultTarget] = useState<{ gameId: number; teamA: string; teamB: string } | null>(null);
  const [resultForm, setResultForm] = useState({ scoreA: "", scoreB: "" });

  const addTeamMutation = trpc.tournaments.addTeam.useMutation({
    onSuccess: () => { toast.success("Time adicionado."); setShowAddTeam(false); setTeamForm({ name: "", code: "", flagUrl: "", groupName: "" }); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const addGameMutation = trpc.tournaments.addGame.useMutation({
    onSuccess: () => { toast.success("Jogo adicionado."); setShowAddGame(false); setGameForm({ phase: "group", teamAName: "", teamBName: "", matchDate: "", venue: "" }); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const setResultMutation = trpc.tournaments.setResult.useMutation({
    onSuccess: () => { toast.success("Resultado registrado."); setShowSetResult(false); setResultTarget(null); refetch(); },
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

  // Group games by phase
  const gamesByPhase: Record<string, typeof games> = {};
  for (const g of games) {
    const phase = g.phase ?? "Sem fase";
    if (!gamesByPhase[phase]) gamesByPhase[phase] = [];
    gamesByPhase[phase].push(g);
  }

  const statusBadge = (status: GameStatus | string | null) => {
    if (!status || status === "scheduled") return <Badge variant="outline" className="text-xs border-muted-foreground/30 text-muted-foreground gap-1"><Clock className="h-2.5 w-2.5" />Agendado</Badge>;
    if (status === "live") return <Badge variant="outline" className="text-xs border-green-400/50 text-green-400 gap-1"><div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />Ao vivo</Badge>;
    if (status === "finished") return <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400 gap-1"><CheckCircle2 className="h-2.5 w-2.5" />Encerrado</Badge>;
    return <Badge variant="outline" className="text-xs">{status}</Badge>;
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

        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
            {tournament.logoUrl ? (
              <img src={tournament.logoUrl} alt={tournament.name} className="w-10 h-10 object-contain rounded" />
            ) : (
              <Trophy className="h-7 w-7 text-brand" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold font-display">{tournament.name}</h1>
              {tournament.isGlobal && (
                <Badge variant="outline" className="text-xs border-blue-400/30 text-blue-400">
                  <Globe className="h-2.5 w-2.5 mr-1" />Global
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground font-mono mt-0.5">
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
          <div className="flex flex-wrap gap-2 shrink-0">
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowAddTeam(true)}>
              <Shield className="h-4 w-4" /> Adicionar Time
            </Button>
            <Button size="sm" variant="outline" className="gap-2" onClick={() => setShowSheetsModal(true)}>
              <FileSpreadsheet className="h-4 w-4" /> Importar Sheets
            </Button>
            <Button size="sm" variant="outline" className="gap-2 text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
              disabled={recalculateMutation.isPending}
              onClick={() => recalculateMutation.mutate({ tournamentId })}>
              {recalculateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              Recalcular Pontos
            </Button>
            <Button size="sm" className="gap-2 bg-brand hover:bg-brand/90" onClick={() => setShowAddGame(true)}>
              <Plus className="h-4 w-4" /> Adicionar Jogo
            </Button>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
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

        {/* Teams */}
        {teams.length > 0 && (
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Shield className="h-4 w-4 text-brand" /> Times ({teams.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-1.5">
                    {team.flagUrl ? (
                      <img src={team.flagUrl} alt={team.name} className="w-5 h-5 object-contain rounded-sm" />
                    ) : (
                      <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{team.name}</span>
                    {team.code && <span className="text-xs text-muted-foreground font-mono">({team.code})</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Games by phase */}
        {Object.keys(gamesByPhase).length > 0 ? (
          Object.entries(gamesByPhase).map(([phase, phaseGames]) => (
            <Card key={phase} className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-brand" />
                  {phase === "group" ? "Fase de Grupos" : phase === "round_of_16" ? "Oitavas de Final" : phase === "quarter" ? "Quartas de Final" : phase === "semi" ? "Semifinais" : phase === "final" ? "Final" : phase}
                  <Badge variant="outline" className="text-xs ml-auto">{phaseGames.length} jogos</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {phaseGames.map((g) => (
                  <div key={g.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{g.teamAName ?? "Time A"}</span>
                        {g.scoreA !== null && g.scoreB !== null ? (
                          <span className="font-mono text-sm font-bold text-brand">{g.scoreA} × {g.scoreB}</span>
                        ) : (
                          <span className="text-muted-foreground text-xs font-mono">vs</span>
                        )}
                        <span className="font-medium text-sm">{g.teamBName ?? "Time B"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(g.matchDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </span>
                        {g.venue && <span className="text-xs text-muted-foreground">· {g.venue}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {statusBadge(g.status)}
                      {g.status !== "finished" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1"
                          onClick={() => {
                            setResultTarget({ gameId: g.id, teamA: g.teamAName ?? "Time A", teamB: g.teamBName ?? "Time B" });
                            setResultForm({ scoreA: g.scoreA?.toString() ?? "", scoreB: g.scoreB?.toString() ?? "" });
                            setShowSetResult(true);
                          }}
                        >
                          <Pencil className="h-3 w-3" /> Resultado
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="border-border/50 border-dashed">
            <CardContent className="p-8 text-center">
              <Trophy className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground text-sm">Nenhum jogo cadastrado ainda.</p>
              <Button size="sm" className="mt-4 gap-2 bg-brand hover:bg-brand/90" onClick={() => setShowAddGame(true)}>
                <Plus className="h-4 w-4" /> Adicionar primeiro jogo
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: Adicionar Time */}
      <Dialog open={showAddTeam} onOpenChange={setShowAddTeam}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-brand" /> Adicionar Time
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Nome *</Label>
              <Input placeholder="Brasil" value={teamForm.name}
                onChange={(e) => setTeamForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Código (sigla)</Label>
                <Input placeholder="BRA" maxLength={10} value={teamForm.code}
                  onChange={(e) => setTeamForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} />
              </div>
              <div className="space-y-1">
                <Label>Grupo</Label>
                <Input placeholder="A" maxLength={10} value={teamForm.groupName}
                  onChange={(e) => setTeamForm(f => ({ ...f, groupName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>URL da Bandeira</Label>
              <Input placeholder="https://..." value={teamForm.flagUrl}
                onChange={(e) => setTeamForm(f => ({ ...f, flagUrl: e.target.value }))} />
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

      {/* Modal: Adicionar Jogo */}
      <Dialog open={showAddGame} onOpenChange={setShowAddGame}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" /> Adicionar Jogo
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Fase</Label>
              <Select value={gameForm.phase} onValueChange={(v) => setGameForm(f => ({ ...f, phase: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="group">Fase de Grupos</SelectItem>
                  <SelectItem value="round_of_16">Oitavas de Final</SelectItem>
                  <SelectItem value="quarter">Quartas de Final</SelectItem>
                  <SelectItem value="semi">Semifinais</SelectItem>
                  <SelectItem value="final">Final</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Time A *</Label>
                <Input placeholder="Brasil" value={gameForm.teamAName}
                  onChange={(e) => setGameForm(f => ({ ...f, teamAName: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Time B *</Label>
                <Input placeholder="Argentina" value={gameForm.teamBName}
                  onChange={(e) => setGameForm(f => ({ ...f, teamBName: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Data e Hora *</Label>
              <Input type="datetime-local" value={gameForm.matchDate}
                onChange={(e) => setGameForm(f => ({ ...f, matchDate: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Estádio / Local</Label>
              <Input placeholder="Maracanã, Rio de Janeiro" value={gameForm.venue}
                onChange={(e) => setGameForm(f => ({ ...f, venue: e.target.value }))} />
            </div>

            <Button className="w-full bg-brand hover:bg-brand/90"
              disabled={!gameForm.teamAName || !gameForm.teamBName || !gameForm.matchDate || addGameMutation.isPending}
              onClick={() => addGameMutation.mutate({
                tournamentId,
                phase: gameForm.phase,
                teamAName: gameForm.teamAName,
                teamBName: gameForm.teamBName,
                matchDate: new Date(gameForm.matchDate).getTime(),
                venue: gameForm.venue || undefined,
              })}>
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
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-400" /> Registrar Resultado
            </DialogTitle>
          </DialogHeader>
          {resultTarget && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-4">
                <div className="text-center">
                  <p className="text-sm font-medium">{resultTarget.teamA}</p>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    className="w-16 text-center font-mono text-xl mt-2"
                    value={resultForm.scoreA}
                    onChange={(e) => setResultForm(f => ({ ...f, scoreA: e.target.value }))}
                  />
                </div>
                <span className="text-muted-foreground font-mono text-lg">×</span>
                <div className="text-center">
                  <p className="text-sm font-medium">{resultTarget.teamB}</p>
                  <Input
                    type="number"
                    min="0"
                    max="99"
                    className="w-16 text-center font-mono text-xl mt-2"
                    value={resultForm.scoreB}
                    onChange={(e) => setResultForm(f => ({ ...f, scoreB: e.target.value }))}
                  />
                </div>
              </div>
              <Button className="w-full bg-green-600 hover:bg-green-700"
                disabled={resultForm.scoreA === "" || resultForm.scoreB === "" || setResultMutation.isPending}
                onClick={() => setResultMutation.mutate({
                  gameId: resultTarget.gameId,
                  scoreA: Number(resultForm.scoreA),
                  scoreB: Number(resultForm.scoreB),
                })}>
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
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="h-5 w-5 text-green-400" /> Importar Jogos via Google Sheets
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Cole a URL pública da planilha. A planilha deve ter as colunas nesta ordem:
              <span className="font-mono text-xs block mt-1 bg-muted/50 px-2 py-1 rounded">Time A, Time B, Data/Hora, Prazo, Fase, Local</span>
            </p>
            <div className="space-y-1.5">
              <Label>URL da Planilha</Label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={sheetsUrl}
                onChange={(e) => setSheetsUrl(e.target.value)}
              />
            </div>
            <Button
              className="w-full bg-green-600 hover:bg-green-700"
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
