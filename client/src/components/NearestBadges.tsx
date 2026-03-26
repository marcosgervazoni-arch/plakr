/**
 * NearestBadges — Seção "Próximas Conquistas" do Dashboard.
 * Exibe os 3 badges não conquistados com maior % de progresso,
 * com barra de progresso, raridade e link para /conquistas.
 */
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { BadgeCard, type BadgeRarity } from "@/components/BadgeCard";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { ChevronRight, Trophy } from "lucide-react";

const RARITY_LABEL: Record<BadgeRarity, string> = {
  common:    "Comum",
  uncommon:  "Incomum",
  rare:      "Raro",
  epic:      "Épico",
  legendary: "Lendário",
};

const RARITY_BAR_COLOR: Record<BadgeRarity, string> = {
  common:    "bg-slate-400",
  uncommon:  "bg-green-400",
  rare:      "bg-blue-400",
  epic:      "bg-purple-400",
  legendary: "bg-amber-400",
};

const RARITY_TEXT: Record<BadgeRarity, string> = {
  common:    "text-slate-400",
  uncommon:  "text-green-400",
  rare:      "text-blue-400",
  epic:      "text-purple-400",
  legendary: "text-amber-400",
};

export function NearestBadges() {
  const { data: badges, isLoading } = trpc.badges.nearestBadges.useQuery();

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-20" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="w-14 h-14 rounded-2xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full rounded-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!badges || badges.length === 0) {
    return (
      <div className="rounded-2xl border border-border/50 bg-card/60 p-5">
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="h-4 w-4 text-brand" />
          <h3 className="font-semibold text-sm text-foreground">Próximas Conquistas</h3>
        </div>
        <div className="text-center py-6 space-y-2">
          <p className="text-2xl">🏆</p>
          <p className="text-sm text-muted-foreground">
            Você conquistou todos os badges disponíveis!
          </p>
          <Link href="/conquistas">
            <Button variant="outline" size="sm" className="mt-2">
              Ver conquistas
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/50 bg-card/60 p-5 space-y-4">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-brand" />
          <h3 className="font-semibold text-sm text-foreground">Próximas Conquistas</h3>
        </div>
        <Link href="/conquistas">
          <button className="flex items-center gap-0.5 text-xs text-muted-foreground hover:text-brand transition-colors">
            Ver todas
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </Link>
      </div>

      {/* Lista de badges */}
      <div className="space-y-4">
        {badges.map((badge) => {
          const rarity = (badge.rarity ?? "common") as BadgeRarity;
          const pct = badge.progressPercent ?? 0;
          const current = badge.currentProgress ?? 0;
          const target = badge.criterionValue ?? 0;

          return (
            <div key={badge.id} className="flex items-center gap-4 group">
              {/* Badge icon */}
              <div className="shrink-0">
                <BadgeCard badge={badge} size="md" />
              </div>

              {/* Info + barra */}
              <div className="flex-1 min-w-0 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground truncate">{badge.name}</p>
                  <span className={`text-[10px] font-semibold shrink-0 ${RARITY_TEXT[rarity]}`}>
                    {RARITY_LABEL[rarity]}
                  </span>
                </div>

                {/* Barra de progresso */}
                <div className="relative h-1.5 w-full rounded-full bg-muted/50 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${RARITY_BAR_COLOR[rarity]}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Progresso numérico + descrição */}
                <div className="flex items-center justify-between">
                  <p className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                    {badge.description}
                  </p>
                  <span className="text-[11px] text-muted-foreground shrink-0 font-mono">
                    {target > 0 ? `${current}/${target}` : `${pct}%`}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default NearestBadges;
