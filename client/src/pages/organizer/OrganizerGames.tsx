/**
 * OrganizerGames — Gestão de jogos e registro de resultados (Pro)
 * Exibe todos os jogos do campeonato vinculado ao bolão.
 * Organizadores Pro podem registrar o placar de cada jogo encerrado.
 */
import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import OrganizerLayout from "@/components/OrganizerLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Crown, Trophy, CheckCircle2, Clock, PlayCircle, XCircle, Pencil } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

type GameStatus = "scheduled" | "live" | "finished" | "cancelled";

const STATUS_CONFIG: Record<GameStatus, { label: string; color: string; icon: React.ElementType }> = {
  scheduled: { label: "Agendado", color: "bg-blue-500/20 text-blue-400 border-blue-500/30", icon: Clock },
  live:       { label: "Ao Vivo", color: "bg-green-500/20 text-green-400 border-green-500/30", icon: PlayCircle },
  finished:   { label: "Encerrado", color: "bg-muted/50 text-muted-foreground border-border/50", icon: CheckCircle2 },
  cancelled:  { label: "Cancelado", color: "bg-red-500/20 text-red-400 border-red-500/30", icon: XCircle },
};

interface GameRow {
  id: number;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  matchDate: Date | null;
  status: string;
  phase: string | null;
  venue: string | null;
}

