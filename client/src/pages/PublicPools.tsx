/**
 * U2 — Bolões Públicos
 * Especificação: descoberta de bolões abertos ao público.
 * Barra de busca proeminente + filtro por campeonato.
 * Grid de cards com logo, nome, campeonato, participantes, organizador.
 * Badge Pro/Free. Botão "Entrar" por card.
 * Estado vazio com CTA para criar bolão.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import {
  Trophy,
  Search,
  Users,
  Crown,
  ChevronLeft,
  Loader2,
  Plus,
  Filter,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function PublicPools() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedTournament, setSelectedTournament] = useState<number | undefined>();
  const [joiningSlug, setJoiningSlug] = useState<string | null>(null);

  // Debounce search
  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => setDebouncedSearch(value), 400);
    return () => clearTimeout(timer);
  }, []);

  const { data: tournamentsData } = trpc.tournaments.listGlobal.useQuery();
  const { data, isLoading, refetch } = trpc.pools.listPublic.useQuery(
    { search: debouncedSearch || undefined, tournamentId: selectedTournament },
    { enabled: isAuthenticated }
  );

  const joinMutation = trpc.pools.joinByToken.useMutation({
    onSuccess: (result: { poolId: number; slug: string; alreadyMember: boolean }) => {
      setJoiningSlug(null);
      if (result.alreadyMember) {
        toast.info("Você já é membro deste bolão.");
      } else {
        toast.success("Você entrou no bolão!");
      }
      navigate(`/pool/${result.slug}`);
    },
    onError: (err: { message?: string }) => {
      setJoiningSlug(null);
      toast.error(err.message || "Erro ao entrar no bolão.");
    },
  });

  const pools = data?.pools ?? [];
  const tournaments = tournamentsData ?? [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/30">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <Trophy className="w-4 h-4 text-primary shrink-0" />
            <span className="font-bold text-sm" style={{ fontFamily: "'Syne', sans-serif" }}>
              Bolões Públicos
            </span>
          </div>
          <Link href="/dashboard">
            <Button size="sm" variant="ghost" className="text-xs hidden sm:flex">
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Criar bolão
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">

        {/* Search + filters */}
        <div className="space-y-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Buscar bolões por nome..."
              className="pl-9 bg-card border-border/50 h-10"
            />
          </div>

          {/* Tournament filter chips */}
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
            {pools.map((pool: any) => (
              <div
                key={pool.id}
                className="bg-card border border-border/30 rounded-xl overflow-hidden hover:border-primary/30 transition-all group"
              >
                {/* Card header */}
                <div className="p-4 flex items-start gap-3">
                  {/* Logo */}
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden border border-primary/20">
                    {pool.logoUrl ? (
                      <img src={pool.logoUrl} alt={pool.name} className="w-full h-full object-cover" />
                    ) : (
                      <Trophy className="w-6 h-6 text-primary" />
                    )}
                  </div>

                  {/* Info */}
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

                {/* Action */}
                <div className="px-4 pb-4">
                  <Button
                    onClick={() => {
                      setJoiningSlug(pool.slug);
                      navigate(`/pool/${pool.slug}`);
                    }}
                    disabled={joiningSlug === pool.slug}
                    className="w-full"
                    size="sm"
                  >
                    {joiningSlug === pool.slug ? (
                      <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Abrindo...</>
                    ) : (
                      "Ver bolão →"
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
