/**
 * X1ChallengePage — Detalhe de um duelo X1
 *
 * Exibe:
 * - Status do duelo (pendente, ativo, concluído, expirado, cancelado)
 * - Informações dos participantes e suas escolhas
 * - Para score_duel: placar por jogo
 * - Para prediction: as apostas de cada um
 * - Ações: aceitar/recusar (se pendente e sou o desafiado), cancelar (se pendente e sou o desafiante)
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  ChevronRight,
} from "lucide-react";
import { useState } from "react";
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
      {/* Avatar */}
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
      {/* Pontuação */}
      {score !== undefined && score !== null && (
        <p
          className="text-2xl font-black font-mono"
          style={{ color: isWinner ? "#FFB800" : isDraw ? "#E5E5E5" : undefined }}
        >
          {score}
          <span className="text-xs font-normal text-muted-foreground ml-1">pts</span>
        </p>
      )}
      {/* Resposta de previsão */}
      {answer && (
        <div className="text-xs text-muted-foreground">
          <span className="text-foreground font-medium">
            {Array.isArray(answer) ? answer.join(", ") : answer}
          </span>
        </div>
      )}
      {/* Ícone de resultado */}
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
  const [acceptingAnswer, setAcceptingAnswer] = useState<string | null>(null);
  const [showAnswerStep, setShowAnswerStep] = useState(false);

  const { data: challenge, isLoading, refetch } = trpc.x1.getById.useQuery(
    { challengeId },
    { enabled: !!challengeId && !isNaN(challengeId) }
  );

  const utils = trpc.useUtils();

  const accept = trpc.x1.accept.useMutation({
    onSuccess: () => {
      toast.success("Desafio aceito! ⚔️", { description: "O duelo está ativo. Que vença o melhor!" });
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
  const iAmWinner = isConcluded && challenge.winnerId === user?.id;
  const challengerIsWinner = isConcluded && challenge.winnerId === challenge.challengerId;
  const challengedIsWinner = isConcluded && challenge.winnerId === challenge.challengedId;

  const predictionLabel =
    challenge.challengeType === "prediction" && challenge.predictionType
      ? {
          champion: "Campeão",
          runner_up: "Vice-campeão",
          group_qualified: "Classificados do grupo",
          phase_qualified: "Classificados da fase",
          eliminated_in_phase: "Eliminados na fase",
          next_game_winner: "Vencedor do próximo jogo",
        }[challenge.predictionType] ?? challenge.predictionType
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
            {challenge.challengeType === "score_duel" ? "Disputa de palpites — quem pontua mais?" : predictionLabel ?? "Previsão de Campeonato"}
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
            answer={challenge.challengeType === "prediction" ? (challenge.challengerAnswer as string | string[] | null) : null}
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
                : challenge.challengeType === "prediction" && isPending && iAmChallenged
                ? null // ainda não respondeu
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

        {/* Ações */}
        <div className="space-y-2">
          {/* Desafiado pode aceitar ou recusar */}
          {isPending && iAmChallenged && (
            <>
              {challenge.challengeType === "prediction" && !showAnswerStep ? (
                <Button
                  className="w-full font-bold"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
                  onClick={() => setShowAnswerStep(true)}
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Ver desafio e escolher minha aposta
                </Button>
              ) : isPending && iAmChallenged && challenge.challengeType === "score_duel" ? (
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
              ) : null}

              {/* Seleção de resposta para prediction */}
              {showAnswerStep && challenge.challengeType === "prediction" && (
                <div className="rounded-xl border border-border/40 bg-card/60 p-4 space-y-3">
                  <div>
                    <p className="text-sm font-semibold">Escolha sua aposta</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      O desafiante escolheu:{" "}
                      <span className="text-foreground font-medium">
                        {Array.isArray(challenge.challengerAnswer)
                          ? (challenge.challengerAnswer as string[]).join(", ")
                          : (challenge.challengerAnswer as string)}
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      Você não pode escolher a mesma opção.
                    </p>
                  </div>
                  <Button
                    className="w-full"
                    style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
                    onClick={() => {
                      // Para simplificar: aceita sem resposta de previsão (o usuário precisará de uma tela dedicada)
                      // TODO: implementar seleção inline de times
                      toast.info("Selecione sua aposta na tela de detalhes do campeonato.");
                    }}
                  >
                    Confirmar aceitação
                  </Button>
                </div>
              )}

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
            </>
          )}

          {/* Desafiante pode cancelar */}
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

          {/* Concluir duelo (quando todos os jogos terminaram) */}
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
