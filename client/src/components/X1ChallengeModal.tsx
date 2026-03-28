/**
 * X1ChallengeModal — Modal de criação de desafio "Vem pro X1"
 *
 * Fluxo aprovado (Gerva, 28/03/2026 — revisão UX):
 *
 * Passo 1 — Categorias (máximo 4, lista curta):
 *   ⚔️  Disputa de palpites — quem pontua mais?   (sempre)
 *   🏆  Quem vai ser o campeão?                   (sempre)
 *   👥  Classificação em grupo                    (só se o torneio tiver grupos)
 *   🎯  Classificação por fase                    (só se o torneio tiver fases de mata-mata)
 *
 * Passo 2a — Escopo do duelo de palpites
 *   Escolhe o período (próxima rodada, próxima fase, próximos N jogos)
 *   → Vai para confirmação
 *
 * Passo 2b — Seleção de grupo (grid compacto)
 *   Exibe os grupos do torneio em grid de 3 colunas
 *   → Ao escolher o grupo, vai para Passo 3 (times do grupo)
 *
 * Passo 2c — Seleção de fase (lista vertical)
 *   Exibe as fases de mata-mata do torneio
 *   → Ao escolher a fase, vai para Passo 3 (times da fase)
 *
 * Passo 3 — Escolha do(s) time(s)
 *   champion: 1 time
 *   group_qualified: 2 times (combinação diferente do desafiante)
 *   phase_qualified: N times = Math.floor(teamsInPhase / 2) — todos que avançam
 *   → Ao completar a seleção, vai para confirmação
 *
 * Passo 4 — Confirmação e envio
 *
 * Regra: desafiado não pode escolher o mesmo palpite que o desafiante
 *        (validado no backend e exibido na tela de aceitação)
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Swords,
  Target,
  ChevronRight,
  ChevronLeft,
  Check,
  Lock,
  Users,
  Trophy,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface X1ChallengeModalProps {
  open: boolean;
  onClose: () => void;
  poolId: number;
  opponentId: number;
  opponentName: string;
  onSuccess?: (challengeId: number) => void;
}

type Step =
  | "categories"   // Passo 1: 4 categorias fixas
  | "scope"        // Passo 2a: escopo do duelo de palpites
  | "pick_group"   // Passo 2b: grid de grupos
  | "pick_phase"   // Passo 2c: lista de fases
  | "answer"       // Passo 3: escolha de times
  | "confirm";     // Passo 4: confirmação

type PredictionOption = {
  type: "champion" | "group_qualified" | "phase_qualified";
  label: string;
  context?: { phase?: string; groupName?: string };
  teamsRequired: number;
};

export default function X1ChallengeModal({
  open,
  onClose,
  poolId,
  opponentId,
  opponentName,
  onSuccess,
}: X1ChallengeModalProps) {
  const [step, setStep] = useState<Step>("categories");
  const [challengeType, setChallengeType] = useState<"score_duel" | "prediction" | null>(null);
  // score_duel
  const [scopeType, setScopeType] = useState<"next_round" | "next_phase" | "next_n_games" | null>(null);
  const [scopeValue, setScopeValue] = useState<number | null>(null);
  // prediction
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionOption | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  // IDs estáveis para evitar re-fetch infinito
  const stableInput = useMemo(() => ({ poolId, opponentId }), [poolId, opponentId]);

  const { data: options, isLoading: optionsLoading } = trpc.x1.getOptions.useQuery(
    stableInput,
    { enabled: open, retry: false }
  );

  const utils = trpc.useUtils();
  const createChallenge = trpc.x1.create.useMutation({
    onSuccess: (data) => {
      toast.success("Desafio enviado! ⚔️", {
        description: `${opponentName} tem 48h para aceitar.`,
      });
      utils.x1.getByPool.invalidate({ poolId });
      utils.x1.getMyStats.invalidate({ poolId });
      onSuccess?.(data.challengeId);
      handleClose();
    },
    onError: (err) => {
      toast.error("Erro ao criar desafio", { description: err.message });
    },
  });

  function handleClose() {
    setStep("categories");
    setChallengeType(null);
    setScopeType(null);
    setScopeValue(null);
    setSelectedPrediction(null);
    setSelectedTeams([]);
    onClose();
  }

  function handlePickScoreDuel() {
    setChallengeType("score_duel");
    setStep("scope");
  }

  function handlePickChampion() {
    setChallengeType("prediction");
    setSelectedPrediction({ type: "champion", label: "Quem vai ser o campeão?", teamsRequired: 1 });
    setSelectedTeams([]);
    setStep("answer");
  }

  function handlePickGroupCategory() {
    setStep("pick_group");
  }

  function handlePickPhaseCategory() {
    setStep("pick_phase");
  }

  function handleSelectGroup(groupName: string) {
    setChallengeType("prediction");
    setSelectedPrediction({
      type: "group_qualified",
      label: `Quem classifica no Grupo ${groupName}?`,
      context: { groupName },
      teamsRequired: 2,
    });
    setSelectedTeams([]);
    setStep("answer");
  }

  function handleSelectPhase(phase: string, label: string, teamsRequired: number) {
    setChallengeType("prediction");
    setSelectedPrediction({
      type: "phase_qualified",
      label,
      context: { phase },
      teamsRequired,
    });
    setSelectedTeams([]);
    setStep("answer");
  }

  function handlePickScope(type: "next_round" | "next_phase" | "next_n_games", value?: number) {
    setScopeType(type);
    setScopeValue(value ?? null);
    setStep("confirm");
  }

  function toggleTeam(teamName: string) {
    const required = selectedPrediction?.teamsRequired ?? 1;
    if (selectedTeams.includes(teamName)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== teamName));
    } else if (selectedTeams.length < required) {
      const next = [...selectedTeams, teamName];
      setSelectedTeams(next);
      if (next.length === required) {
        // Auto-avança para confirmação quando atingir o número exato
        setStep("confirm");
      }
    }
  }

  function handleConfirm() {
    if (!challengeType) return;
    const answer =
      challengeType === "prediction"
        ? selectedTeams.length === 1
          ? selectedTeams[0]
          : selectedTeams
        : undefined;

    createChallenge.mutate({
      poolId,
      challengedId: opponentId,
      challengeType,
      scopeType: scopeType ?? undefined,
      scopeValue: scopeValue ?? undefined,
      predictionType: (selectedPrediction?.type as any) ?? undefined,
      challengerAnswer: answer,
      predictionContext: selectedPrediction?.context ?? undefined,
    });
  }

  /** Extrai grupos únicos das predictionOptions */
  function getGroups(): string[] {
    if (!options) return [];
    return options.groups ?? [];
  }

  /** Extrai fases de mata-mata das predictionOptions com teamsRequired */
  function getKnockoutPhases(): { phase: string; label: string; teamsRequired: number }[] {
    if (!options) return [];
    return (options.predictionOptions ?? [])
      .filter((o) => o.type === "phase_qualified")
      .map((o) => ({
        phase: (o as any).context?.phase ?? o.label,
        label: o.label,
        teamsRequired: (o as any).teamsRequired ?? 1,
      }));
  }

  /** Retorna os times filtrados por grupo quando aplicável */
  function getTeamsForAnswer() {
    if (!options) return [];
    if (selectedPrediction?.context?.groupName) {
      const filtered = options.teams.filter(
        (t) => (t as any).groupName === selectedPrediction.context?.groupName
      );
      return filtered.length > 0 ? filtered : options.teams;
    }
    return options.teams;
  }

  if (!open) return null;

  const groups = getGroups();
  const knockoutPhases = getKnockoutPhases();
  const hasGroups = groups.length > 0;
  const hasPhases = knockoutPhases.length > 0;

  const required = selectedPrediction?.teamsRequired ?? 1;
  const selectionComplete = selectedTeams.length === required;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm bg-[#121826] border-border/40 p-0 overflow-hidden">
        {/* ── Header ── */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,184,0,0.15)" }}
            >
              <Swords className="w-4 h-4" style={{ color: "#FFB800" }} />
            </div>
            <div>
              <DialogTitle className="text-base font-bold leading-tight">Vem pro X1</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-tight">
                vs <span className="font-semibold text-foreground">{opponentName}</span>
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 pb-5 pt-4">
          {/* ── Loading ── */}
          {optionsLoading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* ── Erro ao carregar ── */}
          {!optionsLoading && !options && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Não foi possível carregar as opções de desafio.
            </p>
          )}

          {/* ── Limite de plano atingido ── */}
          {!optionsLoading && options && !options.canChallenge && (
            <div className="text-center py-4 space-y-3">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
                style={{ background: "rgba(255,59,59,0.15)" }}
              >
                <Lock className="w-6 h-6" style={{ color: "#FF3B3B" }} />
              </div>
              <div>
                <p className="text-sm font-semibold">Limite atingido</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Você já tem {options.activeCount} de {options.planLimit} X1s ativos no seu plano.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => (window.location.href = "/upgrade")}
              >
                Fazer upgrade
              </Button>
            </div>
          )}

          {/* ── Fluxo principal ── */}
          {!optionsLoading && options && options.canChallenge && (
            <>
              {/* ══ PASSO 1 — Categorias (máximo 4 itens) ══════════════════════ */}
              {step === "categories" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Desafiar {opponentName} — o que você aposta?
                  </p>

                  {/* Duelo de palpites — sempre */}
                  <button
                    onClick={handlePickScoreDuel}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#FFB800]/40 hover:bg-[#FFB800]/5 transition-all text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,184,0,0.15)" }}
                    >
                      <Swords className="w-3.5 h-3.5" style={{ color: "#FFB800" }} />
                    </div>
                    <span className="text-sm font-medium flex-1">
                      Disputa de palpites — quem pontua mais?
                    </span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>

                  {/* Campeão — sempre */}
                  <button
                    onClick={handlePickChampion}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#FFB800]/40 hover:bg-[#FFB800]/5 transition-all text-left"
                  >
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(255,184,0,0.12)" }}
                    >
                      <Trophy className="w-3.5 h-3.5" style={{ color: "#FFB800" }} />
                    </div>
                    <span className="text-sm font-medium flex-1">Quem vai ser o campeão?</span>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                  </button>

                  {/* Classificação em grupo — só se o torneio tiver grupos */}
                  {hasGroups && (
                    <button
                      onClick={handlePickGroupCategory}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#00C2FF]/40 hover:bg-[#00C2FF]/5 transition-all text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(0,194,255,0.12)" }}
                      >
                        <Users className="w-3.5 h-3.5" style={{ color: "#00C2FF" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Classificação em grupo</span>
                        <span className="text-[10px] text-muted-foreground">
                          {groups.length} grupo{groups.length !== 1 ? "s" : ""} disponíve{groups.length !== 1 ? "is" : "l"}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  )}

                  {/* Classificação por fase — só se o torneio tiver fases de mata-mata */}
                  {hasPhases && (
                    <button
                      onClick={handlePickPhaseCategory}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#00C2FF]/40 hover:bg-[#00C2FF]/5 transition-all text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(0,194,255,0.12)" }}
                      >
                        <Target className="w-3.5 h-3.5" style={{ color: "#00C2FF" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">Classificação por fase</span>
                        <span className="text-[10px] text-muted-foreground">
                          {knockoutPhases.length} fase{knockoutPhases.length !== 1 ? "s" : ""} disponíve{knockoutPhases.length !== 1 ? "is" : "l"}
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  )}
                </div>
              )}

              {/* ══ PASSO 2a — Escopo do duelo de palpites ══════════════════════ */}
              {step === "scope" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setStep("categories")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Disputa de palpites — por quantos jogos você aposta?
                    </p>
                  </div>
                  {options.scopeOptions.map((opt) => (
                    <button
                      key={`${opt.type}-${(opt as any).value ?? ""}`}
                      onClick={() => handlePickScope(opt.type, (opt as any).value)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#FFB800]/40 hover:bg-[#FFB800]/5 transition-all text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,184,0,0.12)" }}
                      >
                        <Target className="w-3.5 h-3.5" style={{ color: "#FFB800" }} />
                      </div>
                      <span className="text-sm font-medium flex-1">{opt.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 ml-auto" />
                    </button>
                  ))}
                </div>
              )}

              {/* ══ PASSO 2b — Grid de grupos ════════════════════════════════════ */}
              {step === "pick_group" && (
                <div>
                  <div className="flex items-center gap-2 mb-4">
                    <button
                      onClick={() => setStep("categories")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Classificação em grupo — escolha o grupo
                    </p>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {groups.map((g) => (
                      <button
                        key={g}
                        onClick={() => handleSelectGroup(g)}
                        className="flex flex-col items-center justify-center p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#00C2FF]/50 hover:bg-[#00C2FF]/8 transition-all aspect-square"
                      >
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center mb-1"
                          style={{ background: "rgba(0,194,255,0.12)" }}
                        >
                          <Users className="w-4 h-4" style={{ color: "#00C2FF" }} />
                        </div>
                        <span className="text-sm font-bold">{g}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ══ PASSO 2c — Lista de fases ════════════════════════════════════ */}
              {step === "pick_phase" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setStep("categories")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Classificação por fase — escolha a fase
                    </p>
                  </div>
                  {knockoutPhases.map(({ phase, label, teamsRequired }) => (
                    <button
                      key={phase}
                      onClick={() => handleSelectPhase(phase, label, teamsRequired)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#00C2FF]/40 hover:bg-[#00C2FF]/5 transition-all text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(0,194,255,0.12)" }}
                      >
                        <Target className="w-3.5 h-3.5" style={{ color: "#00C2FF" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium block">{label}</span>
                        <span className="text-[10px] text-muted-foreground">
                          Selecione {teamsRequired} time{teamsRequired !== 1 ? "s" : ""} que avançam
                        </span>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* ══ PASSO 3 — Escolha do(s) time(s) ════════════════════════════ */}
              {step === "answer" && selectedPrediction && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => {
                        setSelectedTeams([]);
                        if (selectedPrediction.type === "group_qualified") setStep("pick_group");
                        else if (selectedPrediction.type === "phase_qualified") setStep("pick_phase");
                        else setStep("categories");
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-xs text-muted-foreground">{selectedPrediction.label}</p>
                      {required > 1 && (
                        <p className="text-[10px] text-muted-foreground/60">
                          Selecione {required} time{required !== 1 ? "s" : ""} que avançam (
                          {selectedTeams.length}/{required})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Indicador de progresso quando múltiplos times */}
                  {required > 1 && (
                    <div className="flex gap-1 mb-2">
                      {Array.from({ length: required }).map((_, i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-all",
                            i < selectedTeams.length
                              ? "bg-[#FFB800]"
                              : "bg-border/30"
                          )}
                        />
                      ))}
                    </div>
                  )}

                  {/* Lista de times filtrada por grupo quando aplicável */}
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {getTeamsForAnswer().map((team) => {
                      const isSelected = selectedTeams.includes(team.name);
                      const isDisabled = !isSelected && selectedTeams.length >= required;
                      return (
                        <button
                          key={team.id}
                          onClick={() => toggleTeam(team.name)}
                          disabled={isDisabled}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left",
                            isSelected
                              ? "border-[#FFB800]/60 bg-[#FFB800]/10"
                              : isDisabled
                              ? "border-border/20 bg-card/20 opacity-40 cursor-not-allowed"
                              : "border-border/30 bg-card/40 hover:border-[#FFB800]/30 hover:bg-[#FFB800]/5"
                          )}
                        >
                          {(team as any).flagUrl ? (
                            <img
                              src={(team as any).flagUrl}
                              alt={team.name}
                              className="w-6 h-6 rounded-full object-cover shrink-0"
                            />
                          ) : (
                            <div className="w-6 h-6 rounded-full bg-muted/40 flex items-center justify-center shrink-0">
                              <span className="text-[9px] font-bold text-muted-foreground">
                                {team.name.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="text-sm font-medium flex-1 truncate">{team.name}</span>
                          {isSelected && (
                            <div
                              className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                              style={{ background: "rgba(255,184,0,0.2)" }}
                            >
                              <Check className="w-3 h-3" style={{ color: "#FFB800" }} />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Botão manual para avançar quando seleção completa mas não auto-avançou */}
                  {selectionComplete && (
                    <Button
                      className="w-full mt-2"
                      size="sm"
                      style={{
                        background: "linear-gradient(135deg, #FFB800, #FF8A00)",
                        color: "#0B0F1A",
                      }}
                      onClick={() => setStep("confirm")}
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Confirmar seleção
                    </Button>
                  )}
                </div>
              )}

              {/* ══ PASSO 4 — Confirmação ════════════════════════════════════════ */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => {
                        if (challengeType === "score_duel") setStep("scope");
                        else {
                          setSelectedTeams([]);
                          setStep("answer");
                        }
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">Confirmar desafio</p>
                  </div>

                  {/* Resumo */}
                  <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 shrink-0" style={{ color: "#FFB800" }} />
                      <span className="text-sm font-semibold">
                        {challengeType === "score_duel"
                          ? "Disputa de palpites — quem pontua mais?"
                          : selectedPrediction?.label}
                      </span>
                    </div>

                    {challengeType === "score_duel" && scopeType && (
                      <div className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">Período: </span>
                        {scopeType === "next_round" && "Próxima rodada"}
                        {scopeType === "next_phase" && "Próxima fase"}
                        {scopeType === "next_n_games" && `Próximos ${scopeValue} jogos`}
                      </div>
                    )}

                    {challengeType === "prediction" && selectedTeams.length > 0 && (
                      <div className="text-sm text-muted-foreground">
                        <span className="text-foreground font-medium">
                          {selectedTeams.length > 1 ? "Seus times: " : "Sua aposta: "}
                        </span>
                        <span className="font-semibold" style={{ color: "#FFB800" }}>
                          {selectedTeams.join(", ")}
                        </span>
                      </div>
                    )}

                    <div className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">Adversário: </span>
                      {opponentName}
                    </div>
                    <p className="text-xs text-muted-foreground/60">
                      O desafio expira em 48h se não for aceito.
                    </p>
                  </div>

                  <Button
                    className="w-full font-bold"
                    style={{
                      background: "linear-gradient(135deg, #FFB800, #FF8A00)",
                      color: "#0B0F1A",
                    }}
                    onClick={handleConfirm}
                    disabled={createChallenge.isPending}
                  >
                    {createChallenge.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Swords className="w-4 h-4 mr-2" />
                    )}
                    Enviar desafio ⚔️
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
