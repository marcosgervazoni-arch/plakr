import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Lock } from "lucide-react";

interface BadgeItem {
  id: number;
  name: string;
  description: string;
  iconUrl: string | null;
  criterionType: string;
  criterionValue: number;
  earnedAt?: string | Date | null;
}

interface BadgeGridProps {
  badges: BadgeItem[];
  /** If true, show a compact row instead of a full grid */
  compact?: boolean;
}

const CRITERION_LABELS: Record<string, string> = {
  accuracy_rate: "Taxa de acerto",
  exact_score_career: "Placares exatos",
  zebra_correct: "Zebras acertadas",
  top3_pools: "Top 3 em bolões",
  first_place_pools: "1º lugar em bolões",
  complete_pool_no_blank: "Bolões sem branco",
  consecutive_correct: "Acertos consecutivos",
};

const CRITERION_UNIT: Record<string, string> = {
  accuracy_rate: "%",
  exact_score_career: "",
  zebra_correct: "",
  top3_pools: "",
  first_place_pools: "",
  complete_pool_no_blank: "",
  consecutive_correct: "",
};

function BadgeHexagon({ badge }: { badge: BadgeItem }) {
  const isEarned = !!badge.earnedAt;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex flex-col items-center gap-1.5 cursor-default transition-all duration-200 ${
            isEarned ? "opacity-100" : "opacity-25 grayscale"
          }`}
        >
          {/* Hexagon container */}
          <div
            className={`relative w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${
              isEarned
                ? "bg-gradient-to-br from-brand/20 to-brand/5 border-brand/40 shadow-[0_0_12px_rgba(var(--brand-rgb),0.2)]"
                : "bg-muted/30 border-border/30"
            }`}
          >
            {badge.iconUrl ? (
              <img
                src={badge.iconUrl}
                alt={badge.name}
                className="w-8 h-8 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <Award
              className={`h-7 w-7 ${badge.iconUrl ? "hidden" : ""} ${
                isEarned ? "text-brand" : "text-muted-foreground/50"
              }`}
            />
            {/* Lock overlay for unearned */}
            {!isEarned && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Badge name */}
          <span
            className={`text-xs font-medium text-center leading-tight max-w-[56px] truncate ${
              isEarned ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {badge.name}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[200px] text-center">
        <p className="font-semibold text-sm">{badge.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
        <p className="text-xs mt-1 text-brand/80">
          {CRITERION_LABELS[badge.criterionType] ?? badge.criterionType} ≥ {badge.criterionValue}
          {CRITERION_UNIT[badge.criterionType] ? CRITERION_UNIT[badge.criterionType] : ""}
        </p>
        {isEarned && badge.earnedAt && (
          <p className="text-xs text-muted-foreground mt-1">
            Conquistado em{" "}
            {new Date(badge.earnedAt).toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        )}
        {!isEarned && (
          <p className="text-xs text-muted-foreground/60 mt-1 italic">Ainda não conquistado</p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export default function BadgeGrid({ badges, compact = false }: BadgeGridProps) {
  if (badges.length === 0) return null;

  const earned = badges.filter((b) => b.earnedAt);
  const unearned = badges.filter((b) => !b.earnedAt);
  // Show earned first, then unearned
  const sorted = [...earned, ...unearned];

  if (compact) {
    return (
      <div className="flex flex-wrap gap-3">
        {sorted.map((badge) => (
          <BadgeHexagon key={badge.id} badge={badge} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {earned.length > 0 && (
        <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
          {earned.length} badge{earned.length !== 1 ? "s" : ""} conquistado{earned.length !== 1 ? "s" : ""}
        </p>
      )}
      <div className="flex flex-wrap gap-4">
        {sorted.map((badge) => (
          <BadgeHexagon key={badge.id} badge={badge} />
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
