/**
 * P3 — Entrar em Bolão (código manual)
 * Especificação: card centralizado, campo monoespaçado uppercase,
 * expansão inline com dados do bolão encontrado, confirmação de ingresso.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import {
  Search,
  Trophy,
  Users,
  Calendar,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function EnterPool() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [code, setCode] = useState("");
  const [searchedCode, setSearchedCode] = useState("");
  const [searching, setSearching] = useState(false);
  const [foundPool, setFoundPool] = useState<{
    slug: string;
    name: string;
    logoUrl?: string | null;
    tournament?: { name: string } | null;
    memberCount: number;
    ownerName?: string | null;
    plan: string;
    alreadyMember: boolean;
  } | null>(null);
  const [notFound, setNotFound] = useState(false);

  const searchByCode = trpc.pools.searchByCode.useMutation({
    onSuccess: (data: typeof foundPool) => {
      setSearching(false);
      if (data) {
        setFoundPool(data);
        setNotFound(false);
      } else {
        setFoundPool(null);
        setNotFound(true);
      }
    },
    onError: () => {
      setSearching(false);
      setFoundPool(null);
      setNotFound(true);
    },
  });

  const joinPool = trpc.pools.joinByCode.useMutation({
    onSuccess: (data: { poolId: number; slug: string; alreadyMember: boolean }) => {
      toast.success("Você entrou no bolão!");
      navigate(`/pool/${data.slug}`);
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao entrar no bolão.");
    },
  });

  const handleSearch = () => {
    const trimmed = code.trim().toUpperCase();
    if (!trimmed) return;
    setSearching(true);
    setFoundPool(null);
    setNotFound(false);
    setSearchedCode(trimmed);
    searchByCode.mutate({ code: trimmed });
  };

  const handleJoin = () => {
    if (!foundPool) return;
    joinPool.mutate({ code: searchedCode });
  };

  // Not authenticated — show login prompt
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md bg-card border border-border/50 rounded-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">Entrar em um bolão</h1>
            <p className="text-muted-foreground text-sm">Faça login para buscar e entrar em bolões pelo código de convite.</p>
          </div>
          <a href={getLoginUrl()} className="block">
            <Button className="w-full" size="lg">Entrar com Manus</Button>
          </a>
          <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Voltar para a página inicial
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-4">

        {/* Back link */}
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Voltar para o painel
        </Link>

        {/* Main card */}
        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="p-6 pb-4 border-b border-border/30">
            <div className="flex items-center gap-3 mb-1">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
                <Trophy className="w-5 h-5 text-primary" />
              </div>
              <h1 className="font-bold text-lg">Entrar em um bolão</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">
              Digite o código de convite para encontrar o bolão.
            </p>
          </div>

          {/* Search area */}
          <div className="p-6 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={code}
                onChange={(e) => {
                  setCode(e.target.value.toUpperCase());
                  if (foundPool || notFound) {
                    setFoundPool(null);
                    setNotFound(false);
                  }
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Ex: COPA2026"
                className="pl-9 font-mono text-lg tracking-widest uppercase placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-base"
                maxLength={16}
                autoFocus
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={!code.trim() || searching}
              className="w-full"
              size="lg"
            >
              {searching ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Buscando...</>
              ) : (
                <><Search className="w-4 h-4 mr-2" /> Buscar bolão</>
              )}
            </Button>

            {/* Error state */}
            {notFound && (
              <div className="flex items-center gap-2 text-destructive text-sm bg-destructive/10 rounded-lg px-3 py-2.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>Código não encontrado. Verifique se digitou corretamente.</span>
              </div>
            )}
          </div>

          {/* Found pool — expanded section */}
          {foundPool && (
            <div className="border-t border-border/30 p-6 space-y-4 bg-muted/10 animate-in slide-in-from-top-2 duration-200">
              {/* Pool identity */}
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 overflow-hidden">
                  {foundPool.logoUrl ? (
                    <img src={foundPool.logoUrl} alt={foundPool.name} className="w-full h-full object-cover" />
                  ) : (
                    <Trophy className="w-7 h-7 text-primary" />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-bold text-base truncate">{foundPool.name}</h2>
                  {foundPool.tournament && (
                    <p className="text-sm text-muted-foreground truncate">{foundPool.tournament.name}</p>
                  )}
                  {foundPool.plan === "pro" && (
                    <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mt-0.5">
                      ⭐ Pro
                    </span>
                  )}
                </div>
              </div>

              {/* Pool stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-background/60 rounded-lg p-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Participantes</p>
                    <p className="font-mono font-bold text-sm">{foundPool.memberCount}</p>
                  </div>
                </div>
                <div className="bg-background/60 rounded-lg p-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div>
                    <p className="text-xs text-muted-foreground">Organizador</p>
                    <p className="font-bold text-sm truncate">{foundPool.ownerName ?? "—"}</p>
                  </div>
                </div>
              </div>

              {/* CTA */}
              {foundPool.alreadyMember ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-green-400 bg-green-500/10 rounded-lg px-3 py-2.5">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Você já faz parte deste bolão.</span>
                  </div>
                  <Button
                    onClick={() => navigate(`/pool/${foundPool.slug}`)}
                    className="w-full"
                    variant="outline"
                  >
                    Ir para o bolão →
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleJoin}
                  disabled={joinPool.isPending}
                  className="w-full"
                  size="lg"
                >
                  {joinPool.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                  ) : (
                    "Confirmar ingresso"
                  )}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Alternative */}
        <p className="text-center text-sm text-muted-foreground">
          Prefere explorar bolões abertos?{" "}
          <Link href="/pools/public" className="text-primary hover:underline">
            Ver bolões públicos
          </Link>
        </p>
      </div>
    </div>
  );
}
