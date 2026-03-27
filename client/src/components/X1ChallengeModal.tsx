/**
 * X1ChallengeModal — Modal de criação de desafio "Vem pro X1"
 *
 * Fluxo:
 * 1. Carrega as opções disponíveis via getOptions
 * 2. Usuário escolhe o tipo de desafio (score_duel ou prediction)
 * 3. Para score_duel: escolhe o escopo (próxima rodada, próxima fase, próximos N jogos)
 * 4. Para prediction: escolhe o tipo de previsão e sua resposta
 * 5. Confirma e cria o desafio
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Trophy, Target, ChevronRight, ChevronLeft, Check, Lock } from "lucide-react";
import { cn } from "@/lib/utils";

interface X1ChallengeModalProps {
  open: boolean;
  onClose: () => void;
  poolId: number;
  opponentId: number;
  opponentName: string;
  onSuccess?: (challengeId: number) => void;
}

type Step = "choose" | "scope" | "prediction_type" | "prediction_answer" | "confirm";

export default function X1ChallengeModal({
  open,
  onClose,
  poolId,
  opponentId,
  opponentName,
  onSuccess,
}: X1ChallengeModalProps) {
  const [step, setStep] = useState<Step>("choose");
  const [challengeType, setChallengeType] = useState<"score_duel" | "prediction" | null>(null);
  const [scopeType, setScopeType] = useState<"next_round" | "next_phase" | "next_n_games" | null>(null);
  const [scopeValue, setScopeValue] = useState<number | null>(null);
  const [predictionType, setPredictionType] = useState<string | null>(null);
  const [predictionContext, setPredictionContext] = useState<{ phase?: string; groupName?: string; gameId?: number } | null>(null);
  const [challengerAnswer, setChallengerAnswer] = useState<string | string[] | null>(null);
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
    setStep("choose");
    setChallengeType(null);
    setScopeType(null);
    setScopeValue(null);
    setPredictionType(null);
    setPredictionContext(null);
    setChallengerAnswer(null);
    setSelectedTeams([]);
    onClose();
  }

  function handleSelectScoreDuel() {
    setChallengeType("score_duel");
    setStep("scope");
  }

  function handleSelectPrediction() {
    setChallengeType("prediction");
    setStep("prediction_type");
  }

  function handleSelectScope(type: "next_round" | "next_phase" | "next_n_games", value?: number) {
    setScopeType(type);
    setScopeValue(value ?? null);
    setStep("confirm");
  }

  function handleSelectPredictionType(type: string, context?: { phase?: string; groupName?: string; gameId?: number }) {
    setPredictionType(type);
    setPredictionContext(context ?? null);
    setStep("prediction_answer");
  }

  function handleSelectAnswer(answer: string | string[]) {
    setChallengerAnswer(answer);
    setStep("confirm");
  }

  function handleConfirm() {
    if (!challengeType) return;
    createChallenge.mutate({
      poolId,
      challengedId: opponentId,
      challengeType,
      scopeType: scopeType ?? undefined,
      scopeValue: scopeValue ?? undefined,
      predictionType: predictionType as any ?? undefined,
      challengerAnswer: challengerAnswer ?? undefined,
      predictionContext: predictionContext ?? undefined,
    });
  }

  // Determina quantos times devem ser selecionados para o tipo de previsão
  function getAnswerCount(type: string | null): number {
    if (!type) return 1;
    if (type === "group_qualified") return 2;
    if (type === "phase_qualified" || type === "eliminated_in_phase") return 2;
    return 1;
  }

  function toggleTeam(teamName: string) {
    const maxCount = getAnswerCount(predictionType);
    if (selectedTeams.includes(teamName)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== teamName));
    } else if (selectedTeams.length < maxCount) {
      const newTeams = [...selectedTeams, teamName];
      setSelectedTeams(newTeams);
      if (newTeams.length === maxCount) {
        handleSelectAnswer(maxCount === 1 ? newTeams[0] : newTeams);
      }
    }
  }

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm bg-[#121826] border-border/40 p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="px-5 pt-5 pb-0">
          <div className="flex items-center gap-2 mb-1">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center"
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
          {optionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !options ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              Não foi possível carregar as opções de desafio.
            </p>
          ) : !options.canChallenge ? (
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
          ) : (
            <>
              {/* STEP: choose */}
              {step === "choose" && (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground mb-3">Escolha o tipo de desafio:</p>

                  {/* Duelo de Palpites */}
                  <button
                    onClick={handleSelectScoreDuel}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(255,184,0,0.15)" }}
                    >
                      <Swords className="w-4 h-4" style={{ color: "#FFB800" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                        Duelo de Palpites
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Disputa de palpites — quem pontua mais?
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2.5" />
                  </button>

                  {/* Previsão de Campeonato */}
                  <button
                    onClick={handleSelectPrediction}
                    className="w-full flex items-start gap-3 p-3.5 rounded-xl border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left group"
                  >
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{ background: "rgba(0,194,255,0.15)" }}
                    >
                      <Trophy className="w-4 h-4" style={{ color: "#00C2FF" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold group-hover:text-primary transition-colors">
                        Previsão de Campeonato
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Quem vai ser campeão? Quem passa de fase?
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2.5" />
                  </button>
                </div>
              )}

              {/* STEP: scope (score_duel) */}
              {step === "scope" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setStep("choose")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">Duelo de Palpites — escolha o período:</p>
                  </div>
                  {options.scopeOptions.map((opt) => (
                    <button
                      key={`${opt.type}-${(opt as any).value ?? ""}`}
                      onClick={() => handleSelectScope(opt.type, (opt as any).value)}
                      className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                    >
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(255,184,0,0.12)" }}
                      >
                        <Target className="w-3.5 h-3.5" style={{ color: "#FFB800" }} />
                      </div>
                      <span className="text-sm font-medium">{opt.label}</span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              )}

              {/* STEP: prediction_type */}
              {step === "prediction_type" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => setStep("choose")}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">Previsão — o que você quer apostar?</p>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                    {options.predictionOptions.map((opt, i) => (
                      <button
                        key={i}
                        onClick={() => handleSelectPredictionType(opt.type, (opt as any).context)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl border border-border/40 bg-card/60 hover:border-primary/40 hover:bg-primary/5 transition-all text-left"
                      >
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ background: "rgba(0,194,255,0.12)" }}
                        >
                          <Trophy className="w-3.5 h-3.5" style={{ color: "#00C2FF" }} />
                        </div>
                        <span className="text-sm font-medium">{opt.label}</span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground ml-auto shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* STEP: prediction_answer */}
              {step === "prediction_answer" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-3">
                    <button
                      onClick={() => { setStep("prediction_type"); setSelectedTeams([]); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <div>
                      <p className="text-xs text-muted-foreground">Sua aposta:</p>
                      {getAnswerCount(predictionType) > 1 && (
                        <p className="text-[10px] text-muted-foreground/60">
                          Selecione {getAnswerCount(predictionType)} times ({selectedTeams.length}/{getAnswerCount(predictionType)})
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto space-y-1.5 pr-1">
                    {options.teams.map((team) => {
                      const isSelected = selectedTeams.includes(team.name);
                      const maxCount = getAnswerCount(predictionType);
                      const isDisabled = !isSelected && selectedTeams.length >= maxCount;
                      return (
                        <button
                          key={team.id}
                          onClick={() => toggleTeam(team.name)}
                          disabled={isDisabled}
                          className={cn(
                            "w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all text-left",
                            isSelected
                              ? "border-primary/60 bg-primary/10"
                              : isDisabled
                              ? "border-border/20 bg-card/20 opacity-40 cursor-not-allowed"
                              : "border-border/30 bg-card/40 hover:border-primary/30 hover:bg-primary/5"
                          )}
                        >
                          {team.flagUrl ? (
                            <img src={team.flagUrl} alt={team.name} className="w-6 h-6 rounded-full object-cover shrink-0" />
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

              {/* STEP: confirm */}
              {step === "confirm" && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-1">
                    <button
                      onClick={() => {
                        if (challengeType === "score_duel") setStep("scope");
                        else setStep("prediction_answer");
                      }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-xs text-muted-foreground">Confirmar desafio</p>
                  </div>

                  {/* Resumo */}
                  <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
                    <div className="flex items-center gap-2">
                      <Swords className="w-4 h-4 shrink-0" style={{ color: "#FFB800" }} />
                      <span className="text-sm font-semibold">
                        {challengeType === "score_duel" ? "Duelo de Palpites" : "Previsão de Campeonato"}
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

                    {challengeType === "prediction" && predictionType && (
                      <>
                        <div className="text-sm text-muted-foreground">
                          <span className="text-foreground font-medium">Aposta: </span>
                          {options.predictionOptions.find((o) => o.type === predictionType)?.label ?? predictionType}
                        </div>
                        {challengerAnswer && (
                          <div className="text-sm text-muted-foreground">
                            <span className="text-foreground font-medium">Sua escolha: </span>
                            <span className="text-primary font-semibold">
                              {Array.isArray(challengerAnswer) ? challengerAnswer.join(", ") : challengerAnswer}
                            </span>
                          </div>
                        )}
                      </>
                    )}

                    <div className="text-sm text-muted-foreground">
                      <span className="text-foreground font-medium">Adversário: </span>
                      {opponentName}
                    </div>
                    <div className="text-xs text-muted-foreground/60">
                      O desafio expira em 48h se não for aceito.
                    </div>
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
