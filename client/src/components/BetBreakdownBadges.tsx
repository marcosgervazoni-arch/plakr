import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface BetBreakdown {
  pointsExactScore?: number | null;
  pointsCorrectResult?: number | null;
  pointsTotalGoals?: number | null;
  pointsGoalDiff?: number | null;
  pointsOneTeamGoals?: number | null;
  pointsLandslide?: number | null;
  pointsZebra?: number | null;
  isZebra?: boolean | null;
  pointsEarned?: number | null;
}

interface BetBreakdownBadgesProps {
  bet: BetBreakdown;
  /** Se true, exibe apenas ícones sem labels (modo compacto) */
  compact?: boolean;
}

interface CriterionDef {
  key: keyof BetBreakdown;
  icon: string;
  label: string;
  color: string;
  bgColor: string;
}

const CRITERIA: CriterionDef[] = [
  {
    key: "pointsExactScore",
    icon: "🎯",
    label: "Placar Exato",
    color: "text-yellow-400",
    bgColor: "bg-yellow-500/15 border-yellow-500/30",
  },
  {
    key: "pointsCorrectResult",
    icon: "✅",
    label: "Resultado Correto",
    color: "text-green-400",
    bgColor: "bg-green-500/15 border-green-500/30",
  },
  {
    key: "pointsTotalGoals",
    icon: "⚽",
    label: "Total de Gols",
    color: "text-blue-400",
    bgColor: "bg-blue-500/15 border-blue-500/30",
  },
  {
    key: "pointsGoalDiff",
    icon: "📐",
    label: "Diferença de Gols",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/15 border-cyan-500/30",
  },
  {
    key: "pointsOneTeamGoals",
    icon: "🥅",
    label: "Gols de Um Time",
    color: "text-purple-400",
    bgColor: "bg-purple-500/15 border-purple-500/30",
  },
  {
    key: "pointsLandslide",
    icon: "💥",
    label: "Goleada",
    color: "text-primary",
    bgColor: "bg-primary/15 border-primary/30",
  },
  {
    key: "pointsZebra",
    icon: "🦓",
    label: "Zebra",
    color: "text-pink-400",
    bgColor: "bg-pink-500/15 border-pink-500/30",
  },
];

export default function BetBreakdownBadges({ bet, compact = false }: BetBreakdownBadgesProps) {
  const earned = CRITERIA.filter((c) => {
    const val = bet[c.key];
    return val !== null && val !== undefined && Number(val) > 0;
  });

  if (earned.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="flex flex-wrap gap-1 mt-1.5">
        {earned.map((c) => {
          const pts = Number(bet[c.key]);
          return (
            <Tooltip key={c.key}>
              <TooltipTrigger asChild>
                <span
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-xs font-medium cursor-default select-none ${c.bgColor} ${c.color}`}
                >
                  <span>{c.icon}</span>
                  {!compact && (
                    <span className="font-mono font-bold">+{pts}</span>
                  )}
                  {compact && (
                    <span className="font-mono font-bold text-[10px]">+{pts}</span>
                  )}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                <p className="font-semibold">{c.label}</p>
                <p className="text-muted-foreground">+{pts} ponto{pts !== 1 ? "s" : ""}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
