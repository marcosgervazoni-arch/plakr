/**
 * Meu Perfil — /my-profile
 * Layout duas colunas: identidade + plano (esq) | convites + notificações + conta (dir)
 */
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Loader2, Camera, ExternalLink, Trophy, Target, Users,
  Crown, Copy, Check, Gift, ChevronRight, Shield,
  Bell, Zap, Award,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useState, useRef } from "react";

export default function MyProfile() {
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Queries ──────────────────────────────────────────────────────────────────
  const { data: profile, isLoading } = trpc.users.getPublicProfile.useQuery(
    { userId: user?.id ?? 0 },
    { enabled: !!user?.id }
  );
  const { data: meData } = trpc.users.me.useQuery(undefined, { enabled: !!user?.id });
  const { data: inviteData } = trpc.users.getMyInviteCode.useQuery(undefined, { enabled: !!user?.id });
  const { data: referralStats } = trpc.users.getMyReferralStats.useQuery(undefined, { enabled: !!user?.id });
  const { data: notifPrefs } = trpc.notifications.getPreferences.useQuery(undefined, { enabled: !!user?.id });

  // ── Mutations ─────────────────────────────────────────────────────────────────
  const updateProfile = trpc.users.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      utils.users.getPublicProfile.invalidate({ userId: user?.id ?? 0 });
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

  // ── Avatar upload ─────────────────────────────────────────────────────────────
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

  // ── Copy invite link ──────────────────────────────────────────────────────────
  const handleCopyInvite = () => {
    if (!inviteData?.inviteCode) return;
    const link = `${window.location.origin}/?ref=${inviteData.inviteCode}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      toast.success("Link copiado!", { description: "Compartilhe com seus amigos." });
      setTimeout(() => setCopied(false), 2500);
    });
  };

  // ── Derived values ────────────────────────────────────────────────────────────
  const plan = meData?.plan;
  const isPro = plan?.plan === "pro" && plan?.isActive;
  const isUnlimited = plan?.plan === "unlimited" && plan?.isActive;
  const planLabel = isUnlimited ? "Unlimited" : isPro ? "Pro" : "Free";
  const planColor = isUnlimited ? "text-purple-400" : isPro ? "text-yellow-400" : "text-slate-400";
  const planBg = isUnlimited
    ? "bg-purple-400/10 border-purple-400/30"
    : isPro
    ? "bg-yellow-400/10 border-yellow-400/30"
    : "bg-slate-700/50 border-slate-600/30";

  const stats = profile?.stats;
  const totalBets = Math.max(Number(stats?.totalBets ?? 0), 1);
  const accuracyRate = stats
    ? Math.round(((Number(stats.exactScores ?? 0) + Number(stats.correctScores ?? 0)) / totalBets) * 100)
    : 0;

  const referralGoal = referralStats?.goal ?? 5;
  const referralCount = referralStats?.totalAccepted ?? 0;
  const referralProgress = Math.min(100, Math.round((referralCount / referralGoal) * 100));
  const hasLiderBadge = profile?.badges?.some((b) => b.criterionType === "referrals_count" && b.earnedAt !== null);

  const avatarSrc = avatarPreview ?? profile?.user?.avatarUrl ?? user?.avatarUrl ?? "";
  const initials = (profile?.user?.name ?? user?.name ?? "?")
    .split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  // ── Notification toggles ──────────────────────────────────────────────────────
  const notifItems = [
    { key: "inAppGameReminder",      label: "Lembretes de jogos",         desc: "Aviso antes do prazo de palpite" },
    { key: "inAppResultAvailable",   label: "Resultados disponíveis",     desc: "Quando os placares são apurados" },
    { key: "inAppRankingUpdate",     label: "Atualizações de ranking",    desc: "Mudanças na sua posição" },
    { key: "inAppSystem",            label: "Conquistas e badges",        desc: "Quando você desbloquear um badge" },
  ];

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meu Perfil</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Gerencie sua conta e preferências</p>
          </div>
          <Link href={`/profile/${user?.id}`}>
            <Button variant="outline" size="sm" className="gap-2">
              <ExternalLink className="w-4 h-4" />
              Ver perfil público
            </Button>
          </Link>
        </div>

        {/* Layout duas colunas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Coluna esquerda: identidade + stats + plano ── */}
          <div className="space-y-4">

            {/* Avatar card */}
            <div className="bg-card border border-border rounded-xl p-6 flex flex-col items-center gap-4">
              <div className="relative group">
                <Avatar className="w-24 h-24 ring-2 ring-primary/30">
                  <AvatarImage src={avatarSrc} alt={user?.name ?? ""} />
                  <AvatarFallback className="text-2xl font-bold bg-primary/20 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  {uploading
                    ? <Loader2 className="w-6 h-6 text-white animate-spin" />
                    : <Camera className="w-6 h-6 text-white" />}
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleAvatarChange} />
              </div>
              <div className="text-center">
                <p className="font-semibold text-foreground text-lg">{profile?.user?.name ?? user?.name}</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
              <Button variant="outline" size="sm" className="w-full gap-2" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera className="w-4 h-4" />
                {uploading ? "Enviando..." : "Alterar foto"}
              </Button>
            </div>

            {/* Stats card */}
            <div className="bg-card border border-border rounded-xl p-5 space-y-3">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Estatísticas</h3>
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 mx-auto mb-1">
                    <Trophy className="w-4 h-4 text-primary" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{stats?.totalPoints ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pontos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-emerald-500/10 mx-auto mb-1">
                    <Target className="w-4 h-4 text-emerald-400" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{accuracyRate}%</p>
                  <p className="text-xs text-muted-foreground">Acertos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-500/10 mx-auto mb-1">
                    <Users className="w-4 h-4 text-blue-400" />
                  </div>
                  <p className="text-lg font-bold text-foreground">{stats?.poolsCount ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Bolões</p>
                </div>
              </div>
            </div>

            {/* Plano card */}
            <div className={`border rounded-xl p-5 space-y-3 ${planBg}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className={`w-5 h-5 ${planColor}`} />
                  <span className="font-semibold text-foreground">Plano {planLabel}</span>
                </div>
                <Badge variant="outline" className={`text-xs ${planColor} border-current`}>
                  {isPro || isUnlimited ? "Ativo" : "Gratuito"}
                </Badge>
              </div>
              {(isPro || isUnlimited) && plan?.planExpiresAt && (
                <p className="text-xs text-muted-foreground">
                  Renova em {new Date(plan.planExpiresAt).toLocaleDateString("pt-BR")}
                </p>
              )}
              {!isPro && !isUnlimited && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Crie bolões ilimitados, personalize com logo e acesse estatísticas avançadas no plano Pro.
                  </p>
                  <Link href="/pricing">
                    <Button size="sm" className="w-full gap-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-black font-semibold">
                      <Zap className="w-4 h-4" />
                      Fazer upgrade
                    </Button>
                  </Link>
                </div>
              )}
              {(isPro || isUnlimited) && (
                <Link href="/payments">
                  <Button variant="ghost" size="sm" className="w-full gap-2 text-muted-foreground hover:text-foreground justify-between">
                    Ver histórico de pagamentos
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* ── Coluna direita: convites + notificações + conta ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Convites — Member Get Member */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-5">
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
                    <Award className="w-3 h-3" />
                    Conquistado!
                  </Badge>
                )}
              </div>

              {/* Progresso */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {referralCount} de {referralGoal} amigos cadastrados
                  </span>
                  <span className="font-semibold text-foreground">{referralProgress}%</span>
                </div>
                <Progress value={referralProgress} className="h-2" />
                {referralCount >= referralGoal && !hasLiderBadge && (
                  <p className="text-xs text-emerald-400">🎉 Meta atingida! O badge será atribuído em breve.</p>
                )}
                {referralCount < referralGoal && (
                  <p className="text-xs text-muted-foreground">
                    Faltam {referralGoal - referralCount} cadastro{referralGoal - referralCount !== 1 ? "s" : ""} para conquistar o badge.
                  </p>
                )}
              </div>

              {/* Link de convite */}
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Seu link de convite</p>
                <div className="flex gap-2">
                  <div className="flex-1 min-w-0 bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-muted-foreground font-mono truncate">
                    {inviteData?.inviteCode
                      ? `${window.location.origin}/?ref=${inviteData.inviteCode}`
                      : "Gerando link..."}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyInvite}
                    disabled={!inviteData?.inviteCode}
                    className="gap-2 shrink-0"
                  >
                    {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copied ? "Copiado!" : "Copiar"}
                  </Button>
                </div>
              </div>

              {/* Lista de convidados aceitos */}
              {referralStats && referralStats.referrals.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Amigos que se cadastraram</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {referralStats.referrals.map((r, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted/30 rounded-lg px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-emerald-400" />
                          </div>
                          <span className="text-sm text-foreground">{r.inviteeName}</span>
                        </div>
                        {r.registeredAt && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Date(r.registeredAt).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Notificações */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
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
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
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
                  { label: "Nome", value: user?.name ?? "—" },
                  { label: "E-mail", value: user?.email ?? "—" },
                  {
                    label: "Membro desde",
                    value: user?.createdAt ? new Date(user.createdAt).toLocaleDateString("pt-BR") : "—",
                  },
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
        </div>
      </div>
    </AppShell>
  );
}
