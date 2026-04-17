/**
 * X1DuelsTab — Arena pública de Duelos do bolão
 *
 * Exibe todos os desafios do bolão com:
 *  - Bloco de estatísticas do bolão (total, pendentes, em andamento, encerrados, top vencedor)
 *  - Seus duelos em destaque (pendentes recebidos com CTA aceitar/recusar)
 *  - Filtro: "Meus Duelos" | "Todos"
 *  - Cards de desafio com status visual, participantes e placar
 *  - Seletor de adversário para desafiar direto da aba
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Swords, Clock, CheckCircle2, XCircle, Trophy,
  Minus, AlertCircle, Plus, Crown, Users, ChevronRight,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { toast } from "sonner";

interface X1DuelsTabProps {
  poolId: number;
  poolSlug: string;
  onChallenge?: (opponentId: number, opponentName: string) => void;
}

type FilterType = "mine" | "all";

const STATUS_CONFIG = {
  pending: {
    label: "Aguardando",
    icon: Clock,
    className: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  },
  active: {
    label: "Em andamento",
    icon: Swords,
    className: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  },
  concluded: {
    label: "Concluído",
    icon: Trophy,
    className: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  },
  expired: {
    label: "Expirado",
    icon: XCircle,
    className: "bg-muted/50 text-muted-foreground border-border/30",
  },
  declined: {
    label: "Recusado",
    icon: XCircle,
    className: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  cancelled: {
    label: "Cancelado",
    icon: Minus,
    className: "bg-muted/50 text-muted-foreground border-border/30",
  },
};

const CHALLENGE_TYPE_LABELS: Record<string, string> = {
  score_duel: "Disputa de palpites",
  prediction: "Previsão de campeonato",
};

const PREDICTION_TYPE_LABELS: Record<string, string> = {
  champion: "Quem vai ser o campeão?",
  group_qualified: "Quem classifica no grupo?",
  phase_qualified: "Quem passa para a fase?",
};

const SCOPE_TYPE_LABELS: Record<string, string> = {
  next_round: "Próxima rodada",
  next_phase: "Próxima fase",
  next_n_games: "Próximos jogos",
};

export default function X1DuelsTab({ poolId, poolSlug, onChallenge }: X1DuelsTabProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("mine");
  const [showOpponentPicker, setShowOpponentPicker] = useState(false);

  const { data, isLoading, refetch } = trpc.x1.getByPool.useQuery(
    { poolId, filter },
    { enabled: !!poolId }
  );

  const { data: myStats } = trpc.x1.getMyStats.useQuery(
    { poolId },
    { enabled: !!poolId && !!user }
  );

  const { data: poolStats } = trpc.x1.getPoolStats.useQuery(
    { poolId },
    { enabled: !!poolId }
  );

  const { data: membersData } = trpc.pools.getMembers.useQuery(
    { poolId },
    { enabled: !!poolId && showOpponentPicker }
  );

  const accept = trpc.x1.accept.useMutation({
    onSuccess: () => {
      toast.success("Desafio aceito! O duelo começou.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const decline = trpc.x1.decline.useMutation({
    onSuccess: () => {
      toast.success("Desafio recusado.");
      refetch();
    },
    onError: (e) => toast.error(e.message),
  });

  const challenges = data ?? [];
  const pendingReceived = challenges.filter(
    (c) => c.status === "pending" && c.challengedId === user?.id
  );

  // Lista de membros disponíveis para desafiar (excluindo o próprio usuário)
  const availableOpponents = membersData
    ? (Array.isArray(membersData) ? membersData : (membersData?.items ?? []))
        .filter(({ user: u }: any) => u?.id !== user?.id)
    : [];

  return (
    <div className="space-y-4">

      {/* ── Estatísticas do bolão ── */}
      {poolStats && (
        <div className="bg-card/60 border border-border/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Arena do Bolão
          </p>
          <div className="grid grid-cols-4 gap-2 mb-3">
            {[
              { label: "Total", value: poolStats.total, color: "text-foreground" },
              { label: "Pendentes", value: poolStats.pending, color: "text-amber-400" },
              { label: "Ativos", value: poolStats.active, color: "text-blue-400" },
              { label: "Encerrados", value: poolStats.concluded, color: "text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className={`text-xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
              </div>
            ))}
          </div>
          {poolStats.topWinner && (
            <div className="flex items-center gap-2 bg-amber-500/5 border border-amber-500/15 rounded-lg px-3 py-2">
              <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Mais vitórias:{" "}
                <span className="font-semibold text-amber-300">{poolStats.topWinner.name}</span>
                <span className="text-muted-foreground/60"> ({poolStats.topWinner.wins}V)</span>
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Suas estatísticas pessoais ── */}
      {myStats && user && (myStats.wins > 0 || myStats.losses > 0 || myStats.draws > 0 || myStats.active > 0) && (
        <div className="grid grid-cols-4 gap-2">
          {[
            { label: "Vitórias", value: myStats.wins, color: "text-emerald-400" },
            { label: "Derrotas", value: myStats.losses, color: "text-red-400" },
            { label: "Empates", value: myStats.draws, color: "text-amber-400" },
            { label: "Ativos", value: myStats.active, color: "text-blue-400" },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-card/60 border border-border/30 rounded-xl p-2.5 text-center"
            >
              <p className={`text-lg font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Alertas de desafios pendentes recebidos ── */}
      {pendingReceived.length > 0 && (
        <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
            <p className="text-sm font-medium text-amber-300">
              {pendingReceived.length === 1
                ? "Você tem 1 desafio pendente!"
                : `Você tem ${pendingReceived.length} desafios pendentes!`}
            </p>
          </div>
          <div className="space-y-2">
            {pendingReceived.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between gap-2 bg-card/60 rounded-lg px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">
                    <span className="text-primary">{c.challenger?.name ?? "Alguém"}</span>
                    {" te desafiou — "}
                    <span className="text-muted-foreground">
                      {c.challengeType === "prediction" && c.predictionType
                        ? (PREDICTION_TYPE_LABELS[c.predictionType] ?? c.predictionType)
                        : c.challengeType === "score_duel" && c.scopeType
                          ? `Palpites — ${SCOPE_TYPE_LABELS[c.scopeType] ?? c.scopeType}`
                          : (CHALLENGE_TYPE_LABELS[c.challengeType] ?? c.challengeType)}
                    </span>
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Expira {c.expiresAt ? formatDistanceToNow(new Date(c.expiresAt), { addSuffix: true, locale: ptBR }) : "em breve"}
                  </p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-2 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10"
                    onClick={() => decline.mutate({ challengeId: c.id })}
                    disabled={decline.isPending}
                  >
                    Recusar
                  </Button>
                  <Link href={`/x1/${c.id}`}>
                    <Button
                      size="sm"
                      className="h-7 px-2 text-xs bg-primary/90 hover:bg-primary"
                    >
                      Ver
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Seletor de adversário ── */}
      {showOpponentPicker && (
        <div className="bg-card/80 border border-primary/20 rounded-xl p-3">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">Escolha um adversário</p>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs text-muted-foreground"
              onClick={() => setShowOpponentPicker(false)}
            >
              Cancelar
            </Button>
          </div>
          {availableOpponents.length === 0 ? (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-1.5 max-h-60 overflow-y-auto">
              {availableOpponents.map(({ user: u }: any) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setShowOpponentPicker(false);
                    if (onChallenge) onChallenge(u.id, u.name ?? "");
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-primary/10 transition-colors text-left"
                >
                  <div className="w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center text-xs font-bold shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <span className="text-sm font-medium flex-1 truncate">{u.name ?? "Participante"}</span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground/50 shrink-0" />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Filtros + botão novo desafio ── */}
      <div className="flex items-center gap-2">
        <div className="flex bg-card/60 border border-border/30 rounded-lg p-0.5 flex-1">
          {(["mine", "all"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 text-xs py-1.5 rounded-md font-medium transition-all ${
                filter === f
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f === "mine" ? "Meus Duelos" : "Todos"}
            </button>
          ))}
        </div>
        <Button
          size="sm"
          className="h-8 gap-1.5 shrink-0 bg-primary/90 hover:bg-primary"
          onClick={() => setShowOpponentPicker((v) => !v)}
        >
          <Plus className="w-3.5 h-3.5" />
          Desafiar
        </Button>
      </div>

      {/* ── Lista de desafios ── */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-14">
          <Swords className="w-10 h-10 mx-auto mb-3 opacity-15" />
          <p className="text-sm font-medium text-muted-foreground">
            {filter === "mine" ? "Você ainda não tem duelos neste bolão." : "Nenhum duelo neste bolão ainda."}
          </p>
          {filter === "mine" && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1.5"
              onClick={() => setShowOpponentPicker(true)}
            >
              <Swords className="w-3.5 h-3.5" />
              Criar primeiro duelo
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {challenges.map((c) => {
            const statusCfg = STATUS_CONFIG[c.status as keyof typeof STATUS_CONFIG] ?? STATUS_CONFIG.cancelled;
            const StatusIcon = statusCfg.icon;
            const isMine = c.challengerId === user?.id || c.challengedId === user?.id;
            const iAmChallenger = c.challengerId === user?.id;
            const isWinner = c.winnerId === user?.id;
            const isDraw = c.status === "concluded" && c.winnerId === null;

            return (
              <Link key={c.id} href={`/x1/${c.id}`}>
                <div
                  className={`bg-card/60 border rounded-xl p-3.5 hover:border-border/60 transition-all cursor-pointer ${
                    isMine ? "border-primary/20" : "border-border/30"
                  }`}
                >
                  {/* Header: tipo + status */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="min-w-0 flex-1 mr-2">
                      <span className="text-xs text-muted-foreground font-medium block truncate">
                        {c.challengeType === "prediction" && c.predictionType
                          ? (PREDICTION_TYPE_LABELS[c.predictionType] ?? c.predictionType)
                          : c.challengeType === "score_duel" && c.scopeType
                            ? `Palpites — ${SCOPE_TYPE_LABELS[c.scopeType] ?? c.scopeType}`
                            : (CHALLENGE_TYPE_LABELS[c.challengeType] ?? c.challengeType)}
                      </span>
                    </div>
                    <Badge className={`text-[10px] gap-1 py-0 h-5 ${statusCfg.className}`}>
                      <StatusIcon className="w-2.5 h-2.5" />
                      {statusCfg.label}
                    </Badge>
                  </div>

                  {/* Placar: Challenger vs Challenged */}
                  <div className="flex items-center gap-3">
                    {/* Challenger */}
                    <div className="flex-1 text-center">
                      <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
                        c.winnerId === c.challengerId
                          ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                          : "bg-muted/50 text-muted-foreground"
                      }`}>
                        {c.challenger?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <p className="text-xs font-medium truncate max-w-[80px] mx-auto">
                        {c.challengerId === user?.id ? "Você" : (c.challenger?.name ?? "—")}
                      </p>
                      {c.status !== "pending" && (
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {c.challengerPoints ?? 0}
                          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pts</span>
                        </p>
                      )}
                    </div>

                    {/* VS */}
                    <div className="flex flex-col items-center gap-0.5 shrink-0">
                      {c.status === "concluded" ? (
                        isDraw ? (
                          <span className="text-xs font-bold text-amber-400">EMPATE</span>
                        ) : (
                          <Trophy className="w-4 h-4 text-emerald-400" />
                        )
                      ) : (
                        <Swords className="w-4 h-4 text-muted-foreground/50" />
                      )}
                      <span className="text-[10px] text-muted-foreground/50">vs</span>
                    </div>

                    {/* Challenged */}
                    <div className="flex-1 text-center">
                      <div className={`w-8 h-8 rounded-full mx-auto mb-1 flex items-center justify-center text-xs font-bold ${
                        c.winnerId === c.challengedId
                          ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/40"
                          : "bg-muted/50 text-muted-foreground"
                      }`}>
                        {c.challenged?.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <p className="text-xs font-medium truncate max-w-[80px] mx-auto">
                        {c.challengedId === user?.id ? "Você" : (c.challenged?.name ?? "—")}
                      </p>
                      {c.status !== "pending" && (
                        <p className="text-sm font-bold text-foreground mt-0.5">
                          {c.challengedPoints ?? 0}
                          <span className="text-[10px] font-normal text-muted-foreground ml-0.5">pts</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Footer: data + resultado pessoal */}
                  <div className="mt-2.5 pt-2 border-t border-border/20 flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                    {c.status === "concluded" && isMine && (
                      <span className={`text-[10px] font-semibold ${
                        isWinner ? "text-emerald-400" : isDraw ? "text-amber-400" : "text-red-400"
                      }`}>
                        {isWinner ? "Você venceu!" : isDraw ? "Empate" : "Você perdeu"}
                      </span>
                    )}
                    {c.status === "pending" && c.challengedId === user?.id && (
                      <span className="text-[10px] font-semibold text-amber-400">
                        Aguardando sua resposta
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
