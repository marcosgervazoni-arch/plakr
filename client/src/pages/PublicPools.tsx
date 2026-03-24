/**
 * U2 — Bolões Públicos
 * Especificação: descoberta de bolões abertos ao público.
 * Barra de busca proeminente + filtro por campeonato.
 * Grid de cards com logo, nome, campeonato, participantes, organizador.
 * Badge de status: "Aguardando início" ou barra de progresso com % de conclusão.
 * Modal de confirmação antes de entrar. Indicador "Você já participa".
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import {
  Trophy,
  Search,
  Users,
  Crown,
  Loader2,
  Plus,
  Filter,
  CheckCircle2,
  ArrowRight,
  Clock,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

type Pool = {
  id: number;
  slug: string;
  name: string;
  logoUrl?: string | null;
  plan: string;
  description?: string | null;
  tournamentName?: string | null;
  ownerName?: string | null;
  memberCount: number;
  isMember: boolean;
  totalGames: number;
  finishedGames: number;
  nextMatchDate?: Date | string | null;
};

/** Retorna o estado do bolão com base nos jogos do torneio */
function getPoolProgress(pool: Pool): {
  status: "not_started" | "in_progress" | "finished";
  percent: number;
  label: string;
  nextMatch: string | null;
} {
  const total = pool.totalGames;
  const finished = pool.finishedGames;

  if (total === 0) {
    return { status: "not_started", percent: 0, label: "Aguardando início", nextMatch: null };
  }

  const percent = Math.round((finished / total) * 100);

  if (finished === 0) {
    const nextMatch = pool.nextMatchDate
      ? formatDistanceToNow(new Date(pool.nextMatchDate), { locale: ptBR, addSuffix: true })
      : null;
    return { status: "not_started", percent: 0, label: "Aguardando início", nextMatch };
  }

  if (finished >= total) {
    return { status: "finished", percent: 100, label: "Encerrado", nextMatch: null };
  }

  const nextMatch = pool.nextMatchDate
    ? format(new Date(pool.nextMatchDate), "dd/MM", { locale: ptBR })
    : null;

  return { status: "in_progress", percent, label: `${percent}% concluído`, nextMatch };
}

