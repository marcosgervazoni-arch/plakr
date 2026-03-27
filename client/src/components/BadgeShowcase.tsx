/**
 * BadgeShowcase — Vitrine de conquistas para a landing page
 * Exibe até 6 badges curados com tooltip de raridade e descrição.
 * Badges com iconUrl mostram o ícone; sem iconUrl mostram o emoji.
 * Todos aparecem "desbloqueados" na vitrine (sem blur) para criar desejo.
 */
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";
import { Trophy } from "lucide-react";

const RARITY_LABEL: Record<string, string> = {
  common: "Comum",
  uncommon: "Incomum",
  rare: "Raro",
  epic: "Épico",
  legendary: "Lendário",
};

const RARITY_COLOR: Record<string, string> = {
  common: "text-zinc-400 border-zinc-700",
  uncommon: "text-green-400 border-green-700",
  rare: "text-blue-400 border-blue-700",
  epic: "text-purple-400 border-purple-700",
  legendary: "text-yellow-400 border-yellow-500",
};

const RARITY_GLOW: Record<string, string> = {
  common: "",
  uncommon: "shadow-[0_0_12px_rgba(74,222,128,0.25)]",
  rare: "shadow-[0_0_12px_rgba(96,165,250,0.3)]",
  epic: "shadow-[0_0_16px_rgba(192,132,252,0.4)]",
  legendary: "shadow-[0_0_20px_rgba(250,204,21,0.5)]",
};

const RARITY_BG: Record<string, string> = {
  common: "bg-zinc-900/80",
  uncommon: "bg-green-950/60",
  rare: "bg-blue-950/60",
  epic: "bg-purple-950/60",
  legendary: "bg-yellow-950/60",
};

export default function BadgeShowcase() {
  const { data: badges, isLoading } = trpc.badges.getShowcase.useQuery();

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-36 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {badges.map((badge) => {
          const rarity = badge.rarity ?? "common";
          const colorClass = RARITY_COLOR[rarity] ?? RARITY_COLOR.common;
          const glowClass = RARITY_GLOW[rarity] ?? "";
          const bgClass = RARITY_BG[rarity] ?? RARITY_BG.common;

          return (
            <Tooltip key={badge.id}>
              <TooltipTrigger asChild>
                <div
                  className={`
                    relative flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border
                    cursor-default select-none transition-all duration-300
                    hover:scale-105 hover:brightness-110
                    ${bgClass} ${colorClass} ${glowClass}
                  `}
                >
                  {/* Ícone ou emoji */}
                  <div className="w-14 h-14 flex items-center justify-center">
                    {badge.iconUrl ? (
                      <img
                        src={badge.iconUrl}
                        alt={badge.name}
                        className="w-12 h-12 object-contain"
                      />
                    ) : (
                      <span className="text-4xl leading-none">{badge.emoji ?? "🏆"}</span>
                    )}
                  </div>

                  {/* Nome */}
                  <p className="text-xs font-semibold text-center leading-tight line-clamp-2 text-white/90">
                    {badge.name}
                  </p>

                  {/* Raridade */}
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${colorClass.split(" ")[0]}`}>
                    {RARITY_LABEL[rarity] ?? rarity}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[220px] text-center bg-zinc-900 border-zinc-700 text-white"
              >
                <p className="font-semibold text-sm mb-1">{badge.name}</p>
                {badge.description && (
                  <p className="text-xs text-zinc-300 italic">"{badge.description}"</p>
                )}
                <p className={`text-xs font-bold mt-1 ${colorClass.split(" ")[0]}`}>
                  {RARITY_LABEL[rarity] ?? rarity}
                </p>
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>

      {/* CTA */}
      <div className="mt-8 text-center">
        <Link href="/register">
          <button className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-yellow-400 hover:bg-yellow-300 text-black font-bold text-sm transition-all duration-200 hover:scale-105 shadow-lg shadow-yellow-400/20">
            <Trophy className="w-4 h-4" />
            Conquiste os seus → Criar bolão grátis
          </button>
        </Link>
      </div>
    </TooltipProvider>
  );
}
