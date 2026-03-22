/**
 * Perfil Público do Apostador — /profile/:userId
 * Exibe avatar, nome, plano, estatísticas globais e bolões recentes.
 * Acessível sem login. Redireciona /profile/me para o próprio ID.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Trophy,
  Crown,
  Target,
  CheckCircle2,
  Users,
  TrendingUp,
  ChevronRight,
  Loader2,
  AlertCircle,
  Share2,
} from "lucide-react";
import { useParams, Link, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function PublicProfile() {
  const { userId } = useParams<{ userId: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  // Resolve "me" to actual user ID
  useEffect(() => {
    if (userId === "me") {
      if (isAuthenticated && currentUser?.id) {
        setResolvedId(currentUser.id);
      }
    } else {
      const parsed = parseInt(userId ?? "", 10);
      if (!isNaN(parsed)) setResolvedId(parsed);
    }
  }, [userId, isAuthenticated, currentUser?.id]);

  const { data, isLoading, error } = trpc.users.getPublicProfile.useQuery(
    { userId: resolvedId! },
    { enabled: resolvedId !== null }
  );

  const handleShare = () => {
    const url = `${window.location.origin}/profile/${resolvedId}`;
    navigator.clipboard.writeText(url).then(() => {
      toast.success("Link copiado para a área de transferência!");
    });
  };

  const isOwnProfile = isAuthenticated && currentUser?.id === resolvedId;

  // Loading state
  if (!resolvedId || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  // Error / not found
  if (error) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h1 className="font-bold text-xl">Perfil não encontrado</h1>
          <p className="text-muted-foreground text-sm">
            Este usuário não existe ou não está disponível.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">← Voltar ao início</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!data) return null;

  const { user, plan, stats, recentPools } = data;
  const isPro = plan?.plan === "pro" && plan?.isActive;
  const initials = user.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const memberSince = user.createdAt
    ? new Date(user.createdAt).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : "";

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* ── Profile hero ── */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          {/* Banner gradient */}
          <div className="h-24 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />

          <div className="px-6 pb-6 -mt-12">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card overflow-hidden flex items-center justify-center">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt={user.name ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-bold text-2xl text-primary" style={{ fontFamily: "'Syne', sans-serif" }}>
                      {initials}
                    </span>
                  )}
                </div>
                {isPro && (
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-primary flex items-center justify-center border-2 border-card">
                    <Crown className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pb-1">
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar
                </Button>
                {isOwnProfile && (
                  <Link href="/dashboard">
                    <Button size="sm" variant="ghost" className="gap-2">
                      Meu painel →
                    </Button>
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
                  {user.name ?? "Apostador"}
                </h1>
                {isPro ? (
                  <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">
                    <Crown className="w-3 h-3 mr-1" /> Pro
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Gratuito</Badge>
                )}
              </div>
              {memberSince && (
                <p className="text-sm text-muted-foreground mt-0.5">Membro desde {memberSince}</p>
              )}
            </div>
          </div>
        </div>

        {/* ── Stats grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Pontos Totais", value: stats.totalPoints, icon: TrendingUp, color: "text-primary" },
            { label: "Placares Exatos", value: stats.exactScores, icon: CheckCircle2, color: "text-green-400" },
            { label: "Bolões", value: stats.poolsCount, icon: Users, color: "text-blue-400" },
            { label: "Precisão", value: `${stats.accuracy}%`, icon: Target, color: "text-yellow-400" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-card border border-border/30 rounded-xl p-4 text-center space-y-1">
              <Icon className={`w-5 h-5 mx-auto ${color}`} />
              <p className={`font-bold text-2xl ${color}`} style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {value}
              </p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </div>
          ))}
        </div>

        {/* ── Accuracy bar ── */}
        {stats.totalBets > 0 && (
          <div className="bg-card border border-border/30 rounded-xl p-5 space-y-3">
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Desempenho nos Palpites</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Exatos ({stats.exactScores})</span>
                <span>Corretos ({stats.correctScores})</span>
                <span>Total ({stats.totalBets})</span>
              </div>
              <div className="h-3 bg-muted rounded-full overflow-hidden flex">
                <div
                  className="h-full bg-green-500 transition-all"
                  style={{ width: `${(stats.exactScores / stats.totalBets) * 100}%` }}
                />
                <div
                  className="h-full bg-yellow-500 transition-all"
                  style={{ width: `${(stats.correctScores / stats.totalBets) * 100}%` }}
                />
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" />
                  Placar exato
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" />
                  Resultado correto
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-muted inline-block" />
                  Errado
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Recent pools ── */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">Bolões Recentes</h3>
          {recentPools.length === 0 ? (
            <div className="bg-card border border-border/30 rounded-xl p-8 text-center space-y-2">
              <Trophy className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum bolão ainda.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPools.map((pool: any) => (
                <Link key={pool.poolId} href={`/pool/${pool.poolSlug}`}>
                  <div className="bg-card border border-border/30 rounded-xl px-4 py-3 flex items-center gap-3 hover:border-primary/30 transition-all cursor-pointer group">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                      {pool.logoUrl ? (
                        <img src={pool.logoUrl} alt={pool.poolName} className="w-full h-full object-cover" />
                      ) : (
                        <Trophy className="w-5 h-5 text-primary" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{pool.poolName}</p>
                      {pool.rank && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          Posição #{pool.rank} · {pool.totalPoints ?? 0} pts
                        </p>
                      )}
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* ── Global ranking teaser ── */}
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">Ranking Global</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Veja os melhores apostadores de toda a plataforma.
            </p>
          </div>
          <Link href="/ranking">
            <Button size="sm" variant="outline" className="shrink-0">Ver ranking</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
