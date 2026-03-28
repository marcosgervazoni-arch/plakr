/**
 * Central de Palpites — /pool/:slug/history
 *
 * Tela única com filtros inline. O usuário age sem sair da página:
 *  - Falta palpitar → campos inline + salvar
 *  - Aguardando resultado → palpite registrado + countdown
 *  - Acertei / Errei → resultado + pontos
 *
 * Filtros: Todos | Falta palpitar (N) | Aguardando | Acertei | Errei
 * Ordenação: urgência primeiro (prazo mais próximo), depois cronológico.
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import BetBreakdownBadges from "@/components/BetBreakdownBadges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Trophy,
  Target,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  PenLine,
  Timer,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ─── Tipos de filtro ──────────────────────────────────────────────────────────
type FilterKey = "all" | "pending" | "waiting" | "correct" | "wrong";

// ─── Configuração visual por resultado ───────────────────────────────────────
const resultCfg = {
  exact: {
    label: "Placar Exato",
    color: "text-[#00FF88]",
    border: "border-[#00FF88]/20",
    bg: "bg-[#00FF88]/5",
    icon: Trophy,
  },
  correct_result: {
    label: "Resultado Correto",
    color: "text-[#00C2FF]",
    border: "border-[#00C2FF]/20",
    bg: "bg-[#00C2FF]/5",
    icon: CheckCircle2,
  },
  wrong: {
    label: "Errado",
    color: "text-[#FF3B3B]",
    border: "border-[#FF3B3B]/20",
    bg: "bg-[#FF3B3B]/5",
    icon: XCircle,
  },
  pending: {
    label: "Aguardando resultado",
    color: "text-muted-foreground",
    border: "border-border/30",
    bg: "bg-muted/10",
    icon: Clock,
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getDeadline(matchDate: Date, deadlineMinutes: number): Date {
  return new Date(matchDate.getTime() - deadlineMinutes * 60 * 1000);
}

function isDeadlineSoon(deadline: Date): boolean {
  const diff = deadline.getTime() - Date.now();
  return diff > 0 && diff < 2 * 60 * 60 * 1000; // < 2h
}

function isDeadlinePassed(deadline: Date): boolean {
  return Date.now() > deadline.getTime();
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function BetHistory() {
  const { slug } = useParams<{ slug: string }>();
  const [activeFilter, setActiveFilter] = useState<FilterKey>("pending");

  // Estado dos inputs de palpite inline: { [gameId]: { a: string; b: string } }
  const [inlineInputs, setInlineInputs] = useState<
    Record<number, { a: string; b: string }>
  >({});
  // Quais cards pendentes estão com saving em andamento
  const [savingIds, setSavingIds] = useState<Set<number>>(new Set());

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: poolData } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const poolId = poolData?.pool?.id;

  const { data: betsRaw, isLoading: loadingBets, refetch: refetchBets } =
    trpc.bets.myBets.useQuery({ poolId: poolId! }, { enabled: !!poolId });

  const { data: games, isLoading: loadingGames } = trpc.pools.getGames.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const { data: scoringRules } = trpc.pools.getScoringRulesPublic.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const deadlineMinutes = scoringRules?.bettingDeadlineMinutes ?? 60;

  const placeBetMutation = trpc.bets.placeBet.useMutation({
    onSuccess: () => {
      refetchBets();
    },
    onError: (err) => {
      toast.error("Erro ao salvar palpite", { description: err.message });
    },
  });

  // ── Merge bets + games ────────────────────────────────────────────────────
  const bets = Array.isArray(betsRaw) ? betsRaw : (betsRaw?.items ?? []);

  const { enrichedGames, betMap } = useMemo(() => {
    if (!games) return { enrichedGames: [], betMap: new Map() };
    const bm = new Map(bets.map((b) => [b.gameId, b]));
    const eg = games
      .filter((g) => g.status !== "cancelled")
      .map((g) => ({ ...g, bet: bm.get(g.id) ?? null }));
    return { enrichedGames: eg, betMap: bm };
  }, [games, bets]);

  // ── Classificação de cada jogo ────────────────────────────────────────────
  type EnrichedGame = (typeof enrichedGames)[0];

  function classifyGame(g: EnrichedGame): FilterKey {
    const matchDate = new Date(g.matchDate);
    const deadline = getDeadline(matchDate, deadlineMinutes);

    if (!g.bet) {
      // Sem palpite: só é "falta palpitar" se o prazo não passou
      if (!isDeadlinePassed(deadline)) return "pending";
      // Prazo passou sem palpite → trata como "errado" (perdeu a chance)
      return "wrong";
    }

    if (g.bet.resultType === "pending") return "waiting";
    if (g.bet.resultType === "exact" || g.bet.resultType === "correct_result")
      return "correct";
    return "wrong";
  }

  // ── Contagens para badges ─────────────────────────────────────────────────
  const counts = useMemo(() => {
    const c = { pending: 0, waiting: 0, correct: 0, wrong: 0 };
    for (const g of enrichedGames) {
      const k = classifyGame(g);
      if (k in c) c[k as keyof typeof c]++;
    }
    return c;
  }, [enrichedGames, deadlineMinutes]);

  // ── Filtro + ordenação ────────────────────────────────────────────────────
  const filteredGames = useMemo(() => {
    const list =
      activeFilter === "all"
        ? enrichedGames
        : enrichedGames.filter((g) => classifyGame(g) === activeFilter);

    return [...list].sort((a, b) => {
      const da = new Date(a.matchDate).getTime();
      const db2 = new Date(b.matchDate).getTime();
      // Pendentes: mais urgente primeiro (data crescente)
      if (activeFilter === "pending" || activeFilter === "all") {
        const aClass = classifyGame(a);
        const bClass = classifyGame(b);
        if (aClass === "pending" && bClass !== "pending") return -1;
        if (bClass === "pending" && aClass !== "pending") return 1;
        if (aClass === "pending" && bClass === "pending") return da - db2;
      }
      // Demais: mais recente primeiro
      return db2 - da;
    });
  }, [enrichedGames, activeFilter, deadlineMinutes]);

  // ── Resumo de performance ─────────────────────────────────────────────────
  const summary = useMemo(() => {
    const finished = bets.filter((b) => b.resultType !== "pending");
    const exact = finished.filter((b) => b.resultType === "exact").length;
    const correct = finished.filter(
      (b) => b.resultType === "correct_result"
    ).length;
    const wrong = finished.filter((b) => b.resultType === "wrong").length;
    const totalPoints = finished.reduce(
      (acc, b) => acc + (b.pointsEarned ?? 0),
      0
    );
    const total = finished.length;
    const hitRate =
      total > 0 ? Math.round(((exact + correct) / total) * 100) : 0;
    return { exact, correct, wrong, totalPoints, total, hitRate };
  }, [bets]);

  // ── Handlers inline ───────────────────────────────────────────────────────
  function setInput(gameId: number, side: "a" | "b", value: string) {
    setInlineInputs((prev) => ({
      ...prev,
      [gameId]: { ...{ a: "0", b: "0" }, ...prev[gameId], [side]: value },
    }));
  }

  async function handleSave(gameId: number) {
    if (!poolId) return;
    const inp = inlineInputs[gameId] ?? { a: "0", b: "0" };
    const scoreA = parseInt(inp.a, 10);
    const scoreB = parseInt(inp.b, 10);
    if (isNaN(scoreA) || isNaN(scoreB)) {
      toast.error("Preencha os dois placares");
      return;
    }
    setSavingIds((prev) => new Set(prev).add(gameId));
    try {
      await placeBetMutation.mutateAsync({
        poolId,
        gameId,
        predictedScoreA: scoreA,
        predictedScoreB: scoreB,
      });
      toast.success("Palpite salvo!");
      setInlineInputs((prev) => {
        const next = { ...prev };
        delete next[gameId];
        return next;
      });
    } finally {
      setSavingIds((prev) => {
        const next = new Set(prev);
        next.delete(gameId);
        return next;
      });
    }
  }

  const isLoading = loadingBets || loadingGames;

  // ── Filtros config ────────────────────────────────────────────────────────
  const filters: { key: FilterKey; label: string; count?: number }[] = [
    { key: "all", label: "Todos" },
    { key: "pending", label: "Falta palpitar", count: counts.pending },
    { key: "waiting", label: "Aguardando", count: counts.waiting },
    { key: "correct", label: "Acertei", count: counts.correct },
    { key: "wrong", label: "Errei", count: counts.wrong },
  ];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-10 space-y-5">

        {/* Cabeçalho */}
        <div>
          <h1
            className="font-bold text-2xl"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Meus Palpites
          </h1>
          {poolData && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {poolData.pool.name}
            </p>
          )}
        </div>

        {/* Banner de urgência */}
        {counts.pending > 0 && (
          <button
            onClick={() => setActiveFilter("pending")}
            className="w-full flex items-center gap-3 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-xl px-4 py-3 text-left hover:bg-[#FFB800]/15 transition-colors"
          >
            <AlertTriangle className="w-5 h-5 text-[#FFB800] shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#FFB800]">
                {counts.pending}{" "}
                {counts.pending === 1
                  ? "jogo aguarda seu palpite"
                  : "jogos aguardam seu palpite"}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Toque para ver e palpitar agora
              </p>
            </div>
            <PenLine className="w-4 h-4 text-[#FFB800] shrink-0" />
          </button>
        )}

        {/* Barra de filtros */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
          {filters.map((f) => {
            const isActive = activeFilter === f.key;
            const hasBadge = (f.count ?? 0) > 0;
            return (
              <button
                key={f.key}
                onClick={() => setActiveFilter(f.key)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all shrink-0",
                  isActive
                    ? "bg-[#FFB800] text-[#0B0F1A]"
                    : "bg-card border border-border/40 text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {f.label}
                {hasBadge && (
                  <span
                    className={cn(
                      "text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none",
                      isActive
                        ? "bg-[#0B0F1A]/20 text-[#0B0F1A]"
                        : f.key === "pending"
                        ? "bg-[#FF3B3B] text-white"
                        : "bg-muted text-muted-foreground"
                    )}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Lista de jogos */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : filteredGames.length === 0 ? (
          <div className="bg-card border border-border/30 rounded-2xl p-12 text-center space-y-3">
            <Target className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="font-semibold text-muted-foreground">
              {activeFilter === "pending"
                ? "Nenhum jogo aguardando palpite"
                : activeFilter === "waiting"
                ? "Nenhum palpite aguardando resultado"
                : activeFilter === "correct"
                ? "Nenhum acerto ainda"
                : activeFilter === "wrong"
                ? "Nenhum erro ainda"
                : "Nenhum palpite registrado"}
            </p>
            {activeFilter === "pending" && (
              <p className="text-sm text-muted-foreground/70">
                Todos os jogos já têm palpite ou o prazo encerrou.
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredGames.map((g) => {
              const classification = classifyGame(g);
              const matchDate = new Date(g.matchDate);
              const deadline = getDeadline(matchDate, deadlineMinutes);
              const soon = isDeadlineSoon(deadline);
              const inp = inlineInputs[g.id] ?? { a: "", b: "" };
              const isSaving = savingIds.has(g.id);
              const bet = g.bet;
              const cfg =
                bet && bet.resultType !== "pending"
                  ? resultCfg[bet.resultType as keyof typeof resultCfg]
                  : resultCfg.pending;

              return (
                <div
                  key={g.id}
                  className={cn(
                    "bg-[#121826] border rounded-xl p-4 space-y-3 transition-all",
                    classification === "pending"
                      ? soon
                        ? "border-[#FF3B3B]/40 bg-[#FF3B3B]/5"
                        : "border-[#FFB800]/30"
                      : classification === "correct"
                      ? cfg.border + " " + cfg.bg
                      : classification === "wrong"
                      ? "border-[#FF3B3B]/20 bg-[#FF3B3B]/5"
                      : "border-border/30"
                  )}
                >
                  {/* Linha superior: fase/grupo + data + status */}
                  <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span className="truncate">
                      {g.groupName
                        ? `Grupo ${g.groupName}`
                        : g.phase === "group_stage"
                        ? "Fase de grupos"
                        : g.phase}
                    </span>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Countdown para pendentes */}
                      {classification === "pending" && (
                        <span
                          className={cn(
                            "flex items-center gap-1 font-medium",
                            soon ? "text-[#FF3B3B]" : "text-[#FFB800]"
                          )}
                        >
                          <Timer className="w-3 h-3" />
                          {isDeadlinePassed(deadline)
                            ? "Prazo encerrado"
                            : `Fecha ${formatDistanceToNow(deadline, {
                                locale: ptBR,
                                addSuffix: true,
                              })}`}
                        </span>
                      )}
                      {/* Data do jogo */}
                      <span>
                        {format(matchDate, "dd/MM HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  </div>

                  {/* Times + placares */}
                  <div className="flex items-center justify-center gap-3">
                    {/* Time A */}
                    <div className="flex-1 text-right">
                      {g.teamAFlag && (
                        <img
                          src={g.teamAFlag}
                          alt=""
                          className="w-6 h-4 object-cover rounded-sm inline-block mr-1.5 mb-0.5"
                        />
                      )}
                      <p className="font-semibold text-sm leading-tight">
                        {g.teamAName ?? "Time A"}
                      </p>
                    </div>

                    {/* Placar central */}
                    <div className="flex items-center gap-2 shrink-0">
                      {classification === "pending" ? (
                        /* Inputs inline para palpite */
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={inp.a}
                            onChange={(e) => setInput(g.id, "a", e.target.value)}
                            placeholder="0"
                            className="w-12 h-10 text-center text-lg font-bold bg-[#0B0F1A] border border-[#FFB800]/40 rounded-lg text-foreground focus:outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                          <span className="text-muted-foreground font-bold">×</span>
                          <input
                            type="number"
                            min={0}
                            max={99}
                            value={inp.b}
                            onChange={(e) => setInput(g.id, "b", e.target.value)}
                            placeholder="0"
                            className="w-12 h-10 text-center text-lg font-bold bg-[#0B0F1A] border border-[#FFB800]/40 rounded-lg text-foreground focus:outline-none focus:border-[#FFB800] focus:ring-1 focus:ring-[#FFB800]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
                        </div>
                      ) : (
                        /* Palpite registrado */
                        <div className="flex items-center gap-2">
                          <div className="bg-muted/40 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
                            <p className="text-[10px] text-muted-foreground mb-0.5">
                              Palpite
                            </p>
                            <p className="font-bold text-sm">
                              {bet?.predictedScoreA ?? "–"} ×{" "}
                              {bet?.predictedScoreB ?? "–"}
                            </p>
                          </div>
                          {/* Resultado real (se encerrado) */}
                          {g.status === "finished" &&
                            g.scoreA !== null &&
                            g.scoreB !== null && (
                              <div className="bg-card border border-border/30 rounded-lg px-3 py-1.5 text-center min-w-[60px]">
                                <p className="text-[10px] text-muted-foreground mb-0.5">
                                  Real
                                </p>
                                <p className="font-bold text-sm">
                                  {g.scoreA} × {g.scoreB}
                                </p>
                              </div>
                            )}
                        </div>
                      )}
                    </div>

                    {/* Time B */}
                    <div className="flex-1 text-left">
                      <p className="font-semibold text-sm leading-tight">
                        {g.teamBName ?? "Time B"}
                      </p>
                      {g.teamBFlag && (
                        <img
                          src={g.teamBFlag}
                          alt=""
                          className="w-6 h-4 object-cover rounded-sm inline-block ml-1.5 mb-0.5"
                        />
                      )}
                    </div>
                  </div>

                  {/* Rodapé do card */}
                  {classification === "pending" ? (
                    /* Botão Salvar palpite */
                    <Button
                      size="sm"
                      onClick={() => handleSave(g.id)}
                      disabled={isSaving || inp.a === "" || inp.b === ""}
                      className="w-full bg-gradient-to-r from-[#FFB800] to-[#FF8A00] text-[#0B0F1A] font-bold hover:opacity-90"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <PenLine className="w-4 h-4 mr-2" />
                      )}
                      Salvar palpite
                    </Button>
                  ) : bet && bet.resultType !== "pending" ? (
                    /* Badge de resultado + pontos */
                    <div className="flex items-center justify-between pt-1 border-t border-border/20">
                      <div className="flex items-center gap-1.5">
                        <cfg.icon className={cn("w-3.5 h-3.5", cfg.color)} />
                        <span className={cn("text-xs font-semibold", cfg.color)}>
                          {cfg.label}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs font-bold border-current/30",
                          cfg.color
                        )}
                      >
                        +{bet.pointsEarned ?? 0} pts
                      </Badge>
                    </div>
                  ) : (
                    /* Aguardando resultado */
                    <div className="flex items-center gap-1.5 pt-1 border-t border-border/20">
                      <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        Aguardando resultado do jogo
                      </span>
                    </div>
                  )}

                  {/* Breakdown de pontos */}
                  {bet && (bet.pointsEarned ?? 0) > 0 && (
                    <div className="pt-1 border-t border-border/20">
                      <BetBreakdownBadges bet={bet} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Resumo de performance */}
        {summary.total > 0 && (
          <div className="pt-2 border-t border-border/20">
            <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wider">
              Desempenho geral
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-[#121826] border border-border/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#FFB800]">
                  {summary.totalPoints}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Pontos totais
                </p>
              </div>
              <div className="bg-[#121826] border border-[#00FF88]/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#00FF88]">
                  {summary.exact}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Placares exatos
                </p>
              </div>
              <div className="bg-[#121826] border border-[#00C2FF]/20 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-[#00C2FF]">
                  {summary.correct}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Resultados certos
                </p>
              </div>
              <div className="bg-[#121826] border border-border/30 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold text-foreground">
                  {summary.hitRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Taxa de acerto
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Link de volta ao bolão */}
        <div className="pb-4">
          <Link href={`/pool/${slug}`}>
            <Button variant="ghost" size="sm" className="text-muted-foreground">
              ← Voltar ao bolão
            </Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
