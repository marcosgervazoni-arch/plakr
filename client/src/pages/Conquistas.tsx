/**
 * Conquistas — Página dedicada ao histórico e progresso de badges do usuário.
 * Seção 1: Grade hexagonal com todos os badges e progresso individual
 * Seção 2: Linha do tempo de conquistas (badges ganhos com data)
 * Seção 3: Comparação com a plataforma (% de usuários com cada badge)
 */
import AppShell from "@/components/AppShell";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { useAnalytics } from "@/hooks/useAnalytics";
import { useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Award,
  Lock,
  Trophy,
  Calendar,
  Users,
  TrendingUp,
  Star,
  ChevronLeft,
  Sparkles,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BadgeCard, type BadgeCardItem, type BadgeRarity } from "@/components/BadgeCard";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface BadgeProgress extends BadgeCardItem {
  platformPercent: number;
  holders: number;
}

// ─── CONFIGURAÇÃO DE RARIDADE ─────────────────────────────────────────────────

const RARITY_CONFIG: Record<BadgeRarity, { label: string; color: string; barColor: string }> = {
  common:    { label: "Comum",    color: "text-slate-400",  barColor: "bg-slate-400" },
  uncommon:  { label: "Incomum",  color: "text-green-400",  barColor: "bg-green-400" },
  rare:      { label: "Raro",     color: "text-blue-400",   barColor: "bg-blue-400" },
  epic:      { label: "Épico",    color: "text-purple-400", barColor: "bg-purple-400" },
  legendary: { label: "Lendário", color: "text-primary",  barColor: "bg-primary" },
};

const CATEGORY_LABELS: Record<string, string> = {
  precisao:    "🎯 Precisão",
  ranking:     "🏆 Ranking",
  zebra:       "🦓 Zebra",
  comunidade:  "🌱 Comunidade",
  publicidade: "📢 Publicidade",
  exclusivo:   "🎖️ Exclusivo",
};
const CATEGORY_ORDER = ["precisao", "ranking", "zebra", "comunidade", "publicidade", "exclusivo"];

// ─── COMPONENTE: Skeleton de carregamento ─────────────────────────────────────

