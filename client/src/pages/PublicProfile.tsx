/**
 * Ficha Pública do Usuário — /profile/:userId
 * Exibe dados de apresentação: avatar, nome, plano, membro desde, bolões e badges.
 * Cards padronizados com o Dashboard: métricas (Aproveit./Melhor pos./Palpites) e
 * DashboardBadgeCarousel (grid 5 colunas, badges md, barra de progresso).
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import DashboardBadgeCarousel from "@/components/DashboardBadgeCarousel";
import {
  Trophy, Crown, Medal, Loader2, AlertCircle, Calendar,
  MessageCircle, Send, Share2, Award, Sparkles, ChevronRight, Info,
  Camera, Copy, Check, Gift, Bell, Shield, Zap, Target, Users,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useParams, Link } from "wouter";
import { getLoginUrl } from "@/const";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { BadgeCardItem } from "@/components/BadgeCard";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar as RechartsRadar,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { Radar } from "lucide-react";

// Tipo explícito para o retorno de getPublicProfile (evita falsos positivos do LSP do Vite)
type PublicProfileData = {
  user: { id: number; name: string | null; avatarUrl: string | null; createdAt: Date; whatsappLink: string | null; telegramLink: string | null };
  plan: { id: number; userId: number; plan: "free" | "pro" | "unlimited"; isActive: boolean; expiresAt: Date | null; stripeSubscriptionId: string | null; updatedAt: Date } | null;
  stats: { totalPoints: number; exactScores: number; poolsCount: number; totalBets: number; accuracy: number };
  bestPosition: number | null;
  recentPools: { id: number; name: string; slug: string; status: string; tournamentName: string | null }[];
  badges: BadgeCardItem[];
  finalPositions: { poolId: number; poolName: string; position: number; totalMembers: number; achievedAt: Date }[];
  radarData: { subject: string; value: number; fullMark: number }[];
};

export default function PublicProfile() {
  const { userId: userIdParam } = useParams<{ userId: string }>();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [resolvedId, setResolvedId] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  useEffect(() => {
    if (userIdParam === "me" && currentUser?.id) {
      setResolvedId(currentUser.id);
    } else {
      const parsed = parseInt(userIdParam ?? "", 10);
      if (!isNaN(parsed)) setResolvedId(parsed);
    }
  }, [userIdParam, currentUser?.id]);

  const isOwnProfileEarly = isAuthenticated && userIdParam === "me";

  // ── Queries condicionais para modo de edição (isOwnProfile) ──────────────────
  const { data: meData } = trpc.users.me.useQuery(undefined, { enabled: isOwnProfileEarly });
  const { data: inviteData } = trpc.users.getMyInviteCode.useQuery(undefined, { enabled: isOwnProfileEarly });
  const { data: referralStats } = trpc.users.getMyReferralStats.useQuery(undefined, { enabled: isOwnProfileEarly });
  const { data: notifPrefs } = trpc.notifications.getPreferences.useQuery(undefined, { enabled: isOwnProfileEarly });

  // ── Mutations de edição ──────────────────────────────────────────────────────
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      if (resolvedId) utils.users.getPublicProfile.invalidate({ userId: resolvedId });
      utils.auth.me.invalidate();
    },
    onError: (err) => toast.error("Erro ao atualizar perfil", { description: err.message }),
  });

  const updateNotifPrefs = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      toast.success("Preferências salvas!");
      utils.notifications.getPreferences.invalidate();
    },
  });

  // ── Avatar upload ────────────────────────────────────────────────────────────
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Imagem muito grande. Máximo 5MB."); return; }
    const localUrl = URL.createObjectURL(file);
    setAvatarPreview(localUrl);
    setUploading(true);
    try {
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const base64 = ev.target?.result as string;
          const res = await fetch("/api/upload", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ data: base64, contentType: file.type, folder: "avatars" }),
          });
          if (!res.ok) throw new Error("Upload falhou");
          const { url } = await res.json();
          await updateProfile.mutateAsync({ avatarUrl: url });
        } catch {
          toast.error("Erro ao enviar imagem. Tente novamente.");
        } finally {
          setAvatarPreview(null);
          setUploading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch {
      setAvatarPreview(null);
      setUploading(false);
      toast.error("Erro ao processar imagem.");
    }
  };

  // ── Copy invite link ─────────────────────────────────────────────────────────
  const handleCopyInvite = () => {
    if (!inviteData?.inviteCode) return;
    const link = `${window.location.origin}/?ref=${inviteData.inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Link copiado!", { description: "Compartilhe com seus amigos." });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  const { data: rawData, isLoading, error } = trpc.users.getPublicProfile.useQuery(
    { userId: resolvedId! },
    { enabled: resolvedId !== null }
  );
  const data = rawData as PublicProfileData | undefined;

  const handleShare = () => {
    const shareUrl = resolvedId
      ? `${window.location.origin}/profile/${resolvedId}`
      : window.location.href;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Link copiado! Qualquer pessoa pode acessar este perfil.");
    });
  };

  // Se o slug for "me" mas o usuário não estiver logado
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

  const { user, plan, recentPools, badges, finalPositions, stats, bestPosition } = data;
  const isPro = plan?.plan === "pro" && plan?.isActive;
  const isUnlimited = plan?.plan === "unlimited" && plan?.isActive;
  const isOwnProfile = isAuthenticated && currentUser?.id === resolvedId;
  const initials = user.name?.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase() ?? "?";
  const earnedBadgesCount = badges?.filter((b) => b.earned ?? !!b.earnedAt).length ?? 0;

  // Dados para modo de edição
  const planLabel = isUnlimited ? "Unlimited" : isPro ? "Pro" : "Free";
  const planColor = isUnlimited ? "text-purple-400" : isPro ? "text-yellow-400" : "text-slate-400";
  const planBg = isUnlimited
    ? "bg-purple-400/10 border-purple-400/30"
    : isPro
    ? "bg-yellow-400/10 border-yellow-400/30"
    : "bg-slate-700/50 border-slate-600/30";
  const referralGoal = (referralStats as any)?.goal ?? 5;
  const referralCount = (referralStats as any)?.totalAccepted ?? 0;
  const referralProgress = Math.min(100, Math.round((referralCount / referralGoal) * 100));
  const hasLiderBadge = badges?.some((b: any) => b.criterionType === "referrals_count" && b.earnedAt !== null);
  const avatarSrc = avatarPreview ?? user.avatarUrl ?? "";
  const notifItems = [
    { key: "inAppGameReminder",    label: "Lembretes de jogos",       desc: "Aviso antes do prazo de palpite" },
    { key: "inAppResultAvailable", label: "Resultados disponíveis",   desc: "Quando os placares são apurados" },
    { key: "inAppRankingUpdate",   label: "Atualizações de ranking",  desc: "Mudanças na sua posição" },
    { key: "inAppSystem",          label: "Conquistas e badges",      desc: "Quando você desbloquear um badge" },
  ];

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

        {/* ── Perfil do Apostador — card de métricas padronizado com o Dashboard ── */}
        <TooltipProvider>
          <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
            {/* Header igual ao card do Dashboard */}
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Perfil do Apostador
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Estatísticas gerais de {isOwnProfile ? "você" : user.name?.split(" ")[0] ?? "este apostador"}
              </p>
            </div>
            {/* Grid de 3 métricas — idêntico ao Dashboard */}
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-border/30">
              {/* Aproveitamento */}
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-0.5 cursor-help">
                      <p className="font-mono font-bold text-2xl text-primary leading-none">
                        {stats?.accuracy ?? 0}
                      </p>
                      <span className="font-mono font-bold text-sm text-primary/70 leading-none mt-1">%</span>
                      <Info className="w-3 h-3 text-muted-foreground/40 ml-0.5" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-center">
                    <p className="text-xs">
                      {stats?.totalBets
                        ? `${Math.round(((stats.accuracy / 100) * stats.totalBets))} palpites corretos de ${stats.totalBets} totais`
                        : "Nenhum palpite registrado ainda"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-xs text-muted-foreground mt-1">Aproveit.</p>
              </div>

              {/* Melhor posição */}
              <div className="text-center border-x border-border/30">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-1 cursor-help">
                      {bestPosition != null ? (
                        <>
                          {bestPosition === 1 && <Crown className="w-4 h-4 text-yellow-400" />}
                          {bestPosition === 2 && <Medal className="w-4 h-4 text-slate-300" />}
                          {bestPosition === 3 && <Medal className="w-4 h-4 text-amber-600" />}
                          <p className={`font-mono font-bold text-2xl leading-none ${
                            bestPosition === 1 ? "text-yellow-400" :
                            bestPosition === 2 ? "text-slate-300" :
                            bestPosition === 3 ? "text-amber-600" :
                            "text-foreground"
                          }`}>
                            {bestPosition}º
                          </p>
                        </>
                      ) : (
                        <p className="font-mono font-bold text-2xl text-muted-foreground/40 leading-none">—</p>
                      )}
                      <Info className="w-3 h-3 text-muted-foreground/40 shrink-0" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[220px] text-center">
                    <p className="text-xs">
                      {bestPosition != null
                        ? `Melhor colocação final em bolões encerrados`
                        : "Nenhum bolão encerrado ainda"}
                    </p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-xs text-muted-foreground mt-1">Melhor pos.</p>
              </div>

              {/* Total de palpites */}
              <div className="text-center">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-center gap-1 cursor-help">
                      <p className="font-mono font-bold text-2xl text-foreground leading-none">
                        {stats?.totalBets ?? 0}
                      </p>
                      <Info className="w-3 h-3 text-muted-foreground/40" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[200px] text-center">
                    <p className="text-xs">Total de palpites registrados em todos os bolões</p>
                  </TooltipContent>
                </Tooltip>
                <p className="text-xs text-muted-foreground mt-1">Palpites</p>
              </div>
            </div>
          </div>
        </TooltipProvider>

        {/* ── Perfil de Apostador — gráfico radar idêntico ao Dashboard ── */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-4 h-4 text-muted-foreground" />
            <h3 className="font-bold text-sm text-muted-foreground uppercase tracking-wider">
              Perfil de Apostador
            </h3>
          </div>
          <div className="bg-card border border-border/30 rounded-xl p-4">
            {!data.radarData || data.radarData.every((d) => d.value === 0) ? (
              <div className="h-[200px] flex flex-col items-center justify-center gap-3">
                <Radar className="w-8 h-8 text-muted-foreground/20" />
                <p className="text-sm text-muted-foreground text-center">
                  O perfil de apostador aparecerá aqui após os primeiros jogos pontuados.
                </p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={data.radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                  <PolarGrid stroke="rgba(255,255,255,0.08)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    tick={{ fontSize: 9, fill: "var(--chart-indigo)" }}
                    tickCount={4}
                  />
                  <RechartsRadar
                    name="Perfil"
                    dataKey="value"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{ fill: "hsl(var(--primary))", r: 3, strokeWidth: 0 }}
                  />
                  <RechartsTooltip
                    contentStyle={{ background: "var(--card)", border: "1px solid #2E3347", borderRadius: "8px", fontSize: "12px" }}
                    formatter={(value: number, name: string) => [`${value}%`, name]}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
          </div>
        </section>

        {/* ── Conquistas — DashboardBadgeCarousel padronizado com o Dashboard ── */}
        {badges && badges.length > 0 && (
          <DashboardBadgeCarousel
            badges={badges}
            userId={resolvedId ?? undefined}
          />
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
                  <div key={fp.id ?? `${fp.poolId}-${fp.position}`} className="flex items-center gap-3 py-2 border-b border-border/50 last:border-0">
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
            Para ver o desempenho detalhado de{"\ "}
            {isOwnProfile ? "você" : user.name?.split(" ")[0] ?? "este apostador"}{"\ "}
            em um bolão específico, clique em "Ver desempenho" ao lado de cada bolão acima.
          </p>
        </div>

        {/* ── Seções de edição — apenas para o próprio usuário ── */}
        {isOwnProfile && (
          <div className="space-y-4">

            {/* Divisor */}
            <div className="flex items-center gap-3">
              <div className="flex-1 border-t border-border/30" />
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configurações da conta</span>
              <div className="flex-1 border-t border-border/30" />
            </div>

            {/* Avatar card */}
            <div className="bg-card border border-border/30 rounded-2xl p-6 flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 ring-2 ring-primary/30">
                  <AvatarImage src={avatarSrc} alt={user.name ?? ""} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">{initials}</AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {uploading ? <Loader2 className="w-6 h-6 text-white animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">{user.name}</p>
                <p className="text-sm text-muted-foreground">{currentUser?.email}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera className="w-4 h-4" />
                {uploading ? "Enviando..." : "Alterar foto"}
              </Button>
            </div>

            {/* Plano card */}
            <div className={`border rounded-2xl p-5 space-y-3 ${planBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`w-5 h-5 ${planColor}`} />
                  <span className="font-semibold text-foreground">Plano {planLabel}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${planColor} border-current`}>
                  {isPro || isUnlimited ? "Ativo" : "Gratuito"}
                </Badge>
              </div>
              {(isPro || isUnlimited) && (meData as any)?.plan?.planExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  Renova em {new Date((meData as any).plan.planExpiresAt).toLocaleDateString("pt-BR")}
                </p>
              )}
              {!isPro && !isUnlimited && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Crie bolões ilimitados, personalize com logo e acesse estatísticas avançadas no plano Pro.
                  </p>
                  <Link href="/upgrade">
                    <Button size="sm" className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold">
                      <Zap className="w-4 h-4" /> Fazer upgrade
                    </Button>
                  </Link>
                </div>
              )}
              {(isPro || isUnlimited) && (
                <Link href="/payments">
                  <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground justify-between">
                    Ver histórico de pagamentos <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>

            {/* Convites — Member Get Member */}
            <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center shrink-0">
                    <Gift className="w-5 h-5 text-pink-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">Convide amigos</h3>
                    <p className="text-sm text-muted-foreground">
                      Convide 5 amigos e ganhe o badge exclusivo <span className="text-pink-400 font-medium">"Líder de Torcida"</span>
                    </p>
                  </div>
                </div>
                {hasLiderBadge && (
                  <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white border-0 gap-1 shrink-0">
                    <Award className="w-3 h-3" /> Conquistado!
                  </Badge>
                )}
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{referralCount} de {referralGoal} amigos cadastrados</span>
                  <span className="font-semibold text-foreground">{referralProgress}%</span>
                </div>
                <Progress value={referralProgress} className="h-2" />
                {referralCount < referralGoal && (
                  <p className="text-xs text-muted-foreground">Faltam {referralGoal - referralCount} cadastro{referralGoal - referralCount !== 1 ? "s" : ""} para conquistar o badge.</p>
                )}
              </div>
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Seu link de convite</p>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono truncate">
                    {(inviteData as any)?.inviteCode ? `${window.location.origin}/?ref=${(inviteData as any).inviteCode}` : "Gerando link..."}
                  </div>
                  <Button variant="outline" size="sm" onClick={handleCopyInvite} disabled={!(inviteData as any)?.inviteCode} className="gap-2 shrink-0">
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>
              {(referralStats as any)?.referrals?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Amigos que se cadastraram</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {((referralStats as any).referrals as any[]).map((r: any, i: number) => (
                      <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-emerald-400" />
                          </div>
                          <span className="text-sm text-foreground">{r.inviteeName}</span>
                        </div>
                        {r.registeredAt && (
                          <span className="text-xs text-muted-foreground shrink-0">{new Date(r.registeredAt).toLocaleDateString("pt-BR")}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notificações */}
            <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
                  <Bell className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Notificações</h3>
                  <p className="text-sm text-muted-foreground">Escolha o que deseja receber</p>
                </div>
              </div>
              <div className="space-y-1">
                {notifItems.map(({ key, label, desc }) => {
                  const prefs = notifPrefs as Record<string, boolean> | null | undefined;
                  const enabled = prefs ? prefs[key] !== false : true;
                  return (
                    <div key={key} className="flex items-center justify-between py-3 border-b border-border/50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-foreground">{label}</p>
                        <p className="text-xs text-muted-foreground">{desc}</p>
                      </div>
                      <button
                        onClick={() => updateNotifPrefs.mutate({ [key]: !enabled })}
                        aria-label={`Alternar ${label}`}
                        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${enabled ? "bg-primary" : "bg-muted"}`}
                      >
                        <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${enabled ? "translate-x-4" : "translate-x-0"}`} />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Informações da conta */}
            <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-500/10 flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-slate-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Informações da conta</h3>
                  <p className="text-sm text-muted-foreground">Dados vinculados ao seu login</p>
                </div>
              </div>
              <div className="space-y-0">
                {[
                  { label: "Nome", value: user.name ?? "—" },
                  { label: "E-mail", value: currentUser?.email ?? "—" },
                  { label: "Membro desde", value: user.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "—" },
                  { label: "Plano atual", value: planLabel, className: planColor },
                ].map(({ label, value, className }) => (
                  <div key={label} className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0">
                    <span className="text-sm text-muted-foreground">{label}</span>
                    <span className={`text-sm font-medium text-foreground ${className ?? ""}`}>{value}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Nome e e-mail são gerenciados pelo seu provedor de login e não podem ser alterados aqui.
              </p>
            </div>

          </div>
        )}

        {/* ── CTA de conversão — apenas para visitantes não autenticados ── */}
        {!isAuthenticated && (
          <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-6 text-center space-y-4">
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
