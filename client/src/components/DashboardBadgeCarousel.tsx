/**
 * DashboardBadgeCarousel
 * Exibe badges do usuário no Dashboard em dois modos:
 *   - "Conquistados": carrossel paginado (5 por vez) dos badges já ganhos
 *   - "Próximos": lista dos badges mais próximos de serem conquistados, com barra de progresso
 */
import { useState } from "react";
import { Award, ChevronLeft, ChevronRight, Lock, Trophy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface BadgeItem {
  id: number;
  name: string;
  description: string;
  iconUrl?: string | null;
  criterionType: string;
  criterionValue: number;
  earned: boolean;
  earnedAt: Date | null;
}

interface UserStats {
  exactScores: number;
  zebraCount?: number;
  landslideCount?: number;
  totalBets?: number;
  poolsCount?: number;
  correctResults?: number;
}

interface DashboardBadgeCarouselProps {
  badges: BadgeItem[];
  stats?: UserStats | null;
  userId?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CRITERION_LABELS: Record<string, string> = {
  accuracy_rate: "Taxa de acerto",
  exact_score_career: "Placares exatos",
  zebra_correct: "Zebras acertadas",
  top3_pools: "Top 3 em bolões",
  first_place_pools: "1º lugar em bolões",
  complete_pool_no_blank: "Bolões sem branco",
  consecutive_correct: "Acertos consecutivos",
};

function getUserProgress(criterionType: string, stats: UserStats): number {
  switch (criterionType) {
    case "exact_score_career":
      return stats.exactScores ?? 0;
    case "zebra_correct":
      return stats.zebraCount ?? 0;
    case "top3_pools":
    case "first_place_pools":
      return stats.poolsCount ?? 0;
    case "complete_pool_no_blank":
      return stats.poolsCount ?? 0;
    case "consecutive_correct":
      return stats.correctResults ?? 0;
    case "accuracy_rate": {
      const tb = Math.max(stats.totalBets ?? 0, 1);
      return Math.round(((stats.correctResults ?? 0) / tb) * 100);
    }
    default:
      return 0;
  }
}

const PAGE_SIZE = 5;

// ─── Sub-componente: Badge hexagonal compacto ─────────────────────────────────

function BadgeHex({ badge }: { badge: BadgeItem }) {
  const isEarned = badge.earned;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={`relative flex flex-col items-center gap-1.5 cursor-default select-none transition-all duration-200 ${
            isEarned ? "opacity-100" : "opacity-30 grayscale"
          }`}
        >
          <div
            className={`relative w-12 h-12 flex items-center justify-center rounded-xl border-2 transition-all ${
              isEarned
                ? "bg-gradient-to-br from-primary/20 to-primary/5 border-primary/40 shadow-[0_0_10px_rgba(var(--brand-rgb),0.15)]"
                : "bg-muted/30 border-border/30"
            }`}
          >
            {badge.iconUrl ? (
              <img
                src={badge.iconUrl}
                alt={badge.name}
                className="w-7 h-7 object-contain"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <Award
                className={`h-6 w-6 ${isEarned ? "text-primary" : "text-muted-foreground/50"}`}
              />
            )}
            {!isEarned && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="h-2 w-2 text-muted-foreground" />
              </div>
            )}
          </div>
          <span
            className={`text-[10px] font-medium text-center leading-tight max-w-[48px] truncate ${
              isEarned ? "text-foreground" : "text-muted-foreground/50"
            }`}
          >
            {badge.name}
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[180px] text-center">
        <p className="font-semibold text-sm">{badge.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{badge.description}</p>
        {isEarned && badge.earnedAt && (
          <p className="text-xs text-primary/80 mt-1">
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

// ─── Sub-componente: Badge próximo com progresso ──────────────────────────────

function NextBadgeRow({ badge, stats }: { badge: BadgeItem; stats: UserStats }) {
  const current = getUserProgress(badge.criterionType, stats);
  const target = badge.criterionValue;
  const pct = Math.min(100, Math.round((current / Math.max(target, 1)) * 100));
  const label = CRITERION_LABELS[badge.criterionType] ?? badge.criterionType;

  return (
    <div className="flex items-center gap-3 py-2">
      {/* Ícone */}
      <div className="w-9 h-9 rounded-lg bg-muted/30 border border-border/30 flex items-center justify-center shrink-0">
        {badge.iconUrl ? (
          <img src={badge.iconUrl} alt={badge.name} className="w-5 h-5 object-contain opacity-50" />
        ) : (
          <Award className="h-5 w-5 text-muted-foreground/50" />
        )}
      </div>
      {/* Info + barra */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs font-medium text-foreground truncate">{badge.name}</span>
          <span className="text-[10px] text-muted-foreground ml-2 shrink-0">
            {current}/{target} {label.split(" ")[0].toLowerCase()}
          </span>
        </div>
        <div className="h-1.5 bg-muted/40 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      {/* % */}
      <span className="text-[10px] font-mono text-primary/70 shrink-0 w-8 text-right">{pct}%</span>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function DashboardBadgeCarousel({
  badges,
  stats,
  userId,
}: DashboardBadgeCarouselProps) {
  const [tab, setTab] = useState<"earned" | "next">("earned");
  const [page, setPage] = useState(0);

  const earned = badges.filter((b) => b.earned);
  const unearned = badges.filter((b) => !b.earned);

  // Ordenar próximos por % de progresso decrescente
  const nextBadges = stats
    ? [...unearned].sort((a, b) => {
        const pa = getUserProgress(a.criterionType, stats) / Math.max(a.criterionValue, 1);
        const pb = getUserProgress(b.criterionType, stats) / Math.max(b.criterionValue, 1);
        return pb - pa;
      })
    : unearned;

  // Paginação dos conquistados
  const totalPages = Math.ceil(earned.length / PAGE_SIZE);
  const pageSlice = earned.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  // Nada para mostrar
  if (badges.length === 0) return null;

  return (
    <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
      {/* Header com abas */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted/30 rounded-lg p-0.5">
          <button
            onClick={() => { setTab("earned"); setPage(0); }}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
              tab === "earned"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Conquistados
            {earned.length > 0 && (
              <span className="ml-1.5 bg-primary/20 text-primary text-[10px] rounded-full px-1.5 py-0.5">
                {earned.length}
              </span>
            )}
          </button>
          <button
            onClick={() => { setTab("next"); setPage(0); }}
            className={`text-xs px-3 py-1 rounded-md font-medium transition-all ${
              tab === "next"
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Próximos
            {unearned.length > 0 && (
              <span className="ml-1.5 bg-muted text-muted-foreground text-[10px] rounded-full px-1.5 py-0.5">
                {unearned.length}
              </span>
            )}
          </button>
        </div>
        {userId && (
          <Link href={`/profile/${userId}`}>
            <span className="text-[10px] text-primary hover:underline cursor-pointer">ver todos →</span>
          </Link>
        )}
      </div>

      {/* Aba: Conquistados */}
      {tab === "earned" && (
        <>
          {earned.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Trophy className="w-8 h-8 text-muted-foreground/30" />
              <p className="text-xs text-muted-foreground">Nenhum badge conquistado ainda.</p>
              <p className="text-[10px] text-muted-foreground/60">Continue apostando para desbloquear conquistas!</p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                {/* Badges da página atual */}
                <div className="flex gap-3 flex-wrap">
                  {pageSlice.map((b) => (
                    <BadgeHex key={b.id} badge={b} />
                  ))}
                </div>
              </div>
              {/* Paginação */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={page === 0}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="w-3 h-3 mr-1" /> Anterior
                  </Button>
                  <span className="text-[10px] text-muted-foreground">
                    {page + 1} / {totalPages}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs"
                    disabled={page >= totalPages - 1}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Próxima <ChevronRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Aba: Próximos */}
      {tab === "next" && (
        <>
          {nextBadges.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-4 text-center">
              <Award className="w-8 h-8 text-primary/40" />
              <p className="text-xs text-muted-foreground">Você conquistou todos os badges!</p>
            </div>
          ) : (
            <div className="divide-y divide-border/20">
              {nextBadges.slice(0, 5).map((b) => (
                <NextBadgeRow key={b.id} badge={b} stats={stats ?? { exactScores: 0 }} />
              ))}
              {nextBadges.length > 5 && (
                <p className="text-[10px] text-muted-foreground/50 pt-2 text-center">
                  +{nextBadges.length - 5} badges restantes
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
