import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ClipboardList, CheckCircle2, AlertCircle, Trophy, Search,
  Save, RefreshCw, ChevronDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";

type GameResult = {
  gameId: number;
  homeScore: string;
  awayScore: string;
};

export default function AdminGameResults() {
  const [search, setSearch] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<string>("all");
  const [results, setResults] = useState<Record<number, { home: string; away: string }>>({});
  const [saving, setSaving] = useState(false);
  const [savedAll, setSavedAll] = useState(false);

  const { data: pending, isLoading, refetch } = trpc.adminDashboard.getPendingGames.useQuery();
  const utils = trpc.useUtils();

  const updateResultMutation = trpc.tournaments.setResult.useMutation();

  const filtered = (pending ?? []).filter((g) => {
    const matchSearch = !search ||
      (g.teamAName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.teamBName ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (g.tournamentName ?? "").toLowerCase().includes(search.toLowerCase());
    const matchTournament = selectedTournament === "all" || String(g.tournamentId) === selectedTournament;
    return matchSearch && matchTournament;
  });

  const tournaments = Array.from(
    new Map((pending ?? []).map((g) => [g.tournamentId, g.tournamentName])).entries()
  );

  const setResult = (gameId: number, field: "home" | "away", value: string) => {
    const cleaned = value.replace(/\D/g, "").slice(0, 2);
    setResults((prev) => ({
      ...prev,
      [gameId]: { ...prev[gameId], [field]: cleaned },
    }));
  };

  const readyToSave = filtered.filter((g) => {
    const r = results[g.id];
    return r && r.home !== "" && r.away !== "";
  });

  const handleSaveAll = async () => {
    if (readyToSave.length === 0) {
      toast.error("Preencha pelo menos um resultado antes de salvar.");
      return;
    }
    setSaving(true);
    let success = 0;
    let errors = 0;
    for (const game of readyToSave) {
      const r = results[game.id];
      try {
        await updateResultMutation.mutateAsync({
          gameId: game.id,
          scoreA: parseInt(r.home),
          scoreB: parseInt(r.away),
        });
        success++;
      } catch {
        errors++;
      }
    }
    setSaving(false);
    if (errors === 0) {
      setSavedAll(true);
      setTimeout(() => setSavedAll(false), 3000);
    } else {
      toast.error(`${success} salvo(s), ${errors} erro(s). Verifique e tente novamente.`);
    }
    setResults({});
    refetch();
    utils.adminDashboard.getDashboardAlerts.invalidate();
  };

  return (
    <AdminLayout activeSection="game-results">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-brand" />
              Resultados Pendentes
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Registre os resultados de múltiplos jogos de uma vez
            </p>
          </div>
          <div className="flex items-center gap-2">
            {readyToSave.length > 0 && (
              <Badge variant="outline" className="text-brand border-brand/30 bg-brand/5">
                {readyToSave.length} pronto(s) para salvar
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={handleSaveAll}
              disabled={saving || readyToSave.length === 0}
              className={`gap-1.5 transition-all duration-300 ${
                savedAll ? "bg-green-600 hover:bg-green-700 text-white" : ""
              }`}
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : savedAll ? (
                <CheckCircle2 className="h-3.5 w-3.5" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              {saving ? "Salvando..." : savedAll ? "Salvo!" : `Salvar ${readyToSave.length > 0 ? `(${readyToSave.length})` : "Tudo"}`}
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por time ou campeonato..."
              className="pl-9 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {tournaments.length > 1 && (
            <Select value={selectedTournament} onValueChange={setSelectedTournament}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="Todos os campeonatos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os campeonatos</SelectItem>
                {tournaments.map(([id, name]) => (
                  <SelectItem key={id} value={String(id)}>{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Lista de jogos */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                Jogos sem resultado ({filtered.length})
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-4 space-y-3">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto mb-3" />
                <p className="font-medium text-emerald-400">Tudo em dia!</p>
                <p className="text-sm text-muted-foreground mt-1">Nenhum jogo aguardando resultado.</p>
              </div>
            ) : (
              <div className="divide-y divide-border/30">
                {filtered.map((game) => {
                  const r = results[game.id] ?? { home: "", away: "" };
                  const isReady = r.home !== "" && r.away !== "";

                  return (
                    <div
                      key={game.id}
                      className={`px-4 py-3 transition-colors ${isReady ? "bg-brand/5 border-l-2 border-brand" : "hover:bg-muted/10"}`}
                    >
                      <div className="flex items-center justify-between gap-4">
                        {/* Info do jogo */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs text-muted-foreground">{game.tournamentName}</span>
                            {game.phase && (
                              <Badge variant="outline" className="text-xs h-4 px-1.5">{game.phase}</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="font-medium text-sm">{game.teamAName ?? "Time A"}</span>
                            <span className="text-xs text-muted-foreground">vs</span>
                            <span className="font-medium text-sm">{game.teamBName ?? "Time B"}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {format(new Date(game.matchDate), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>

                        {/* Inputs de resultado */}
                        <div className="flex items-center gap-2 shrink-0">
                          <Input
                            className="w-14 h-9 text-center font-mono text-base font-bold"
                            placeholder="0"
                            value={r.home}
                            onChange={(e) => setResult(game.id, "home", e.target.value)}
                            inputMode="numeric"
                          />
                          <span className="text-muted-foreground font-bold">×</span>
                          <Input
                            className="w-14 h-9 text-center font-mono text-base font-bold"
                            placeholder="0"
                            value={r.away}
                            onChange={(e) => setResult(game.id, "away", e.target.value)}
                            inputMode="numeric"
                          />
                          {isReady && (
                            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {readyToSave.length > 0 && (
          <div className="flex justify-end">
            <Button
              onClick={handleSaveAll}
              disabled={saving}
              size="lg"
              className={`gap-2 transition-all duration-300 ${
                savedAll ? "bg-green-600 hover:bg-green-700" : ""
              }`}
            >
              {saving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : savedAll ? (
                <CheckCircle2 className="h-4 w-4" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {saving ? "Salvando resultados..." : savedAll ? "Salvo!" : `Confirmar ${readyToSave.length} resultado(s)`}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
