/**
 * Chaveamento do Bolão — /pool/:slug/bracket
 * Visualização da árvore eliminatória por fase para o participante.
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trophy, Shield } from "lucide-react";
import { Link, useParams } from "wouter";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

function MatchCard({ game }: { game: {
  id: number;
  teamAName: string | null;
  teamBName: string | null;
  scoreA: number | null;
  scoreB: number | null;
  matchDate: Date;
  status: string;
  matchNumber: number | null;
  phase: string | null;
} }) {
  const finished = game.status === "finished";
  const live = game.status === "live";
  const winnerA = finished && game.scoreA !== null && game.scoreB !== null && game.scoreA > game.scoreB;
  const winnerB = finished && game.scoreA !== null && game.scoreB !== null && game.scoreB > game.scoreA;

  return (
    <div className={`bg-card border rounded-xl overflow-hidden w-full max-w-[220px] shrink-0 ${
      live ? "border-red-500/40 shadow-red-500/10 shadow-lg" : "border-border/30"
    }`}>
      {/* Status bar */}
      <div className={`px-3 py-1 text-xs font-medium flex items-center justify-between ${
        finished ? "bg-green-500/10 text-green-400" :
        live ? "bg-red-500/10 text-red-400" :
        "bg-muted/30 text-muted-foreground"
      }`}>
        <span>{finished ? "Encerrado" : live ? "Ao vivo" : "Agendado"}</span>
        {game.matchNumber && <span>Jogo {game.matchNumber}</span>}
      </div>
      {/* Teams */}
      <div className="divide-y divide-border/20">
        {/* Team A */}
        <div className={`px-3 py-2 flex items-center justify-between gap-2 ${winnerA ? "bg-green-500/5" : ""}`}>
          <span className={`text-sm font-medium truncate ${winnerA ? "text-green-400" : ""}`}>
            {game.teamAName ?? "A definir"}
          </span>
          {finished && game.scoreA !== null && (
            <span className={`text-sm font-bold shrink-0 ${winnerA ? "text-green-400" : "text-muted-foreground"}`}>
              {game.scoreA}
            </span>
          )}
        </div>
        {/* Team B */}
        <div className={`px-3 py-2 flex items-center justify-between gap-2 ${winnerB ? "bg-green-500/5" : ""}`}>
          <span className={`text-sm font-medium truncate ${winnerB ? "text-green-400" : ""}`}>
            {game.teamBName ?? "A definir"}
          </span>
          {finished && game.scoreB !== null && (
            <span className={`text-sm font-bold shrink-0 ${winnerB ? "text-green-400" : "text-muted-foreground"}`}>
              {game.scoreB}
            </span>
          )}
        </div>
      </div>
      {/* Date */}
      <div className="px-3 py-1.5 border-t border-border/20">
        <p className="text-xs text-muted-foreground">
          {format(new Date(game.matchDate), "dd/MM HH:mm", { locale: ptBR })}
        </p>
      </div>
    </div>
  );
}

export default function PoolBracket() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const poolId = poolData?.pool?.id;

  const { data: bracket, isLoading: bracketLoading } = trpc.pools.getBracket.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const isLoading = poolLoading || bracketLoading;

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/pool/${slug}`}>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Chaveamento
            </h1>
            {poolData && <p className="text-sm text-muted-foreground">{poolData.pool.name}</p>}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !bracket || bracket.length === 0 ? (
          <div className="bg-card border border-border/30 rounded-2xl p-12 text-center space-y-3">
            <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="font-semibold text-muted-foreground">Chaveamento não disponível</p>
            <p className="text-sm text-muted-foreground/70">
              O organizador ainda não configurou as fases eliminatórias deste campeonato.
            </p>
          </div>
        ) : (
          <div className="space-y-10">
            {bracket.map(({ phase, games }) => (
              <div key={phase.key} className="space-y-4">
                {/* Phase header */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    {phase.isKnockout && <Trophy className="w-4 h-4 text-primary" />}
                    <h2 className="font-semibold text-base">{phase.label}</h2>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    {games.length} {games.length === 1 ? "jogo" : "jogos"}
                  </Badge>
                  <div className="flex-1 h-px bg-border/30" />
                </div>

                {/* Games grid */}
                {games.length === 0 ? (
                  <p className="text-sm text-muted-foreground pl-2">Nenhum jogo nesta fase ainda.</p>
                ) : phase.isKnockout ? (
                  /* Knockout: horizontal scroll for bracket feel */
                  <div className="overflow-x-auto pb-2">
                    <div className="flex gap-4 min-w-max">
                      {games.map((game) => (
                        <MatchCard key={game.id} game={game} />
                      ))}
                    </div>
                  </div>
                ) : (
                  /* Group stage: responsive grid */
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {games.map((game) => (
                      <MatchCard key={game.id} game={game} />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
