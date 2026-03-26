/**
 * Ficha Pública do Usuário — /profile/:userId
 * Exibe dados de apresentação: avatar, nome, plano, membro desde, bolões e badges.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import BadgeGrid from "@/components/BadgeGrid";
import {
  Trophy, Crown, Medal, Loader2, AlertCircle, Calendar,
  MessageCircle, Send, ExternalLink, Share2, Award, Sparkles, ChevronRight,
} from "lucide-react";
import { useParams, Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export default function PublicProfile() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [resolvedId, setResolvedId] = useState<number | null>(null);

  useEffect(() => {
    if (userIdParam === "me" && currentUser?.id) {
      setResolvedId(currentUser.id);
    } else {
      const parsed = parseInt(userIdParam ?? "", 10);
      if (!isNaN(parsed)) setResolvedId(parsed);
    }
  }, [userIdParam, currentUser?.id]);

  const { data, isLoading, error } = trpc.users.getPublicProfile.useQuery(
    { userId: resolvedId! },
    { enabled: resolvedId !== null }
  );

  const handleShare = () => {
    // Sempre usa o ID numérico para garantir que o link funcione para não-logados
    const shareUrl = resolvedId
      ? `${window.location.origin}/profile/${resolvedId}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Link copiado! Qualquer pessoa pode acessar este perfil.");
    });
  };

  // Se o slug for "me" mas o usuário não estiver logado, exibir mensagem amigável
  if (userIdParam === "me" && !isAuthenticated && !currentUser) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h1 className="font-bold text-xl">Faça login para ver seu perfil</h1>
          <p className="text-muted-foreground text-sm">
            O link <code className="bg-muted px-1 py-0.5 rounded text-xs">/profile/me</code> exibe o seu próprio perfil.
            Para compartilhar seu perfil com outras pessoas, use o botão "Compartilhar" após fazer login.
          </p>
          <Link href="/dashboard">
            <Button size="sm">Fazer login</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  if (!resolvedId || isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="max-w-md mx-auto px-4 py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-muted-foreground/30 mx-auto" />
          <h1 className="font-bold text-xl">Perfil não encontrado</h1>
          <p className="text-muted-foreground text-sm">
            Este usuário não existe ou o perfil não está disponível.
          </p>
          <Link href="/dashboard">
            <Button variant="outline" size="sm">← Voltar ao painel</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  const { user, plan, recentPools, badges, finalPositions } = data;
  const isPro = plan?.plan === "pro" && plan?.isActive;
  const isOwnProfile = isAuthenticated && currentUser?.id === resolvedId;
  const initials = user.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const earnedBadgesCount = badges?.filter((b: any) => b.earnedAt).length ?? 0;

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* ── Hero card ── */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          <div className="h-20 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
          <div className="px-6 pb-6 -mt-10">
            <div className="flex items-end justify-between gap-4 flex-wrap">
              {/* Avatar */}
              <div className="relative">
                <div className="w-20 h-20 rounded-2xl bg-card border-4 border-card overflow-hidden flex items-center justify-center shadow-lg">
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
              <div className="flex items-center gap-2 pb-1 flex-wrap">
                {(user as any).whatsappLink && (
                  <a href={(user as any).whatsappLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-green-500 border-green-500/30 hover:bg-green-500/10">
                      <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                    </Button>
                  </a>
                )}
                {(user as any).telegramLink && (
                  <a href={(user as any).telegramLink} target="_blank" rel="noopener noreferrer">
                    <Button variant="outline" size="sm" className="gap-2 text-blue-400 border-blue-400/30 hover:bg-blue-400/10">
                      <Send className="w-3.5 h-3.5" /> Telegram
                    </Button>
                  </a>
                )}
                <Button variant="outline" size="sm" onClick={handleShare} className="gap-2">
                  <Share2 className="w-3.5 h-3.5" /> Compartilhar
                </Button>
                {isOwnProfile && (
                  <Link href="/dashboard">
                    <Button size="sm" variant="ghost" className="gap-2">Meu painel →</Button>
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
                {isOwnProfile && (
                  <Badge variant="outline" className="text-xs text-muted-foreground">Você</Badge>
                )}
                {earnedBadgesCount > 0 && (
                  <Badge variant="outline" className="text-xs gap-1 text-primary border-primary/30">
                    <Award className="w-3 h-3" /> {earnedBadgesCount} badge{earnedBadgesCount !== 1 ? "s" : ""}
                  </Badge>
                )}
              </div>
              {user.createdAt && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5" />
                  Membro desde {format(new Date(user.createdAt), "MMMM 'de' yyyy", { locale: ptBR })}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Badges / Conquistas ── */}
        {badges && badges.length > 0 && (
          <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-primary" />
                <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">
                  Conquistas
                </h3>
              </div>
              {isOwnProfile && (
                <Link href="/conquistas">
                  <span className="text-xs text-primary hover:underline cursor-pointer">
                    Ver todas →
                  </span>
                </Link>
              )}
            </div>
            <BadgeGrid badges={badges} />
          </div>
        )}

        {/* ── Bolões que participa ── */}
        <div className="space-y-3">
          <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
            Bolões que participa
          </h3>
          {!recentPools || recentPools.length === 0 ? (
            <div className="bg-card border border-border/30 rounded-xl p-8 text-center space-y-2">
              <Trophy className="w-8 h-8 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum bolão público encontrado.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentPools.map((pool: any) => (
                <div key={pool.poolId} className="bg-card border border-border/30 rounded-xl px-4 py-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 overflow-hidden">
                    {pool.logoUrl ? (
                      <img src={pool.logoUrl} alt={pool.poolName} className="w-full h-full object-cover" />
                    ) : (
                      <Trophy className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{pool.poolName}</p>
                    <p className="text-xs text-muted-foreground">
                      #{pool.rankPosition ?? pool.rank} · {pool.totalPoints ?? 0} pts
                    </p>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Histórico de posições finais ── sempre visível */}
        <div className="bg-card border border-border/30 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm uppercase tracking-wider text-muted-foreground">Histórico de Posições</h3>
          </div>
          {finalPositions && finalPositions.length > 0 ? (
            <div className="space-y-1">
              {(finalPositions as any[]).map((fp) => {
                const pos = fp.position;
                const posIcon =
                  pos === 1 ? <Crown className="w-4 h-4 text-yellow-400" /> :
                  pos === 2 ? <Medal className="w-4 h-4 text-slate-300" /> :
                  pos === 3 ? <Medal className="w-4 h-4 text-[#CD7F32]" /> : null;
                return (
                  <div key={fp.id} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
                    <span className={`text-sm font-bold w-6 text-center shrink-0 ${
                      pos === 1 ? "text-primary" : pos === 2 ? "text-[#E5E5E5]" : pos === 3 ? "text-[#CD7F32]" : "text-muted-foreground"
                    }`}>{pos}º</span>
                    <div className="w-5 shrink-0 flex items-center justify-center">{posIcon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{fp.poolName}</p>
                      {fp.tournamentName && (
                        <p className="text-xs text-muted-foreground truncate">{fp.tournamentName}</p>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground shrink-0">{fp.totalPoints} pts</span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-6 gap-2 text-center">
              <Trophy className="w-8 h-8 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Nenhum bolão encerrado ainda.</p>
              <p className="text-xs text-muted-foreground/60">As posições finais aparecerão aqui quando os bolões forem encerrados.</p>
            </div>
          )}
        </div>

        {/* ── Nota informativa ── */}
        <div className="bg-muted/30 border border-border/20 rounded-xl p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Para ver o desempenho detalhado de{" "}
            {isOwnProfile ? "você" : user.name?.split(" ")[0] ?? "este apostador"}{" "}
            em um bolão específico, clique em "Ver desempenho" ao lado de cada bolão acima.
          </p>
        </div>

        {/* ── CTA de conversão — apenas para visitantes não autenticados ── */}
        {!isAuthenticated && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center space-y-4">
            {/* Detalhe decorativo */}
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-primary/5 rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

            <div className="relative space-y-1">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <span className="text-xs font-semibold text-primary uppercase tracking-widest">Plakr!</span>
              </div>
              <h2 className="text-xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
                Crie seu próprio bolão
              </h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Veja como {user.name?.split(" ")[0] ?? "este apostador"} joga e entre na disputa. Organize seu bolão, convide amigos e acompanhe o ranking em tempo real.
              </p>
            </div>

            <div className="relative flex flex-col sm:flex-row items-center justify-center gap-3">
              <a href={getLoginUrl(window.location.pathname)}>
                <Button size="lg" className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground w-full sm:w-auto">
                  <Trophy className="w-4 h-4" />
                  Criar meu bolão
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </a>
              <a href={getLoginUrl(window.location.pathname)}>
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto">
                  Entrar em um bolão
                </Button>
              </a>
            </div>

            <p className="relative text-xs text-muted-foreground/60">
              Gratuito para começar &middot; Sem cartão de crédito
            </p>
          </div>
        )}

      </div>
    </AppShell>
  );
}
