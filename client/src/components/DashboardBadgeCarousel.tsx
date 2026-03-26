/**
 * DashboardBadgeCarousel
 * Usa BadgeCard universal para visual consistente.
 * - Se há badges conquistados: mostra todos (conquistados primeiro, depois inativos)
 * - Se não há nenhum: mostra os primeiros 5 da plataforma como "inativos" com cadeado
 * Carrossel de 5 em 5 com navegação por setas.
 */
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BadgeCard, type BadgeCardItem } from "./BadgeCard";

interface DashboardBadgeCarouselProps {
  badges: BadgeCardItem[];
  stats?: unknown;
  userId?: number;
}

const PAGE_SIZE = 5;

export default function DashboardBadgeCarousel({ badges }: DashboardBadgeCarouselProps) {
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

      {/* Grid de badges usando BadgeCard universal */}
      <div className="flex flex-wrap gap-3">
        {paginated.map((badge) => (
          <BadgeCard key={badge.id} badge={badge} size="sm" />
        ))}
      </div>

      {/* Rodapé */}
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