export default function PublicPools() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<number | undefined>();
  const [confirmPool, setConfirmPool] = useState<Pool | null>(null);
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    return () => clearTimeout(timer);
  }, []);

  const { data: tournamentsData } = trpc.tournaments.listGlobal.useQuery();
  const { data, isLoading } = trpc.pools.listPublic.useQuery(
    { search: debouncedSearch || undefined, tournamentId: selectedTournament },
    { enabled: isAuthenticated }
  );

  const joinMutation = trpc.pools.joinPublic.useMutation({
    onSuccess: (result: { poolId: number; slug: string; alreadyMember: boolean }) => {
      setJoiningSlug(null);
      setConfirmPool(null);
      if (result.alreadyMember) {
        toast.info("Você já faz parte deste bolão.");
      } else {
        toast.success("Você entrou no bolão! Bons palpites! 🎉");
      }
      navigate(`/pool/${result.slug}`);
    },
    onError: (err: { message?: string }) => {
      setJoiningSlug(null);
      toast.error(err.message || "Não foi possível entrar no bolão. Tente novamente.");
    },
  });

  const handleConfirmJoin = () => {
    if (!confirmPool) return;
    setJoiningSlug(confirmPool.slug);
    joinMutation.mutate({ slug: confirmPool.slug });
  };

  const pools = data?.pools ?? [];
  const tournaments = tournamentsData ?? [];

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>Bolões Públicos</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Descubra e entre em bolões abertos</p>
          </div>
          <Link href="/create-pool">
            <Button size="sm" className="gap-2">
              <Plus className="w-4 h-4" /> Criar Bolão
            </Button>
          </Link>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar bolões por nome..."
              className="pl-9 bg-card border-border/50 h-10"
            />
          </div>

          {tournaments.length > 0 && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              <div className="flex items-center gap-1 shrink-0">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Campeonato:</span>
              </div>
              <button
                onClick={() => setSelectedTournament(undefined)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  !selectedTournament
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                Todos
              </button>
              {tournaments.map((t: any) => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTournament(t.id === selectedTournament ? undefined : t.id)}
                  className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all whitespace-nowrap ${
                    selectedTournament === t.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card border-border/50 text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {t.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Results count */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {pools.length === 0
              ? "Nenhum bolão encontrado"
              : `${pools.length} bolão${pools.length !== 1 ? "s" : ""} encontrado${pools.length !== 1 ? "s" : ""}`}
          </p>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && pools.length === 0 && (
          <div className="bg-card border border-border/30 rounded-xl p-10 text-center space-y-4">
            <Trophy className="w-12 h-12 text-muted-foreground/20 mx-auto" />
            <div>
              <p className="font-semibold text-sm">Nenhum bolão público encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {debouncedSearch
                  ? `Nenhum resultado para "${debouncedSearch}"`
                  : "Ainda não há bolões públicos disponíveis."}
              </p>
            </div>
            <Link href="/dashboard">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Criar um bolão
              </Button>
            </Link>
          </div>
        )}

        {/* Pool cards grid */}
        {!isLoading && pools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {pools.map((pool: Pool) => {
              const progress = getPoolProgress(pool);
              return (
                <div
                  key={pool.id}
                  className={`bg-card border rounded-xl overflow-hidden transition-all group flex flex-col ${
                    pool.isMember
                      ? "border-primary/40 hover:border-primary/60"
                      : "border-border/30 hover:border-primary/30"
                  }`}
                >
                  {/* Card header */}
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                      {pool.logoUrl ? (
                        <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
                      ) : (
                        <Trophy className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm leading-tight truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
                          {pool.name}
                        </h3>
                        {pool.plan === "pro" && (
                          <Badge className="shrink-0 bg-primary/10 text-primary border-primary/20 text-xs py-0">
                            <Crown className="w-2.5 h-2.5 mr-1" /> Pro
                          </Badge>
                        )}
                      </div>
                      {pool.tournamentName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{pool.tournamentName}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="px-4 pb-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      <span className="font-mono font-semibold text-foreground">{pool.memberCount}</span>
                      participantes
                    </span>
                    {pool.ownerName && (
                      <span className="truncate">por {pool.ownerName}</span>
                    )}
                  </div>

                  {/* ── Status do campeonato ── */}
                  <div className="px-4 pb-3">
                    {progress.status === "not_started" ? (
                      /* Badge "Aguardando início" */
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" />
                          Aguardando início
                        </span>
                        {progress.nextMatch && (
                          <span className="text-xs text-muted-foreground">· {progress.nextMatch}</span>
                        )}
                      </div>
                    ) : progress.status === "finished" ? (
                      /* Badge "Encerrado" */
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                        Encerrado
                      </span>
                    ) : (
                      /* Barra de progresso */
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Em andamento
                            {progress.nextMatch && (
                              <span className="ml-1">· próximo {progress.nextMatch}</span>
                            )}
                          </span>
                          <span className="text-xs font-mono font-semibold text-primary tabular-nums">
                            {progress.percent}%
                          </span>
                        </div>
                        {/* Barra */}
                        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${progress.percent}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {pool.finishedGames} de {pool.totalGames} jogos realizados
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action — empurrado para o rodapé */}
                  <div className="px-4 pb-4 mt-auto">
                    {pool.isMember ? (
                      <Button
                        variant="outline"
                        className="w-full border-primary/30 text-primary hover:bg-primary/5"
                        size="sm"
                        onClick={() => navigate(`/pool/${pool.slug}`)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                        Você já participa
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setConfirmPool(pool)}
                        className="w-full"
                        size="sm"
                      >
                        Quero participar!
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal de confirmação */}
      <Dialog open={!!confirmPool} onOpenChange={(open) => { if (!open && !joiningSlug) setConfirmPool(null); }}>
        <DialogContent className="max-w-sm">
          {confirmPool && (() => {
            const progress = getPoolProgress(confirmPool);
            return (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-3 mb-1">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                      {confirmPool.logoUrl ? (
                        <img src={confirmPool.logoUrl} alt={confirmPool.name} className="w-full h-full object-cover" />
                      ) : (
                        <Trophy className="w-6 h-6 text-primary" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <DialogTitle className="text-base leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                        {confirmPool.name}
                      </DialogTitle>
                      {confirmPool.tournamentName && (
                        <p className="text-xs text-muted-foreground mt-0.5">{confirmPool.tournamentName}</p>
                      )}
                    </div>
                  </div>
                  <DialogDescription className="text-sm text-left">
                    {confirmPool.description
                      ? confirmPool.description
                      : "Você está prestes a entrar neste bolão. Após confirmar, poderá fazer seus palpites imediatamente."}
                  </DialogDescription>
                </DialogHeader>

                <div className="bg-muted/40 rounded-lg p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Participantes</span>
                    <span className="font-semibold font-mono">{confirmPool.memberCount}</span>
                  </div>
                  {confirmPool.ownerName && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Organizador</span>
                      <span className="font-medium truncate max-w-[140px]">{confirmPool.ownerName}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-medium">
                      {progress.status === "not_started" && (
                        <span className="text-amber-400">Aguardando início</span>
                      )}
                      {progress.status === "in_progress" && (
                        <span className="text-primary">{progress.percent}% concluído</span>
                      )}
                      {progress.status === "finished" && (
                        <span className="text-muted-foreground">Encerrado</span>
                      )}
                    </span>
                  </div>
                  {confirmPool.totalGames > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Jogos</span>
                      <span className="font-mono font-semibold">{confirmPool.finishedGames}/{confirmPool.totalGames}</span>
                    </div>
                  )}
                </div>

                <DialogFooter className="gap-2 sm:gap-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmPool(null)}
                    disabled={!!joiningSlug}
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleConfirmJoin}
                    disabled={!!joiningSlug}
                    className="gap-1.5"
                  >
                    {joiningSlug ? (
                      <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Entrando...</>
                    ) : (
                      <>Confirmar entrada <ArrowRight className="w-3.5 h-3.5" /></>
                    )}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
