/**
 * Explorar Bolões
 * Lista todos os bolões ativos (públicos e privados).
 * Busca por nome/campeonato. Badge de tipo de acesso.
 * - Público: botão "Entrar" → confirmação → joinPublic
 * - Privado (código): botão "Acessar" → modal de código → joinByCode
 * - Privado (link): card informativo, sem ação
 * Design mobile-first.
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
  Lock,
  LockOpen,
  Link2,
  KeyRound,
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
  accessType: "public" | "private_code" | "private_link";
  description?: string | null;
  tournamentName?: string | null;
  ownerName?: string | null;
  memberCount: number;
  isMember: boolean;
  totalGames: number;
  finishedGames: number;
  nextMatchDate?: Date | string | null;
};

function getPoolProgress(pool: Pool) {
  const total = pool.totalGames;
  const finished = pool.finishedGames;
  if (total === 0) {
    const nextMatch = pool.nextMatchDate
      ? formatDistanceToNow(new Date(pool.nextMatchDate), { locale: ptBR, addSuffix: true })
      : null;
    return { status: "not_started" as const, percent: 0, label: "Aguardando início", nextMatch };
  }
  if (finished >= total) {
    return { status: "finished" as const, percent: 100, label: "Encerrado", nextMatch: null };
  }
  const percent = Math.round((finished / total) * 100);
  const nextMatch = pool.nextMatchDate
    ? format(new Date(pool.nextMatchDate), "dd/MM", { locale: ptBR })
    : null;
  return { status: "in_progress" as const, percent, label: `${percent}% concluído`, nextMatch };
}

function AccessBadge({ accessType }: { accessType: Pool["accessType"] }) {
  if (accessType === "public") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
        <LockOpen className="w-2.5 h-2.5" /> Público
      </span>
    );
  }
  if (accessType === "private_code") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
        <KeyRound className="w-2.5 h-2.5" /> Código
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground border border-border/30">
      <Link2 className="w-2.5 h-2.5" /> Convite
    </span>
  );
}

export default function PublicPools() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<number | undefined>();

  // Modal confirmação — bolão público
  const [confirmPool, setConfirmPool] = useState<Pool | null>(null);
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  // Modal código — bolão privado
  const [codePool, setCodePool] = useState<Pool | null>(null);
  const [codeInput, setCodeInput] = useState("");
  const [codeError, setCodeError] = useState("");

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
      toast.success(result.alreadyMember ? "Você já faz parte deste bolão." : "Você entrou no bolão! Bons palpites! 🎉");
      navigate(`/pool/${result.slug}`);
    },
    onError: (err: { message?: string }) => {
      setJoiningSlug(null);
      toast.error(err.message || "Não foi possível entrar no bolão.");
    },
  });

  const joinByCodeMutation = trpc.pools.joinByCode.useMutation({
    onSuccess: (result: { poolId: number; slug: string; alreadyMember: boolean }) => {
      setCodePool(null);
      setCodeInput("");
      setCodeError("");
      toast.success(result.alreadyMember ? "Você já faz parte deste bolão." : "Código aceito! Bem-vindo ao bolão! 🎉");
      navigate(`/pool/${result.slug}`);
    },
    onError: (err: { message?: string }) => {
      setCodeError(err.message || "Código inválido. Verifique e tente novamente.");
    },
  });

  const handleConfirmJoin = () => {
    if (!confirmPool) return;
    setJoiningSlug(confirmPool.slug);
    joinMutation.mutate({ slug: confirmPool.slug });
  };

  const handleCodeSubmit = () => {
    const trimmed = codeInput.trim().toUpperCase();
    if (!trimmed) { setCodeError("Digite o código de convite."); return; }
    setCodeError("");
    joinByCodeMutation.mutate({ code: trimmed });
  };

  const pools = data?.pools ?? [];
  const tournaments = tournamentsData ?? [];

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Explorar Bolões
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Encontre e entre em bolões da plataforma
            </p>
          </div>
          <Link href="/create-pool">
            <Button size="sm" className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Criar Bolão</span>
            </Button>
          </Link>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Buscar por nome do bolão..."
            className="pl-9 bg-card border-border/50 h-11 text-base"
          />
        </div>

        {/* Filtro por campeonato */}
        {tournaments.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none -mx-4 px-4">
            <div className="flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground whitespace-nowrap">Campeonato:</span>
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

        {/* Contador */}
        {!isLoading && (
          <p className="text-xs text-muted-foreground">
            {pools.length === 0
              ? "Nenhum bolão encontrado"
              : `${pools.length} bolão${pools.length !== 1 ? "ões" : ""} encontrado${pools.length !== 1 ? "s" : ""}`}
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
              <p className="font-semibold text-sm">Nenhum bolão encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                {debouncedSearch
                  ? `Nenhum resultado para "${debouncedSearch}"`
                  : "Ainda não há bolões disponíveis."}
              </p>
            </div>
            <Link href="/create-pool">
              <Button size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Criar um bolão
              </Button>
            </Link>
          </div>
        )}

        {/* Lista de bolões — coluna única mobile, 2 colunas sm+ */}
        {!isLoading && pools.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {pools.map((pool: Pool) => {
              const progress = getPoolProgress(pool);
              return (
                <div
                  key={pool.id}
                  className={`bg-card border rounded-xl overflow-hidden flex flex-col transition-all ${
                    pool.isMember
                      ? "border-primary/40"
                      : "border-border/40 hover:border-border/70"
                  }`}
                >
                  {/* Cabeçalho do card */}
                  <div className="p-4 flex items-start gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                      {pool.logoUrl ? (
                        <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
                      ) : (
                        <Trophy className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <h3 className="font-bold text-sm leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                          {pool.name}
                        </h3>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <AccessBadge accessType={pool.accessType} />
                          {pool.plan === "pro" && (
                            <Badge className="bg-primary/10 text-primary border-primary/20 text-[10px] py-0 px-1.5">
                              <Crown className="w-2.5 h-2.5 mr-0.5" /> Pro
                            </Badge>
                          )}
                        </div>
                      </div>
                      {pool.tournamentName && (
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{pool.tournamentName}</p>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
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

                  {/* Status do campeonato */}
                  <div className="px-4 pb-3">
                    {progress.status === "not_started" ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          <Clock className="w-3 h-3" /> Aguardando início
                        </span>
                        {progress.nextMatch && (
                          <span className="text-xs text-muted-foreground">· {progress.nextMatch}</span>
                        )}
                      </div>
                    ) : progress.status === "finished" ? (
                      <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-muted/60 text-muted-foreground border border-border/40">
                        Encerrado
                      </span>
                    ) : (
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-muted-foreground">
                            Em andamento
                            {progress.nextMatch && <span className="ml-1">· próximo {progress.nextMatch}</span>}
                          </span>
                          <span className="text-xs font-mono font-semibold text-primary tabular-nums">{progress.percent}%</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-muted/60 overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress.percent}%` }} />
                        </div>
                        <p className="text-xs text-muted-foreground">{pool.finishedGames} de {pool.totalGames} jogos realizados</p>
                      </div>
                    )}
                  </div>

                  {/* Ação — rodapé do card */}
                  <div className="px-4 pb-4 mt-auto">
                    {pool.isMember ? (
                      <Button
                        variant="outline"
                        className="w-full border-primary/30 text-primary hover:bg-primary/5"
                        size="sm"
                        onClick={() => navigate(`/pool/${pool.slug}`)}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" /> Você já participa
                      </Button>
                    ) : pool.accessType === "public" ? (
                      <Button className="w-full" size="sm" onClick={() => setConfirmPool(pool)}>
                        Entrar no bolão
                      </Button>
                    ) : pool.accessType === "private_code" ? (
                      <Button
                        variant="outline"
                        className="w-full gap-2"
                        size="sm"
                        onClick={() => { setCodePool(pool); setCodeInput(""); setCodeError(""); }}
                      >
                        <KeyRound className="w-3.5 h-3.5" /> Tenho um código
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/30 rounded-lg px-3 py-2">
                        <Lock className="w-3.5 h-3.5 shrink-0" />
                        <span>Acesso apenas por link de convite</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal confirmação — bolão público */}
      <Dialog open={!!confirmPool} onOpenChange={(open) => { if (!open && !joiningSlug) setConfirmPool(null); }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
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
                    {confirmPool.description || "Após confirmar, você poderá fazer seus palpites imediatamente."}
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
                      {progress.status === "not_started" && <span className="text-amber-400">Aguardando início</span>}
                      {progress.status === "in_progress" && <span className="text-primary">{progress.percent}% concluído</span>}
                      {progress.status === "finished" && <span className="text-muted-foreground">Encerrado</span>}
                    </span>
                  </div>
                </div>
                <DialogFooter className="gap-2 flex-col sm:flex-row">
                  <Button variant="ghost" size="sm" onClick={() => setConfirmPool(null)} disabled={!!joiningSlug} className="w-full sm:w-auto">
                    Cancelar
                  </Button>
                  <Button size="sm" onClick={handleConfirmJoin} disabled={!!joiningSlug} className="gap-1.5 w-full sm:w-auto">
                    {joiningSlug ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Entrando...</> : <>Confirmar entrada <ArrowRight className="w-3.5 h-3.5" /></>}
                  </Button>
                </DialogFooter>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Modal código — bolão privado */}
      <Dialog open={!!codePool} onOpenChange={(open) => { if (!open && !joinByCodeMutation.isPending) { setCodePool(null); setCodeInput(""); setCodeError(""); } }}>
        <DialogContent className="w-[calc(100vw-2rem)] max-w-sm rounded-2xl">
          {codePool && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 overflow-hidden border border-amber-500/20">
                    {codePool.logoUrl ? (
                      <img src={codePool.logoUrl} alt={codePool.name} className="w-full h-full object-cover" />
                    ) : (
                      <KeyRound className="w-6 h-6 text-amber-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <DialogTitle className="text-base leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {codePool.name}
                    </DialogTitle>
                    {codePool.tournamentName && (
                      <p className="text-xs text-muted-foreground mt-0.5">{codePool.tournamentName}</p>
                    )}
                  </div>
                </div>
                <DialogDescription className="text-sm text-left">
                  Este bolão é privado. Digite o código de convite que você recebeu do organizador para solicitar acesso.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-2">
                <Input
                  value={codeInput}
                  onChange={(e) => { setCodeInput(e.target.value.toUpperCase()); setCodeError(""); }}
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  placeholder="Ex: AB3X9KQW"
                  className="font-mono text-center text-lg tracking-widest h-12 uppercase"
                  maxLength={12}
                  autoFocus
                />
                {codeError && (
                  <p className="text-xs text-destructive text-center">{codeError}</p>
                )}
              </div>

              <DialogFooter className="gap-2 flex-col sm:flex-row">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setCodePool(null); setCodeInput(""); setCodeError(""); }}
                  disabled={joinByCodeMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleCodeSubmit}
                  disabled={joinByCodeMutation.isPending || !codeInput.trim()}
                  className="gap-1.5 w-full sm:w-auto"
                >
                  {joinByCodeMutation.isPending
                    ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Validando...</>
                    : <>Validar código <ArrowRight className="w-3.5 h-3.5" /></>}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
