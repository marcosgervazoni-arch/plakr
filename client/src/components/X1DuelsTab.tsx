/**
 * X1DuelsTab — Aba "Duelos" na PoolPage
 *
 * Exibe todos os desafios do bolão com:
 *  - Filtro: "Meus Duelos" | "Todos"
 *  - Cards de desafio com status visual, participantes e ações
 *  - Botão de aceitar/recusar para desafios pendentes recebidos
 *  - Link para a página de detalhe do duelo
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Swords, Clock, CheckCircle2, XCircle, Trophy, Minus, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { toast } from "sonner";

interface X1DuelsTabProps {
  poolId: number;
  onChallenge?: () => void;
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
  next_round: "Próxima rodada",
  next_phase: "Próxima fase",
  full_tournament: "Torneio completo",
  next_game: "Próximo jogo",
  specific_game: "Jogo específico",
  top_scorer: "Artilheiro",
  champion: "Campeão",
};

export default function X1DuelsTab({ poolId, onChallenge }: X1DuelsTabProps) {
  const { user } = useAuth();
  const [filter, setFilter] = useState<FilterType>("mine");

  const { data, isLoading, refetch } = trpc.x1.getByPool.useQuery(
    { poolId, filter },
    { enabled: !!poolId }
  );

  const { data: myStats } = trpc.x1.getMyStats.useQuery(
    { poolId },
    { enabled: !!poolId && !!user }
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

  return (
    <div className="space-y-4">
      {/* Stats rápidas do usuário */}
      {myStats && user && (
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

      {/* Alertas de desafios pendentes recebidos */}
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
                      {CHALLENGE_TYPE_LABELS[c.challengeType] ?? c.challengeType}
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

      {/* Filtros + botão novo desafio */}
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
        {onChallenge && (
          <Button
            size="sm"
            className="h-8 gap-1.5 shrink-0 bg-primary/90 hover:bg-primary"
            onClick={onChallenge}
          >
            <Swords className="w-3.5 h-3.5" />
            Desafiar
          </Button>
        )}
      </div>

      {/* Lista de desafios */}
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
          {filter === "mine" && onChallenge && (
            <Button
              size="sm"
              variant="outline"
              className="mt-3 gap-1.5"
              onClick={onChallenge}
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
            const myPoints = iAmChallenger ? c.challengerPoints : c.challengedPoints;
            const oppPoints = iAmChallenger ? c.challengedPoints : c.challengerPoints;
            const opponent = iAmChallenger ? c.challenged : c.challenger;
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
                    <span className="text-xs text-muted-foreground font-medium">
                      {CHALLENGE_TYPE_LABELS[c.challengeType] ?? c.challengeType}
                    </span>
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

                  {/* Footer: data */}
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
