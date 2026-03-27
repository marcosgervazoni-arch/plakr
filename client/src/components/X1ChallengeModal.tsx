/**
 * X1ChallengeModal — Modal de criação de desafio "Vem pro X1"
 *
 * Fluxo conforme spec v1.6 — seção 5.4:
 *
 * Passo 1 — Lista única de opções (score_duel + predictions misturadas):
 *   ○ Disputa de palpites — quem pontua mais?
 *   ○ Quem vai ser o campeão?
 *   ○ Quem vai ser o vice-campeão?       (só em cup/groups_knockout)
 *   ○ Quem passa do Grupo G?             (dinâmico, só em cup/groups_knockout)
 *   ○ Quem vai para a semifinal?         (dinâmico, só em cup/groups_knockout)
 *   ○ Quem cai nas quartas?              (dinâmico, só em cup/groups_knockout)
 *   ○ Quem vence o próximo jogo?         (se houver jogo agendado)
 *
 * Passo 2a — Se escolheu "Disputa de palpites":
 *   Escolhe o escopo (próxima rodada, próxima fase, próximos N jogos)
 *
 * Passo 2b — Se escolheu qualquer previsão:
 *   Escolhe sua resposta (time ou times da lista)
 *
 * Passo 3 — Confirmação e envio
 */

import { useState } from "react";
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
import { Loader2, Swords, Target, ChevronRight, ChevronLeft, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface X1ChallengeModalProps {
  open: boolean;
  onClose: () => void;
  poolId: number;
  opponentId: number;
  opponentName: string;
  onSuccess?: (challengeId: number) => void;
}

type Step = "list" | "scope" | "answer" | "confirm";

type PredictionOption = {
  type: "champion" | "runner_up" | "group_qualified" | "phase_qualified" | "eliminated_in_phase" | "next_game_winner";
  label: string;
  context?: { phase?: string; groupName?: string; gameId?: number };
};

export default function X1ChallengeModal({
  open,
  onClose,
  poolId,
  opponentId,
  opponentName,
  onSuccess,
}: X1ChallengeModalProps) {
  const [step, setStep] = useState<Step>("list");
  const [challengeType, setChallengeType] = useState<"score_duel" | "prediction" | null>(null);
  // score_duel
  const [scopeType, setScopeType] = useState<"next_round" | "next_phase" | "next_n_games" | null>(null);
  const [scopeValue, setScopeValue] = useState<number | null>(null);
  // prediction
  const [selectedPrediction, setSelectedPrediction] = useState<PredictionOption | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const { data: options, isLoading: optionsLoading } = trpc.x1.getOptions.useQuery(
    { poolId, opponentId },
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
    setStep("list");
    setChallengeType(null);
    setScopeType(null);
    setScopeValue(null);
    setSelectedPrediction(null);
    setSelectedTeams([]);
    onClose();
  }

  /** Passo 1 — usuário clicou em "Disputa de palpites" */
  function handlePickScoreDuel() {
    setChallengeType("score_duel");
    setStep("scope");
  }

  /** Passo 1 — usuário clicou em uma opção de previsão */
  function handlePickPrediction(opt: PredictionOption) {
    setChallengeType("prediction");
    setSelectedPrediction(opt);
    setSelectedTeams([]);
    setStep("answer");
  }

  /** Passo 2a — usuário escolheu o escopo do duelo de palpites */
  function handlePickScope(type: "next_round" | "next_phase" | "next_n_games", value?: number) {
    setScopeType(type);
    setScopeValue(value ?? null);
    setStep("confirm");
  }

  /** Quantos times o usuário precisa selecionar para este tipo de previsão */
  function getRequiredCount(type: string | null): number {
    if (!type) return 1;
    if (type === "group_qualified") return 2;
    if (type === "phase_qualified" || type === "eliminated_in_phase") return 2;
    return 1;
  }

  /** Passo 2b — toggle de time na lista de resposta */
  function toggleTeam(teamName: string) {
    const required = getRequiredCount(selectedPrediction?.type ?? null);
    if (selectedTeams.includes(teamName)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== teamName));
    } else if (selectedTeams.length < required) {
      const next = [...selectedTeams, teamName];
      setSelectedTeams(next);
      // Avança automaticamente quando o número de seleções está completo
      if (next.length === required) {
        setStep("confirm");
      }
    }
  }

  /** Passo 3 — confirma e envia o desafio */
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

  if (!open) return null;

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
              {/* ══ PASSO 1 — Lista única de opções ══════════════════════════════ */}
              {step === "list" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground mb-3">
                    Desafiar {opponentName} — o que você aposta?
                  </p>

                  {/* Duelo de palpites — sempre primeiro */}
                  <button
                    onClick={handlePickScoreDuel}
                    className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#FFB800]/40 hover:bg-[#FFB800]/5 transition-all text-left group"
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

                  {/* Opções de previsão — misturadas na mesma lista */}
                  {options.predictionOptions.length > 0 && (
                    <div className="max-h-56 overflow-y-auto space-y-2 pr-0.5">
                      {options.predictionOptions.map((opt, i) => (
                        <button
                          key={i}
                          onClick={() => handlePickPrediction(opt as PredictionOption)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-[#00C2FF]/40 hover:bg-[#00C2FF]/5 transition-all text-left group"
                        >
                          <div
                            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                            style={{ background: "rgba(0,194,255,0.12)" }}
                          >
                            <Target className="w-3.5 h-3.5" style={{ color: "#00C2FF" }} />
                          </div>
                          <span className="text-sm font-medium flex-1">{opt.label}</span>
                          <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ══ PASSO 2a — Escopo do duelo de palpites ══════════════════════ */}
              {step === "scope" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setStep("list")}
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

              {/* ══ PASSO 2b — Escolha da resposta (previsão) ═══════════════════ */}
              {step === "answer" && selectedPrediction && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => { setStep("list"); setSelectedTeams([]); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-xs text-muted-foreground">{selectedPrediction.label}</p>
                      {getRequiredCount(selectedPrediction.type) > 1 && (
                        <p className="text-[10px] text-muted-foreground/60">
                          Selecione {getRequiredCount(selectedPrediction.type)} times (
                          {selectedTeams.length}/{getRequiredCount(selectedPrediction.type)})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {options.teams.map((team) => {
                      const isSelected = selectedTeams.includes(team.name);
                      const required = getRequiredCount(selectedPrediction.type);
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
                          {team.flagUrl ? (
                            <img
                              src={team.flagUrl}
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
                </div>
              )}

              {/* ══ PASSO 3 — Confirmação ════════════════════════════════════════ */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => {
                        if (challengeType === "score_duel") setStep("scope");
                        else { setStep("answer"); setSelectedTeams([]); }
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
                        <span className="text-foreground font-medium">Sua aposta: </span>
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
                    Enviar Desafio ⚔️
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
