/**
 * BadgeGrid — Grade de badges agrupados por categoria.
 * Usa BadgeCard universal para visual consistente em todas as telas.
 */
import { BadgeCard, type BadgeCardItem } from "./BadgeCard";

// Re-export para compatibilidade com imports existentes
export type { BadgeCardItem as BadgeItem };

interface BadgeGridProps {
  badges: BadgeCardItem[];
  /** Se true, exibe todos os badges agrupados por categoria */
  showAll?: boolean;
  /** Se true, exibe em linha compacta sem agrupamento */
  compact?: boolean;
  size?: "sm" | "md" | "lg";
  showStar?: boolean;
}

const CATEGORY_LABELS: Record<string, string> = {
  precisao:    "🎯 Precisão",
  ranking:     "🏆 Ranking",
  zebra:       "🦓 Zebra",
  comunidade:  "🌱 Comunidade",
  publicidade: "📢 Publicidade",
  exclusivo:   "🎖️ Exclusivo",
};

const CATEGORY_ORDER = ["precisao", "ranking", "zebra", "comunidade", "publicidade", "exclusivo"];

export default function BadgeGrid({
  badges,
  showAll = false,
  compact = false,
  size = "md",
  showStar = false,
}: BadgeGridProps) {
  if (!badges || badges.length === 0) return null;

  const earned = badges.filter((b) => b.earned ?? !!b.earnedAt);
  const unearned = badges.filter((b) => !(b.earned ?? !!b.earnedAt));

  // Modo compacto: linha horizontal simples
  if (compact) {
    const sorted = [...earned, ...unearned.slice(0, Math.max(0, 8 - earned.length))];
    return (
      <div className="flex flex-wrap gap-3">
        {sorted.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} size={size} showStar={showStar} />
        ))}
      </div>
    );
  }

  // Modo showAll: agrupado por categoria
  if (showAll) {
    const byCategory = badges.reduce<Record<string, BadgeCardItem[]>>((acc, b) => {
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
                  <BadgeCard key={badge.id} badge={badge} size={size} showStar={showStar} />
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
          <BadgeCard key={badge.id} badge={badge} size={size} showStar={showStar} />
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