function BadgeSkeleton() {
  return (
    <div className="flex flex-col items-center gap-2">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <Skeleton className="w-14 h-3 rounded" />
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function Conquistas() {
  const { user } = useAuth();
  const { trackBadgeUnlocked } = useAnalytics();
  const { data, isLoading } = trpc.badges.myProgress.useQuery(undefined, {
    enabled: !!user,
  });

  // Disparar trackBadgeUnlocked para badges recém-desbloqueados não notificados
  const getNewlyUnlocked = trpc.badges.getNewlyUnlocked.useMutation();
  useEffect(() => {
    if (!user) return;
    getNewlyUnlocked.mutateAsync().then((newBadges) => {
      for (const badge of newBadges) {
        trackBadgeUnlocked({ badge_name: badge.name, badge_id: badge.badgeId });
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const allBadges = (data?.badges ?? []) as BadgeProgress[];
  const earnedBadges = allBadges.filter((b) => b.earned);
  const unearnedBadges = allBadges.filter((b) => !b.earned);
  const timeline = data?.timeline ?? [];

  // Agrupar por categoria
  const byCategory = allBadges.reduce<Record<string, BadgeProgress[]>>((acc, b) => {
    const cat = b.category ?? "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(b);
    return acc;
  }, {});
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => byCategory[c]),
    ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
  ];

  // Ordenar badges da plataforma por raridade (mais raro primeiro)
  const platformRanking = [...allBadges].sort((a, b) => a.platformPercent - b.platformPercent);

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-8">
        {/* ── CABEÇALHO ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </Link>
              <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Trophy className="h-6 w-6 text-brand" />
                Conquistas
              </h1>
            </div>
            {isLoading ? (
              <Skeleton className="h-4 w-48 mt-1" />
            ) : (
              <p className="text-sm text-muted-foreground">
                {data?.totalEarned ?? 0} de {data?.totalBadges ?? 0} badges conquistados
              </p>
            )}
          </div>
          {/* Resumo rápido */}
          {!isLoading && data && data.totalBadges > 0 && (
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-2xl font-bold text-brand tabular-nums">
                  {Math.round((data.totalEarned / data.totalBadges) * 100)}%
                </p>
                <p className="text-xs text-muted-foreground">completo</p>
              </div>
              <div className="w-12 h-12 rounded-full border-4 border-brand/30 flex items-center justify-center bg-brand/10">
                <Sparkles className="h-5 w-5 text-brand" />
              </div>
            </div>
          )}
        </div>

        {/* ── SEÇÃO 1: GRADE DE BADGES POR CATEGORIA ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Todos os Badges
            </h2>
            {!isLoading && earnedBadges.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {earnedBadges.length} conquistados
              </Badge>
            )}
          </div>

          <div className="bg-card border border-border/30 rounded-xl p-6">
            {isLoading ? (
              <div className="flex flex-wrap gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <BadgeSkeleton key={i} />
                ))}
              </div>
            ) : allBadges.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum badge disponível na plataforma ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-8">
                {orderedCats.map((cat) => {
                  const catBadges = byCategory[cat];
                  if (!catBadges || catBadges.length === 0) return null;
                  const catEarned = catBadges.filter((b) => b.earned).length;
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                          {CATEGORY_LABELS[cat] ?? cat}
                        </h3>
                        <span className="text-xs text-muted-foreground">
                          {catEarned}/{catBadges.length}
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-5">
                        {catBadges.map((badge) => (
                          <div key={badge.id} className="flex flex-col items-center gap-1">
                            <BadgeCard badge={badge} size="lg" showStar />
                            {/* Barra de progresso para não conquistados */}
                            {!badge.earned && (badge.criterionType === "early_user" || badge.criterionType === "manual") ? (
                              <div className="w-16 mt-0.5">
                                <Progress value={0} className="h-1" />
                                <p className="text-[10px] text-muted-foreground/50 text-center mt-0.5">
                                  {badge.criterionType === "manual" ? "Manual" : "Não elegível"}
                                </p>
                              </div>
                            ) : !badge.earned && (badge.criterionValue ?? 0) > 0 ? (
                              <div className="w-16 mt-0.5">
                                <Progress value={badge.progressPercent ?? 0} className="h-1" />
                                <p className="text-[10px] text-muted-foreground/50 text-center mt-0.5 tabular-nums">
                                  {badge.currentProgress ?? 0}/{badge.criterionValue}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}

                {earnedBadges.length === 0 && unearnedBadges.length > 0 && (
                  <p className="text-xs text-muted-foreground/50 italic text-center pt-2">
                    Continue apostando para desbloquear seus primeiros badges!
                  </p>
                )}
              </div>
            )}
          </div>
        </section>

        {/* ── SEÇÃO 2: LINHA DO TEMPO ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Histórico de Conquistas
            </h2>
          </div>

          <div className="bg-card border border-border/30 rounded-xl p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4">
                    <Skeleton className="w-12 h-12 rounded-2xl flex-shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-48" />
                    </div>
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <div className="text-center py-8">
                <Trophy className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  Nenhuma conquista ainda
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Participe de bolões e acumule acertos para ganhar badges!
                </p>
              </div>
            ) : (
              <div className="relative">
                {/* Linha vertical da timeline */}
                <div className="absolute left-6 top-6 bottom-6 w-px bg-border/40" />
                <div className="space-y-6">
                  {timeline.map((badge: BadgeProgress) => {
                    const rarity = (badge.rarity ?? "common") as BadgeRarity;
                    const rarityConf = RARITY_CONFIG[rarity];
                    return (
                      <div key={badge.id} className="flex items-start gap-4 relative">
                        {/* Ícone na linha */}
                        <div className="relative z-10 flex-shrink-0">
                          <BadgeCard badge={badge} size="sm" />
                        </div>
                        {/* Conteúdo */}
                        <div className="flex-1 min-w-0 pt-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm text-foreground">{badge.name}</p>
                            <span className={`text-[10px] font-semibold uppercase ${rarityConf.color}`}>
                              {rarityConf.label}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {badge.description}
                          </p>

                        </div>
                        {/* Data */}
                        {badge.earnedAt && (
                          <div className="text-right flex-shrink-0 pt-1">
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {format(new Date(badge.earnedAt), "d MMM", { locale: ptBR })}
                            </p>
                            <p className="text-xs text-muted-foreground/50 tabular-nums">
                              {new Date(badge.earnedAt).getFullYear()}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SEÇÃO 3: RARIDADE DOS BADGES ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Raridade dos Badges
            </h2>

          </div>

          <div className="bg-card border border-border/30 rounded-xl p-6">
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="flex justify-between">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                    <Skeleton className="h-2 w-full rounded-full" />
                  </div>
                ))}
              </div>
            ) : platformRanking.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Dados de comparação ainda não disponíveis.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground/70 mb-4">
                  Ordenados do mais raro ao mais comum. Badges com 0% ainda não foram conquistados por ninguém.
                </p>
                {platformRanking.map((badge) => {
                  const isEarned = badge.earned;
                  const rarity = (badge.rarity ?? "common") as BadgeRarity;
                  const rarityConf = RARITY_CONFIG[rarity];

                  return (
                    <div key={badge.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Mini badge usando BadgeCard size=sm sem nome */}
                          <div
                            className={`w-7 h-7 flex-shrink-0 flex items-center justify-center rounded-lg border-2 transition-all ${
                              isEarned
                                ? "bg-gradient-to-br from-brand/20 to-brand/5 border-brand/40"
                                : "bg-muted/30 border-border/30 grayscale opacity-40"
                            }`}
                          >
                            {badge.emoji ? (
                              <span className="text-sm leading-none">{badge.emoji}</span>
                            ) : badge.iconUrl ? (
                              <img src={badge.iconUrl} alt="" className="w-4 h-4 object-contain" />
                            ) : (
                              <Award className={`h-3.5 w-3.5 ${isEarned ? "text-brand" : "text-muted-foreground/40"}`} />
                            )}
                          </div>
                          <span
                            className={`text-xs font-medium truncate ${
                              isEarned ? "text-foreground" : "text-muted-foreground/60"
                            }`}
                          >
                            {badge.name}
                          </span>
                          {isEarned && (
                            <Star className="h-3 w-3 text-brand fill-brand flex-shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`text-xs font-semibold ${rarityConf.color}`}>
                            {rarityConf.label}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={badge.platformPercent}
                          className={`h-1.5 flex-1 ${isEarned ? "" : "opacity-40"}`}
                        />

                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}
