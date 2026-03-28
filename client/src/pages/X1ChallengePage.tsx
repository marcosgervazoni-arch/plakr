/**
 * X1ChallengePage — Detalhe de um duelo X1
 *
 * Exibe:
 * - Status do duelo (pendente, ativo, concluído, expirado, cancelado)
 * - Informações dos participantes e suas escolhas
 * - Para score_duel: placar por jogo
 * - Para prediction: as apostas de cada um
 * - Ações: aceitar/recusar (se pendente e sou o desafiado), cancelar (se pendente e sou o desafiante)
 *
 * Regras de aceitação (aprovadas 28/03/2026):
 * - score_duel: aceita diretamente, sem escolha adicional
 * - champion / phase_qualified: desafiado escolhe 1 time diferente do desafiante
 * - group_qualified: desafiado escolhe 2 times — não podem ser exatamente os mesmos 2 do desafiante
 *   (pode ter 1 em comum, mas não os 2 iguais)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ArrowLeft,
  Loader2,
  Swords,
  Trophy,
  Check,
  X,
  Crown,
  Clock,
  CheckCircle2,
  XCircle,
  Minus,
  ChevronLeft,
} from "lucide-react";
import { useState, useMemo } from "react";
import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: {
    label: "Aguardando resposta",
    color: "#FFB800",
    icon: <Clock className="w-4 h-4" />,
  },
  active: {
    label: "Duelo ativo",
    color: "#00FF88",
    icon: <Swords className="w-4 h-4" />,
  },
  concluded: {
    label: "Concluído",
    color: "#00C2FF",
    icon: <CheckCircle2 className="w-4 h-4" />,
  },
  expired: {
    label: "Expirado",
    color: "#666",
    icon: <XCircle className="w-4 h-4" />,
  },
  cancelled: {
    label: "Cancelado",
    color: "#FF3B3B",
    icon: <XCircle className="w-4 h-4" />,
  },
};

const PREDICTION_TYPE_LABELS: Record<string, string> = {
  champion: "Quem vai ser o campeão?",
  group_qualified: "Quem classifica no grupo?",
  phase_qualified: "Quem passa para a fase?",
};

function UserCard({
  user,
  label,
  answer,
  score,
  isWinner,
  isDraw,
  isMe,
}: {
  user: { id: number; name: string | null; avatarUrl?: string | null } | null;
  label: string;
  answer?: string | string[] | null;
  score?: number | null;
  isWinner?: boolean;
  isDraw?: boolean;
  isMe?: boolean;
}) {
  if (!user) return null;
  return (
    <div
      className={cn(
        "flex-1 rounded-xl border p-3 text-center space-y-2 transition-all",
        isWinner
          ? "border-primary/60 bg-primary/10"
          : isDraw
          ? "border-border/40 bg-card/60"
          : "border-border/30 bg-card/40"
      )}
    >
      <div className="flex items-center justify-center gap-1 mb-1">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
        {isMe && (
          <span className="text-[9px] px-1 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/20">
            você
          </span>
        )}
      </div>
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold mx-auto border-2"
        style={{
          background: isWinner ? "rgba(255,184,0,0.2)" : "rgba(255,255,255,0.05)",
          borderColor: isWinner ? "rgba(255,184,0,0.6)" : "transparent",
        }}
      >
        {user.name?.charAt(0)?.toUpperCase() ?? "?"}
      </div>
      <p className="text-sm font-semibold truncate">{user.name}</p>
      {score !== undefined && score !== null && (
        <p
          className="text-2xl font-black font-mono"
          style={{ color: isWinner ? "#FFB800" : isDraw ? "#E5E5E5" : undefined }}
        >
          {score}
          <span className="text-xs font-normal text-muted-foreground ml-1">pts</span>
        </p>
      )}
      {answer && (
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">
            {Array.isArray(answer) ? answer.join(", ") : answer}
          </span>
        </div>
      )}
      {isWinner && (
        <div className="flex items-center justify-center gap-1">
          <Crown className="w-4 h-4" style={{ color: "#FFB800" }} />
          <span className="text-xs font-bold" style={{ color: "#FFB800" }}>
            Vencedor
          </span>
        </div>
      )}
      {isDraw && score !== undefined && (
        <div className="flex items-center justify-center gap-1">
          <Minus className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Empate</span>
        </div>
      )}
    </div>
  );
}

export default function X1ChallengePage() {
  const { id } = useParams<{ id: string }>();
  const challengeId = Number(id);
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // Estado da tela de aceitação
  const [showAcceptStep, setShowAcceptStep] = useState(false);
  const [selectedTeams, setSelectedTeams] = useState<string[]>([]);

  const { data: challenge, isLoading, refetch } = trpc.x1.getById.useQuery(
    { challengeId },
    { enabled: !!challengeId && !isNaN(challengeId) }
  );

  // Busca times do torneio para o passo de aceitação de prediction
  const poolId = challenge?.poolId;
  const { data: x1Options } = trpc.x1.getOptions.useQuery(
    { poolId: poolId!, opponentId: challenge?.challengerId ?? 0 },
    {
      enabled:
        !!poolId &&
        !!challenge?.challengerId &&
        challenge?.challengeType === "prediction" &&
        challenge?.status === "pending" &&
        challenge?.iAmChallenged === true,
    }
  );

  const accept = trpc.x1.accept.useMutation({
    onSuccess: () => {
      toast.success("Desafio aceito! ⚔️", { description: "O duelo está ativo. Que vença o melhor!" });
      setShowAcceptStep(false);
      setSelectedTeams([]);
      refetch();
    },
    onError: (err) => toast.error("Erro ao aceitar", { description: err.message }),
  });

  const decline = trpc.x1.decline.useMutation({
    onSuccess: () => {
      toast.info("Desafio recusado.");
      navigate(-1 as any);
    },
    onError: (err) => toast.error("Erro ao recusar", { description: err.message }),
  });

  const cancel = trpc.x1.cancel.useMutation({
    onSuccess: () => {
      toast.info("Desafio cancelado.");
      navigate(-1 as any);
    },
    onError: (err) => toast.error("Erro ao cancelar", { description: err.message }),
  });

  const conclude = trpc.x1.conclude.useMutation({
    onSuccess: (data) => {
      toast.success("Duelo concluído!", {
        description:
          data.winnerId === null
            ? "Empate!"
            : data.winnerId === user?.id
            ? "Você venceu! 🏆"
            : "Você perdeu. Tente novamente!",
      });
      refetch();
    },
    onError: (err) => toast.error("Erro ao concluir", { description: err.message }),
  });

  // Quantos times precisam ser selecionados
  const requiredCount = challenge?.predictionType === "group_qualified" ? 2 : 1;

  // Times disponíveis para o desafiado escolher (excluindo a escolha exata do desafiante apenas para champion/phase)
  const availableTeams = useMemo(() => {
    if (!x1Options?.teams) return [];
    const challengerAnswer = challenge?.challengerAnswer;
    if (!challengerAnswer) return x1Options.teams;

    if (challenge?.predictionType === "champion" || challenge?.predictionType === "phase_qualified") {
      // Desafiado não pode escolher o mesmo time
      const blocked = Array.isArray(challengerAnswer) ? challengerAnswer : [challengerAnswer as string];
      return x1Options.teams.filter((t) => !blocked.includes(t.name));
    }
    // group_qualified: todos os times disponíveis (validação de "não exatamente iguais" é no backend)
    return x1Options.teams;
  }, [x1Options?.teams, challenge?.challengerAnswer, challenge?.predictionType]);

  function toggleTeam(teamName: string) {
    if (selectedTeams.includes(teamName)) {
      setSelectedTeams(selectedTeams.filter((t) => t !== teamName));
    } else if (selectedTeams.length < requiredCount) {
      setSelectedTeams([...selectedTeams, teamName]);
    }
  }

  function handleAcceptPrediction() {
    if (selectedTeams.length < requiredCount) {
      toast.error(`Selecione ${requiredCount === 2 ? "2 times" : "um time"} para continuar.`);
      return;
    }
    const answer = selectedTeams.length === 1 ? selectedTeams[0] : selectedTeams;
    accept.mutate({ challengeId, challengedAnswer: answer });
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!challenge) {
    return (
      <div className="min-h-screen bg-[#0B0F1A] flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Duelo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate(-1 as any)}>
          Voltar
        </Button>
      </div>
    );
  }

  const status = STATUS_LABELS[challenge.status] ?? STATUS_LABELS.cancelled;
  const iAmChallenger = challenge.iAmChallenger;
  const iAmChallenged = challenge.iAmChallenged;
  const isPending = challenge.status === "pending";
  const isActive = challenge.status === "active";
  const isConcluded = challenge.status === "concluded";
  const isDraw = isConcluded && challenge.winnerId === null;
  const challengerIsWinner = isConcluded && challenge.winnerId === challenge.challengerId;
  const challengedIsWinner = isConcluded && challenge.winnerId === challenge.challengedId;

  const predictionLabel =
    challenge.challengeType === "prediction" && challenge.predictionType
      ? PREDICTION_TYPE_LABELS[challenge.predictionType] ?? challenge.predictionType
      : null;

  // Exibe a escolha do desafiante de forma legível
  const challengerAnswerDisplay = challenge.challengerAnswer
    ? Array.isArray(challenge.challengerAnswer)
      ? (challenge.challengerAnswer as string[]).join(", ")
      : (challenge.challengerAnswer as string)
    : null;

  return (
    <div className="min-h-screen bg-[#0B0F1A]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0B0F1A]/95 backdrop-blur-sm border-b border-border/30 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate(-1 as any)}
          className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/5 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2">
          <Swords className="w-4 h-4" style={{ color: "#FFB800" }} />
          <h1 className="text-sm font-bold">X1 — Duelo</h1>
        </div>
        <div className="ml-auto">
          <span
            className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium"
            style={{
              color: status.color,
              borderColor: `${status.color}40`,
              background: `${status.color}15`,
            }}
          >
            {status.icon}
            {status.label}
          </span>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 py-5 space-y-4">
        {/* Tipo de desafio */}
        <div className="text-center">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">
            {challenge.challengeType === "score_duel"
              ? "Disputa de palpites — quem pontua mais?"
              : predictionLabel ?? "Previsão de Campeonato"}
          </span>
          {challenge.challengeType === "score_duel" && challenge.scopeType && (
            <p className="text-xs text-muted-foreground/60 mt-0.5">
              {challenge.scopeType === "next_round" && "Próxima rodada"}
              {challenge.scopeType === "next_phase" && "Próxima fase"}
              {challenge.scopeType === "next_n_games" && `Próximos ${challenge.scopeValue} jogos`}
            </p>
          )}
        </div>

        {/* Cards dos participantes */}
        <div className="flex gap-3">
          <UserCard
            user={challenge.challenger}
            label="Desafiante"
            answer={
              challenge.challengeType === "prediction" && challenge.status !== "pending"
                ? (challenge.challengerAnswer as string | string[] | null)
                : null
            }
            score={challenge.challengeType === "score_duel" && isConcluded ? challenge.challengerPoints : null}
            isWinner={challengerIsWinner}
            isDraw={isDraw}
            isMe={iAmChallenger}
          />
          <div className="flex items-center justify-center shrink-0">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black"
              style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}
            >
              X1
            </div>
          </div>
          <UserCard
            user={challenge.challenged}
            label="Desafiado"
            answer={
              challenge.challengeType === "prediction" && challenge.status !== "pending"
                ? (challenge.challengedAnswer as string | string[] | null)
                : null
            }
            score={challenge.challengeType === "score_duel" && isConcluded ? challenge.challengedPoints : null}
            isWinner={challengedIsWinner}
            isDraw={isDraw}
            isMe={iAmChallenged}
          />
        </div>

        {/* Jogos do duelo (score_duel) */}
        {challenge.challengeType === "score_duel" && challenge.games && challenge.games.length > 0 && (
          <div className="rounded-xl border border-border/30 bg-card/40 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/20">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Jogos do duelo ({challenge.games.length})
              </p>
            </div>
            <div className="divide-y divide-border/20">
              {challenge.games.map((game) => {
                const gs = challenge.gameScores?.find((s: any) => s.gameId === game.id);
                return (
                  <div key={game.id} className="px-4 py-3 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {game.teamAName} x {game.teamBName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {game.status === "finished"
                          ? `${game.scoreA ?? "?"} - ${game.scoreB ?? "?"}`
                          : game.status === "live"
                          ? "Ao vivo"
                          : new Date(game.matchDate).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                      </p>
                    </div>
                    {gs && (
                      <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
                        <span
                          className="font-bold"
                          style={{ color: gs.challengerPoints > gs.challengedPoints ? "#FFB800" : undefined }}
                        >
                          {gs.challengerPoints}
                        </span>
                        <span className="text-muted-foreground">x</span>
                        <span
                          className="font-bold"
                          style={{ color: gs.challengedPoints > gs.challengerPoints ? "#FFB800" : undefined }}
                        >
                          {gs.challengedPoints}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ AÇÕES ══════════════════════════════════════════════════════════ */}
        <div className="space-y-2">

          {/* ── Desafiado: aceitar ou recusar ── */}
          {isPending && iAmChallenged && (
            <>
              {/* score_duel: aceita direto */}
              {challenge.challengeType === "score_duel" && !showAcceptStep && (
                <Button
                  className="w-full font-bold"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
                  onClick={() => accept.mutate({ challengeId })}
                  disabled={accept.isPending}
                >
                  {accept.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Aceitar Desafio ⚔️
                </Button>
              )}

              {/* prediction: mostra escolha do desafiante e pede resposta diferente */}
              {challenge.challengeType === "prediction" && !showAcceptStep && (
                <Button
                  className="w-full font-bold"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
                  onClick={() => setShowAcceptStep(true)}
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Ver desafio e fazer minha aposta
                </Button>
              )}

              {/* Passo de seleção de resposta para prediction */}
              {challenge.challengeType === "prediction" && showAcceptStep && (
                <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
                  {/* Cabeçalho com voltar */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowAcceptStep(false); setSelectedTeams([]); }}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-semibold">{predictionLabel}</p>
                  </div>

                  {/* Escolha do desafiante */}
                  <div className="rounded-lg border border-[#FFB800]/30 bg-[#FFB800]/5 px-3 py-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
                      {challenge.challenger?.name} apostou em:
                    </p>
                    <p className="text-sm font-bold" style={{ color: "#FFB800" }}>
                      {challengerAnswerDisplay ?? "—"}
                    </p>
                  </div>

                  {/* Instrução */}
                  <p className="text-xs text-muted-foreground">
                    {challenge.predictionType === "group_qualified"
                      ? `Escolha 2 times (${selectedTeams.length}/2). Sua combinação não pode ser idêntica à do adversário.`
                      : "Escolha um time diferente do adversário."}
                  </p>

                  {/* Lista de times */}
                  {x1Options?.teams ? (
                    <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
                      {availableTeams.map((team) => {
                        const isSelected = selectedTeams.includes(team.name);
                        const isDisabled = !isSelected && selectedTeams.length >= requiredCount;
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
                  ) : (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                    </div>
                  )}

                  {/* Botão de confirmar */}
                  <Button
                    className="w-full font-bold"
                    style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
                    onClick={handleAcceptPrediction}
                    disabled={accept.isPending || selectedTeams.length < requiredCount}
                  >
                    {accept.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Swords className="w-4 h-4 mr-2" />
                    )}
                    Confirmar aposta e aceitar ⚔️
                  </Button>
                </div>
              )}

              {/* Recusar */}
              {!showAcceptStep && (
                <Button
                  variant="outline"
                  className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                  onClick={() => decline.mutate({ challengeId })}
                  disabled={decline.isPending}
                >
                  {decline.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <X className="w-4 h-4 mr-2" />
                  )}
                  Recusar
                </Button>
              )}
            </>
          )}

          {/* ── Desafiante pode cancelar ── */}
          {isPending && iAmChallenger && (
            <Button
              variant="outline"
              className="w-full border-border/40 text-muted-foreground hover:text-foreground"
              onClick={() => cancel.mutate({ challengeId })}
              disabled={cancel.isPending}
            >
              {cancel.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <X className="w-4 h-4 mr-2" />
              )}
              Cancelar desafio
            </Button>
          )}

          {/* ── Verificar resultado (score_duel ativo) ── */}
          {isActive && challenge.challengeType === "score_duel" && (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => conclude.mutate({ challengeId })}
              disabled={conclude.isPending}
            >
              {conclude.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trophy className="w-4 h-4 mr-2" />
              )}
              Verificar resultado
            </Button>
          )}
        </div>

        {/* Expiração */}
        {isPending && challenge.expiresAt && (
          <p className="text-center text-xs text-muted-foreground/60">
            Expira em{" "}
            {new Date(challenge.expiresAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </div>
  );
}
