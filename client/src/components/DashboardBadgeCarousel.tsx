/**
 * DashboardBadgeCarousel
 * Visual idêntico ao BadgeGrid do PublicProfile.
 * - Se há badges conquistados: mostra todos (conquistados primeiro, depois inativos)
 * - Se não há nenhum: mostra os primeiros 5 da plataforma como "inativos" com cadeado
 * Carrossel de 5 em 5 com navegação por setas.
 */
import { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Award, Lock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface BadgeItem {
  id: number;
  name: string;
  emoji?: string | null;
  category?: string | null;
  description: string;
  iconUrl?: string | null;
  criterionType: string;
  criterionValue: number;
  isManual?: boolean;
  earnedAt?: string | Date | null;
  earned?: boolean;
  progressPercent?: number;
  currentProgress?: number;
}

interface DashboardBadgeCarouselProps {
  badges: BadgeItem[];
  stats?: any;
  userId?: number;
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
};

const PAGE_SIZE = 5;

function BadgeHexagon({ badge }: { badge: BadgeItem }) {
  const isEarned = badge.earned ?? !!badge.earnedAt;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex flex-col items-center gap-1.5 cursor-default transition-all duration-200 ${
            isEarned ? "opacity-100" : "opacity-25 grayscale"
          }`}
        >
          {/* Badge icon container — mesmo estilo do BadgeGrid */}
          <div
            className={`relative w-14 h-14 flex items-center justify-center rounded-2xl border-2 transition-all ${
              isEarned
                ? "bg-gradient-to-br from-brand/20 to-brand/5 border-brand/40 shadow-[0_0_12px_rgba(var(--brand-rgb),0.2)]"
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
                className={`h-7 w-7 ${
                  isEarned ? "text-brand" : "text-muted-foreground/50"
                }`}
              />
            )}
            {/* Lock overlay para não conquistados */}
            {!isEarned && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}
          </div>

          {/* Nome do badge */}
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
        {badge.isManual ? (
          <p className="text-xs mt-1 text-rose-400">Atribuição especial pelo admin</p>
        ) : (
          <p className="text-xs mt-1 text-brand/80">
            {CRITERION_LABELS[badge.criterionType] ?? badge.criterionType.replace(/_/g, " ")} ≥ {badge.criterionValue}
            {CRITERION_UNIT[badge.criterionType] ?? ""}
          </p>
        )}
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

export default function DashboardBadgeCarousel({ badges, stats }: DashboardBadgeCarouselProps) {
  const [page, setPage] = useState(0);

  if (!badges || badges.length === 0) return null;

  const earned = badges.filter((b) => b.earned ?? !!b.earnedAt);
  const unearned = badges.filter((b) => !(b.earned ?? !!b.earnedAt));
  const hasEarned = earned.length > 0;

  // Ordenação: conquistados primeiro, depois não conquistados
  const sorted = [...earned, ...unearned];

  // Se não tem nenhum conquistado, mostra apenas os primeiros 5 como inativos
  const displayBadges = hasEarned ? sorted : unearned.slice(0, PAGE_SIZE);

  const totalPages = hasEarned ? Math.ceil(sorted.length / PAGE_SIZE) : 1;
  const paginated = hasEarned
    ? sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)
    : displayBadges;

  return (
    <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">
            Conquistas
          </p>
          {hasEarned ? (
            <p className="text-xs text-muted-foreground mt-0.5">
              {earned.length} badge{earned.length !== 1 ? "s" : ""} conquistado{earned.length !== 1 ? "s" : ""}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground/60 mt-0.5 italic">
              Nenhum badge conquistado ainda
            </p>
          )}
        </div>
        {/* Navegação — só aparece quando há mais de uma página */}
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="text-xs text-muted-foreground tabular-nums">
              {page + 1}/{totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
      </div>

      {/* Grid de badges — mesmo layout do BadgeGrid */}
      <div className="flex flex-wrap gap-3">
        {paginated.map((badge) => (
          <BadgeHexagon key={badge.id} badge={badge} />
        ))}
      </div>

      {/* Rodapé: link para página completa + contador */}
      <div className="flex items-center justify-between">
        {hasEarned && unearned.length > 0 ? (
          <p className="text-xs text-muted-foreground/50">
            {unearned.length} badge{unearned.length !== 1 ? "s" : ""} ainda não conquistado{unearned.length !== 1 ? "s" : ""}
          </p>
        ) : (
          <span />
        )}
        <Link href="/conquistas">
          <span className="text-xs text-primary hover:underline cursor-pointer">
            Ver todas →
          </span>
        </Link>
      </div>
    </div>
  );
}