export default function OrganizerGames() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;
  const games: GameRow[] = (poolData?.games ?? []) as GameRow[];

  const isPro = pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.planExpiresAt && new Date(pool.planExpiresAt).getTime() < Date.now();

  // Dialog state
  const [editGame, setEditGame] = useState<GameRow | null>(null);
  const [scoreA, setScoreA] = useState("");
  const [scoreB, setScoreB] = useState("");

  const setResultMutation = trpc.pools.setGameResult.useMutation({
    onSuccess: () => {
      toast.success("Resultado registrado e pontuações recalculadas.");
      setEditGame(null);
      refetchPool();
    },
    onError: (err) => toast.error(err.message || "Erro ao registrar resultado."),
  });

  const { refetch: refetchPool } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const openEdit = (game: GameRow) => {
    setEditGame(game);
    setScoreA(game.scoreA !== null ? String(game.scoreA) : "");
    setScoreB(game.scoreB !== null ? String(game.scoreB) : "");
  };

  const handleSave = () => {
    if (!editGame || !pool?.id) return;
    const a = parseInt(scoreA, 10);
    const b = parseInt(scoreB, 10);
    if (isNaN(a) || isNaN(b) || a < 0 || b < 0) {
      toast.error("Informe um placar válido (números inteiros ≥ 0).");
      return;
    }
    setResultMutation.mutate({ poolId: pool.id, gameId: editGame.id, scoreA: a, scoreB: b });
  };

  // Agrupar por fase
  const phases = games.reduce<Record<string, GameRow[]>>((acc, g) => {
    const phase = g.phase ?? "Sem fase";
    if (!acc[phase]) acc[phase] = [];
    acc[phase].push(g);
    return acc;
  }, {});

  if (poolLoading) {
    return (
      <OrganizerLayout slug={slug ?? ""} poolName="Carregando..." poolStatus="active" isPro={false} activeSection="games">
        <div className="p-6 space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
        </div>
      </OrganizerLayout>
    );
  }

  if (!isPro) {
    return (
      <OrganizerLayout slug={slug ?? ""} poolName={pool?.name ?? ""} poolStatus={(pool?.status as any) ?? "active"} isPro={false} isProExpired={false} activeSection="games">
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4 p-6">
          <Crown className="h-12 w-12 text-yellow-400" />
          <h2 className="text-xl font-bold font-display">Recurso Exclusivo Pro</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            O registro de resultados e a gestão de jogos são exclusivos do Plano Pro.
          </p>
          <Link href={`/pool/${slug}/manage/plan`}>
            <Button className="bg-brand hover:bg-brand/90 gap-2">
              <Crown className="h-4 w-4" /> Fazer Upgrade para Pro
            </Button>
          </Link>
        </div>
      </OrganizerLayout>
    );
  }

  const hasTournament = !!pool?.tournamentId;

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="games"
    >
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Jogos e Resultados
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Registre os placares dos jogos para calcular a pontuação dos participantes automaticamente.
          </p>
        </div>

        {/* Sem campeonato vinculado */}
        {!hasTournament && (
          <div className="border border-dashed border-border/50 rounded-xl p-8 text-center space-y-3">
            <Trophy className="h-10 w-10 text-muted-foreground/40 mx-auto" />
            <p className="font-medium text-sm">Nenhum campeonato vinculado</p>
            <p className="text-muted-foreground text-xs max-w-xs mx-auto">
              Crie um campeonato personalizado para que os jogos apareçam aqui.
            </p>
            <Link href={`/pool/${slug}/manage/tournament`}>
              <Button size="sm" variant="outline" className="gap-2 mt-1">
                <Trophy className="h-4 w-4" /> Criar Campeonato
              </Button>
            </Link>
          </div>
        )}

        {/* Lista de jogos por fase */}
        {hasTournament && games.length === 0 && (
          <div className="border border-dashed border-border/50 rounded-xl p-8 text-center space-y-2">
            <p className="text-muted-foreground text-sm">Nenhum jogo cadastrado no campeonato ainda.</p>
            <Link href={`/pool/${slug}/manage/tournament`}>
              <Button size="sm" variant="outline" className="gap-2 mt-1">
                <Pencil className="h-4 w-4" /> Adicionar Jogos
              </Button>
            </Link>
          </div>
        )}

        {Object.entries(phases).map(([phase, phaseGames]) => (
          <div key={phase} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
              {phase}
            </h2>
            <div className="space-y-2">
              {phaseGames.map((game) => {
                const statusCfg = STATUS_CONFIG[(game.status as GameStatus)] ?? STATUS_CONFIG.scheduled;
                const StatusIcon = statusCfg.icon;
                const hasResult = game.scoreA !== null && game.scoreB !== null;
                const canEdit = isPro && !isProExpired;

                return (
                  <div
                    key={game.id}
                    className="bg-card border border-border/30 rounded-xl px-4 py-3 flex items-center gap-4"
                  >
                    {/* Times e placar */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <span className="truncate">{game.teamAName ?? "Time A"}</span>
                        <span className="text-muted-foreground shrink-0">
                          {hasResult ? (
                            <span className="font-mono font-bold text-foreground">
                              {game.scoreA} × {game.scoreB}
                            </span>
                          ) : (
                            <span className="text-muted-foreground/50">vs</span>
                          )}
                        </span>
                        <span className="truncate">{game.teamBName ?? "Time B"}</span>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        {game.matchDate && (
                          <span className="text-xs text-muted-foreground">
                            {format(new Date(game.matchDate), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        )}
                        {game.venue && (
                          <span className="text-xs text-muted-foreground/60">· {game.venue}</span>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <Badge className={`text-xs border shrink-0 gap-1 ${statusCfg.color}`}>
                      <StatusIcon className="h-3 w-3" />
                      {statusCfg.label}
                    </Badge>

                    {/* Botão de editar resultado */}
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="shrink-0 gap-1.5 text-xs"
                        onClick={() => openEdit(game)}
                      >
                        <Pencil className="h-3 w-3" />
                        {hasResult ? "Editar" : "Registrar"}
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Dialog de registro de resultado */}
      <Dialog open={!!editGame} onOpenChange={(open) => !open && setEditGame(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Registrar Resultado</DialogTitle>
          </DialogHeader>
          {editGame && (
            <div className="space-y-4 py-2">
              <p className="text-sm text-center font-medium">
                {editGame.teamAName ?? "Time A"} <span className="text-muted-foreground">vs</span> {editGame.teamBName ?? "Time B"}
              </p>
              <div className="flex items-center gap-3">
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{editGame.teamAName ?? "Time A"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={scoreA}
                    onChange={(e) => setScoreA(e.target.value)}
                    className="text-center font-mono text-lg font-bold"
                    placeholder="0"
                  />
                </div>
                <span className="text-muted-foreground font-bold mt-5">×</span>
                <div className="flex-1 space-y-1">
                  <Label className="text-xs">{editGame.teamBName ?? "Time B"}</Label>
                  <Input
                    type="number"
                    min={0}
                    max={99}
                    value={scoreB}
                    onChange={(e) => setScoreB(e.target.value)}
                    className="text-center font-mono text-lg font-bold"
                    placeholder="0"
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Ao salvar, as pontuações de todos os participantes serão recalculadas automaticamente.
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditGame(null)}>Cancelar</Button>
            <Button
              className="bg-brand hover:bg-brand/90"
              onClick={handleSave}
              disabled={setResultMutation.isPending}
            >
              {setResultMutation.isPending ? "Salvando..." : "Salvar Resultado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
}
