/**
 * DashboardBadgeCarousel
 * Usa BadgeCard universal para visual consistente.
 * - Se há badges conquistados: mostra todos (conquistados primeiro, depois inativos)
 * - Se não há nenhum: mostra os primeiros 5 da plataforma como "inativos" com cadeado
 * Grid de 5 colunas com badges md — preenche o espaço do card uniformemente.
 * Barra de progresso reforça a gamificação.
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

  // Progresso: quantos badges conquistados do total
  const totalBadges = badges.length;
  const progressPercent = totalBadges > 0 ? Math.round((earned.length / totalBadges) * 100) : 0;

  return (
    <div className="bg-card border border-border/30 rounded-xl p-4 space-y-4">
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

      {/* Grid de 5 colunas — preenche uniformemente a largura do card */}
      <div className="grid grid-cols-5 gap-x-2 gap-y-1 justify-items-center">
        {paginated.map((badge) => (
          <div key={badge.id} className="flex flex-col items-center w-full">
            <BadgeCard badge={badge} size="md" />
          </div>
        ))}
        {/* Preenche slots vazios para manter o grid alinhado */}
        {paginated.length < PAGE_SIZE &&
          Array.from({ length: PAGE_SIZE - paginated.length }).map((_, i) => (
            <div key={`empty-${i}`} className="w-14 h-[88px]" />
          ))}
      </div>

      {/* Barra de progresso + rodapé */}
      <div className="space-y-2">
        {/* Barra de progresso — só exibe quando há badges conquistados */}
        {hasEarned && (
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground/60 tabular-nums">
                {earned.length} / {totalBadges} badges
              </span>
              <span className="text-[10px] text-primary/70 tabular-nums font-medium">
                {progressPercent}%
              </span>
            </div>
            <div className="h-1 w-full bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary/60 rounded-full transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Rodapé */}
        <div className="flex items-center justify-between">
          {hasEarned && unearned.length > 0 ? (
            <p className="text-xs text-muted-foreground/50">
              {unearned.length} ainda não conquistado{unearned.length !== 1 ? "s" : ""}
            </p>
          ) : !hasEarned ? (
            <p className="text-xs text-muted-foreground/50">
              {totalBadges} badge{totalBadges !== 1 ? "s" : ""} disponíve{totalBadges !== 1 ? "is" : "l"}
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
    </div>
  );
}
