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
  /** Se true, exibe versão compacta (mesmo visual, tamanho reduzido) */
  compact?: boolean;
}

interface CriterionDef {
  key: keyof BetBreakdown;
  label: string;
  tooltip: string;
}

const CRITERIA: CriterionDef[] = [
  {
    key: "pointsExactScore",
    label: "Placar exato",
    tooltip: "Você acertou o placar exato da partida — a melhor pontuação possível.",
  },
  {
    key: "pointsCorrectResult",
    label: "Resultado correto",
    tooltip: "Você acertou o resultado (vitória, empate ou derrota), mesmo sem acertar o placar exato.",
  },
  {
    key: "pointsTotalGoals",
    label: "Total de gols",
    tooltip: "A soma dos gols do seu palpite é igual à soma dos gols reais da partida.",
  },
  {
    key: "pointsGoalDiff",
    label: "Diferença de gols",
    tooltip: "A diferença de gols entre os times no seu palpite é igual à diferença real da partida.",
  },
  {
    key: "pointsOneTeamGoals",
    label: "Gols de um time",
    tooltip: "Você acertou o número de gols de pelo menos um dos times da partida.",
  },
  {
    key: "pointsLandslide",
    label: "Goleada",
    tooltip: "Você previu uma goleada e o resultado real também foi uma goleada (diferença mínima configurada pelo organizador).",
  },
  {
    key: "pointsZebra",
    label: "Zebra",
    tooltip: "A maioria dos apostadores errou o resultado e você acertou — bônus de zebra!",
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
                  className={`inline-flex items-center px-2 py-0.5 rounded border cursor-default select-none font-mono font-bold bg-green-500/15 border-green-500/30 text-green-400 ${compact ? "text-[10px]" : "text-xs"}`}
                >
                  +{pts}
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-[200px] text-center">
                <p className="font-semibold text-xs">{c.label}</p>
                <p className="text-muted-foreground text-[11px] mt-0.5">{c.tooltip}</p>
                <p className="text-green-400 font-bold text-xs mt-1">+{pts} ponto{pts !== 1 ? "s" : ""}</p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
