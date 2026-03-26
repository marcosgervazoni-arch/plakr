/**
 * BadgeGrid — Exibe badges agrupados por categoria com suporte a emoji e progresso.
 */
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Lock } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export interface BadgeItem {
  id: number;
  name: string;
  emoji?: string | null;
  category?: string | null;
  description: string;
  iconUrl?: string | null;
  criterionType: string;
  criterionValue: number;
  isManual?: boolean;
  earned?: boolean;
  earnedAt?: string | Date | null;
  progressPercent?: number;
  currentProgress?: number;
}

interface BadgeGridProps {
  badges: BadgeItem[];
  /** Se true, exibe todos os badges (ganhos e não ganhos) agrupados por categoria */
  showAll?: boolean;
  /** Se true, exibe em linha compacta sem agrupamento */
  compact?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  precisao:   "🎯 Precisão",
  ranking:    "🏆 Ranking",
  zebra:      "🦓 Zebra",
  comunidade: "🌱 Comunidade",
  exclusivo:  "🎖️ Exclusivo",
};

const CATEGORY_ORDER = ["precisao", "ranking", "zebra", "comunidade", "exclusivo"];

function BadgeCard({ badge }: { badge: BadgeItem }) {
  const isEarned = badge.earned ?? !!badge.earnedAt;
  const progress = badge.progressPercent ?? (isEarned ? 100 : 0);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex flex-col items-center gap-1.5 cursor-default transition-all duration-200 group ${
            isEarned ? "opacity-100" : "opacity-30 grayscale"
          }`}
        >
          {/* Badge icon container */}
          <div
            className={`relative w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${
              isEarned
                ? "bg-gradient-to-br from-brand/20 to-brand/5 border-brand/40 shadow-[0_0_12px_rgba(var(--brand-rgb),0.2)] group-hover:shadow-[0_0_18px_rgba(var(--brand-rgb),0.35)]"
                : "bg-muted/30 border-border/30"
            }`}
          >
            {badge.emoji ? (
              <span className="text-2xl leading-none select-none">{badge.emoji}</span>
            ) : badge.iconUrl ? (
              <img
                src={badge.iconUrl}
                alt={badge.name}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Award
                className={`h-7 w-7 ${isEarned ? "text-brand" : "text-muted-foreground/50"}`}
              />
            )}

            {/* Lock overlay for unearned */}
            {!isEarned && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}

            {/* Progress ring for partially completed (only show if progress > 0 and < 100) */}
            {!isEarned && progress > 0 && progress < 100 && (
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 56 56"
                fill="none"
              >
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  stroke="hsl(var(--brand))"
                  strokeWidth="2"
                  strokeOpacity="0.3"
                  fill="none"
                />
                <circle
                  cx="28"
                  cy="28"
                  r="25"
                  stroke="hsl(var(--brand))"
                  strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 157} 157`}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
            )}
          </div>

          {/* Badge name */}
          <span
            className={`text-[11px] font-medium text-center leading-tight max-w-[60px] line-clamp-2 ${
              isEarned ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {badge.name}
          </span>
        </div>
      </TooltipTrigger>

      <TooltipContent side="top" className="max-w-[220px] text-center space-y-1">
        <p className="font-semibold text-sm">
          {badge.emoji ? `${badge.emoji} ` : ""}{badge.name}
        </p>
        <p className="text-xs text-muted-foreground">{badge.description}</p>
        {badge.isManual ? (
          <p className="text-xs text-rose-400 mt-1">Atribuição exclusiva pelo admin</p>
        ) : (
          <p className="text-xs text-brand/80 mt-1">
            Critério: {badge.criterionType.replace(/_/g, " ")} ≥ {badge.criterionValue}
          </p>
        )}
        {isEarned && badge.earnedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Conquistado em{" "}
            {format(new Date(badge.earnedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        )}
        {!isEarned && progress > 0 && (
          <p className="text-xs text-muted-foreground/70 mt-1">
            Progresso: {progress}%
            {badge.currentProgress !== undefined && badge.criterionValue > 0
              ? ` (${badge.currentProgress}/${badge.criterionValue})`
              : ""}
          </p>
        )}
        {!isEarned && progress === 0 && (
          <p className="text-xs text-muted-foreground/50 mt-1 italic">Ainda não conquistado</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function BadgeGrid({ badges, showAll = false, compact = false }: BadgeGridProps) {
  if (badges.length === 0) return null;

  const earned = badges.filter((b) => b.earned ?? !!b.earnedAt);
  const unearned = badges.filter((b) => !(b.earned ?? !!b.earnedAt));

  // Modo compacto: linha horizontal simples
  if (compact) {
    const sorted = [...earned, ...unearned.slice(0, Math.max(0, 8 - earned.length))];
    return (
      <div className="flex flex-wrap gap-3">
        {sorted.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
    );
  }

  // Modo showAll: agrupado por categoria (para página /conquistas)
  if (showAll) {
    const byCategory = badges.reduce<Record<string, BadgeItem[]>>((acc, b) => {
      const cat = b.category ?? "outros";
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(b);
      return acc;
    }, {});

    const orderedCategories = [
      ...CATEGORY_ORDER.filter((c) => byCategory[c]),
      ...Object.keys(byCategory).filter((c) => !CATEGORY_ORDER.includes(c)),
    ];

    return (
      <div className="space-y-8">
        {orderedCategories.map((cat) => {
          const catBadges = byCategory[cat];
          if (!catBadges || catBadges.length === 0) return null;
          const catEarned = catBadges.filter((b) => b.earned ?? !!b.earnedAt).length;
          return (
            <div key={cat}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                  {CATEGORY_LABELS[cat] ?? cat}
                </h3>
                <span className="text-xs text-muted-foreground">
                  {catEarned}/{catBadges.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-4">
                {catBadges.map((badge) => (
                  <BadgeCard key={badge.id} badge={badge} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  // Modo padrão: earned em destaque, unearned em cinza
  const sorted = [...earned, ...unearned];

  return (
    <div className="space-y-3">
      {earned.length > 0 && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {earned.length} badge{earned.length !== 1 ? "s" : ""} conquistado{earned.length !== 1 ? "s" : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        {sorted.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} />
        ))}
      </div>
      {unearned.length > 0 && earned.length > 0 && (
        <p className="text-xs text-muted-foreground/50 mt-1">
          {unearned.length} badge{unearned.length !== 1 ? "s" : ""} ainda não conquistado{unearned.length !== 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
