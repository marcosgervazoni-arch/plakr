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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
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

// ─── LABELS E UNIDADES ────────────────────────────────────────────────────────

const CRITERION_LABELS: Record<string, string> = {
  accuracy_rate: "Taxa de acerto",
  exact_scores_career: "Placares exatos",
  zebra_scores_career: "Zebras acertadas",
  top3_pools: "Top 3 em bolões",
  first_place_pools: "1º lugar em bolões",
  complete_pool_no_blank: "Bolões sem branco",
  consecutive_correct: "Acertos consecutivos",
  referrals_count: "Convites aceitos",
  accuracy_in_pool: "Taxa de acerto",
};

const CRITERION_UNIT: Record<string, string> = {
  accuracy_in_pool: "%",
  accuracy_rate: "%",
};

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface BadgeProgress {
  id: number;
  name: string;
  description: string;
  iconUrl: string | null;
  criterionType: string;
  criterionValue: number;
  earned: boolean;
  earnedAt: Date | null;
  currentProgress: number;
  progressPercent: number;
  platformPercent: number;
  holders: number;
}

// ─── COMPONENTE: Hexágono de Badge ────────────────────────────────────────────

function BadgeHexagonFull({ badge }: { badge: BadgeProgress }) {
  const isEarned = badge.earned;
  const label = CRITERION_LABELS[badge.criterionType] ?? badge.criterionType;
  const unit = CRITERION_UNIT[badge.criterionType] ?? "";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex flex-col items-center gap-2 cursor-default transition-all duration-200 group ${
            isEarned ? "opacity-100" : "opacity-40 grayscale"
          }`}
        >
          {/* Hexagon container */}
          <div
            className={`relative w-16 h-16 flex items-center justify-center rounded-2xl border-2 transition-all ${
              isEarned
                ? "bg-gradient-to-br from-brand/20 to-brand/5 border-brand/40 shadow-[0_0_16px_rgba(var(--brand-rgb),0.25)] group-hover:shadow-[0_0_24px_rgba(var(--brand-rgb),0.4)]"
                : "bg-muted/30 border-border/30"
            }`}
          >
            {badge.iconUrl ? (
              <img
                src={badge.iconUrl}
                alt={badge.name}
                className="w-9 h-9 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <Award
              className={`h-8 w-8 ${badge.iconUrl ? "hidden" : ""} ${
                isEarned ? "text-brand" : "text-muted-foreground/50"
              }`}
            />
            {/* Lock overlay para não conquistados */}
            {!isEarned && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
            {/* Estrela para conquistados */}
            {isEarned && (
              <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-brand flex items-center justify-center">
                <Star className="h-2.5 w-2.5 text-brand-foreground fill-brand-foreground" />
              </div>
            )}
          </div>
          {/* Nome */}
          <span
            className={`text-xs font-medium text-center leading-tight max-w-[64px] ${
              isEarned ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {badge.name}
          </span>
          {/* Barra de progresso para não conquistados */}
          {!isEarned && badge.criterionValue > 0 && (
            <div className="w-16">
              <Progress value={badge.progressPercent} className="h-1" />
              <p className="text-[10px] text-muted-foreground/50 text-center mt-0.5 tabular-nums">
                {badge.currentProgress}/{badge.criterionValue}
              </p>
            </div>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[220px] text-center space-y-1">
        <p className="font-semibold text-sm">{badge.name}</p>
        <p className="text-xs text-muted-foreground">{badge.description}</p>
        <p className="text-xs text-brand/80">
          {label} ≥ {badge.criterionValue}{unit}
        </p>
        {isEarned && badge.earnedAt && (
          <p className="text-xs text-muted-foreground">
            Conquistado em{" "}
            {new Date(badge.earnedAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {!isEarned && (
          <p className="text-xs text-muted-foreground/60 italic">
            Progresso: {badge.currentProgress}/{badge.criterionValue} ({badge.progressPercent}%)
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

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

  // [A1] Disparar trackBadgeUnlocked para badges recém-desbloqueados não notificados
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

  const earnedBadges = data?.badges.filter((b) => b.earned) ?? [];
  const unearnedBadges = data?.badges.filter((b) => !b.earned) ?? [];
  const timeline = data?.timeline ?? [];

  // Ordenar badges da plataforma por % de usuários (mais raro primeiro)
  const platformRanking = [...(data?.badges ?? [])].sort(
    (a, b) => a.platformPercent - b.platformPercent
  );

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

        {/* ── SEÇÃO 1: GRADE DE BADGES ── */}
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
                {Array.from({ length: 6 }).map((_, i) => (
                  <BadgeSkeleton key={i} />
                ))}
              </div>
            ) : data?.badges.length === 0 ? (
              <div className="text-center py-8">
                <Award className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  Nenhum badge disponível na plataforma ainda.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Conquistados */}
                {earnedBadges.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <Star className="h-3 w-3 text-brand fill-brand" />
                      Conquistados ({earnedBadges.length})
                    </p>
                    <div className="flex flex-wrap gap-6">
                      {earnedBadges.map((badge) => (
                        <BadgeHexagonFull key={badge.id} badge={badge} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Não conquistados */}
                {unearnedBadges.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs text-muted-foreground/60 uppercase tracking-wider font-medium flex items-center gap-1.5">
                      <Lock className="h-3 w-3" />
                      Em progresso ({unearnedBadges.length})
                    </p>
                    <div className="flex flex-wrap gap-6">
                      {unearnedBadges.map((badge) => (
                        <BadgeHexagonFull key={badge.id} badge={badge} />
                      ))}
                    </div>
                  </div>
                )}
                {/* Estado: nenhum conquistado */}
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
                  {timeline.map((badge, index) => (
                    <div key={badge.id} className="flex items-start gap-4 relative">
                      {/* Ponto na linha */}
                      <div
                        className={`relative z-10 w-12 h-12 flex-shrink-0 flex items-center justify-center rounded-2xl border-2 bg-gradient-to-br from-brand/20 to-brand/5 border-brand/40 shadow-[0_0_12px_rgba(var(--brand-rgb),0.2)]`}
                      >
                        {badge.iconUrl ? (
                          <img
                            src={badge.iconUrl}
                            alt={badge.name}
                            className="w-7 h-7 object-contain"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                              (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                            }}
                          />
                        ) : null}
                        <Award className={`h-6 w-6 text-brand ${badge.iconUrl ? "hidden" : ""}`} />
                      </div>
                      {/* Conteúdo */}
                      <div className="flex-1 min-w-0 pt-1">
                        <p className="font-semibold text-sm text-foreground">{badge.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                          {badge.description}
                        </p>
                        {badge.platformPercent > 0 && (
                          <p className="text-xs text-muted-foreground/50 mt-1">
                            {badge.platformPercent <= 10 ? "🏆 Raro — " : ""}
                            {badge.platformPercent}% dos usuários têm este badge
                          </p>
                        )}
                      </div>
                      {/* Data */}
                      {badge.earnedAt && (
                        <div className="text-right flex-shrink-0 pt-1">
                          <p className="text-xs text-muted-foreground tabular-nums">
                            {new Date(badge.earnedAt).toLocaleDateString("pt-BR", {
                              day: "2-digit",
                              month: "short",
                            })}
                          </p>
                          <p className="text-xs text-muted-foreground/50 tabular-nums">
                            {new Date(badge.earnedAt).getFullYear()}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* ── SEÇÃO 3: COMPARAÇÃO COM A PLATAFORMA ── */}
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-brand" />
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider">
              Raridade dos Badges
            </h2>
            {data && (
              <span className="text-xs text-muted-foreground">
                — base: {data.totalUsers} usuário{data.totalUsers !== 1 ? "s" : ""}
              </span>
            )}
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
                <p className="text-xs text-muted-foreground/60 mt-1">
                  As estatísticas serão exibidas conforme os usuários conquistam badges.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-muted-foreground/70 mb-4">
                  Ordenados do mais raro ao mais comum. Badges com 0% ainda não foram conquistados por ninguém.
                </p>
                {platformRanking.map((badge) => {
                  const isEarned = badge.earned;
                  const rarityLabel =
                    badge.platformPercent === 0
                      ? "Ninguém ainda"
                      : badge.platformPercent <= 5
                      ? "Lendário"
                      : badge.platformPercent <= 15
                      ? "Raro"
                      : badge.platformPercent <= 35
                      ? "Incomum"
                      : "Comum";
                  const rarityColor =
                    badge.platformPercent === 0
                      ? "text-muted-foreground/40"
                      : badge.platformPercent <= 5
                      ? "text-yellow-500"
                      : badge.platformPercent <= 15
                      ? "text-blue-400"
                      : badge.platformPercent <= 35
                      ? "text-green-400"
                      : "text-muted-foreground";

                  return (
                    <div key={badge.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          {/* Mini badge icon */}
                          <div
                            className={`w-6 h-6 flex-shrink-0 flex items-center justify-center rounded-lg border ${
                              isEarned
                                ? "bg-brand/20 border-brand/40"
                                : "bg-muted/30 border-border/30 grayscale opacity-50"
                            }`}
                          >
                            {badge.iconUrl ? (
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
                          <span className={`text-xs font-medium ${rarityColor}`}>
                            {rarityLabel}
                          </span>
                          <span className="text-xs text-muted-foreground tabular-nums">
                            {badge.platformPercent}%
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={badge.platformPercent}
                          className={`h-1.5 flex-1 ${isEarned ? "" : "opacity-40"}`}
                        />
                        <span className="text-[10px] text-muted-foreground/50 tabular-nums w-16 text-right">
                          {badge.holders} usuário{badge.holders !== 1 ? "s" : ""}
                        </span>
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
