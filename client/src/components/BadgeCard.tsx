/**
 * BadgeCard — Componente universal de exibição de badge.
 * Usado em TODAS as telas: PublicProfile, Dashboard, Conquistas, AdminBadges.
 * - Prioridade visual: emoji > iconUrl > genérico colorido por raridade
 * - Tooltip com nome, descrição, raridade e data de conquista
 * - Raridade define cor do anel e fundo
 */
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Lock, Star } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

export type BadgeRarity = "common" | "uncommon" | "rare" | "epic" | "legendary";

export interface BadgeCardItem {
  id: number;
  name: string;
  emoji?: string | null;
  category?: string | null;
  description: string;
  iconUrl?: string | null;
  criterionType?: string;
  criterionValue?: number;
  rarity?: BadgeRarity | null;
  isManual?: boolean;
  earned?: boolean;
  earnedAt?: string | Date | null;
  progressPercent?: number;
  currentProgress?: number;
}

// ─── Configuração visual por raridade ────────────────────────────────────────

const RARITY_CONFIG: Record<
  BadgeRarity,
  {
    label: string;
    ring: string;
    glow: string;
    bg: string;
    text: string;
    genBg: string;
    genText: string;
  }
> = {
  common: {
    label: "Comum",
    ring: "border-slate-400/50",
    glow: "",
    bg: "bg-gradient-to-br from-slate-500/20 to-slate-500/5",
    text: "text-slate-400",
    genBg: "bg-slate-500/20",
    genText: "text-slate-400",
  },
  uncommon: {
    label: "Incomum",
    ring: "border-green-400/60",
    glow: "shadow-[0_0_10px_rgba(74,222,128,0.2)]",
    bg: "bg-gradient-to-br from-green-500/20 to-green-500/5",
    text: "text-green-400",
    genBg: "bg-green-500/20",
    genText: "text-green-400",
  },
  rare: {
    label: "Raro",
    ring: "border-blue-400/60",
    glow: "shadow-[0_0_12px_rgba(96,165,250,0.25)]",
    bg: "bg-gradient-to-br from-blue-500/20 to-blue-500/5",
    text: "text-blue-400",
    genBg: "bg-blue-500/20",
    genText: "text-blue-400",
  },
  epic: {
    label: "Épico",
    ring: "border-purple-400/70",
    glow: "shadow-[0_0_14px_rgba(167,139,250,0.3)]",
    bg: "bg-gradient-to-br from-purple-500/20 to-purple-500/5",
    text: "text-purple-400",
    genBg: "bg-purple-500/20",
    genText: "text-purple-400",
  },
  legendary: {
    label: "Lendário",
    ring: "border-primary/80",
    glow: "shadow-[0_0_18px_rgba(255,184,0,0.4)]",
    bg: "bg-gradient-to-br from-primary/25 to-primary/5",
    text: "text-primary",
    genBg: "bg-primary/20",
    genText: "text-primary",
  },
};

const RARITY_BADGE_COLORS: Record<BadgeRarity, string> = {
  common:    "bg-slate-500/15 text-slate-400 border-slate-500/30",
  uncommon:  "bg-green-500/15 text-green-400 border-green-500/30",
  rare:      "bg-blue-500/15 text-blue-400 border-blue-500/30",
  epic:      "bg-purple-500/15 text-purple-400 border-purple-500/30",
  legendary: "bg-primary/15 text-primary border-primary/30",
};

// ─── Componente principal ─────────────────────────────────────────────────────

interface BadgeCardProps {
  badge: BadgeCardItem;
  /** Tamanho do container: sm (48px), md (56px), lg (64px) */
  size?: "sm" | "md" | "lg";
  /** Se true, mostra estrela de conquistado */
  showStar?: boolean;
}

export function BadgeCard({ badge, size = "md", showStar = false }: BadgeCardProps) {
  const isEarned = badge.earned ?? !!badge.earnedAt;
  const rarity = (badge.rarity ?? "common") as BadgeRarity;
  const rarityConfig = RARITY_CONFIG[rarity];
  const progress = badge.progressPercent ?? (isEarned ? 100 : 0);

  const sizeClasses = {
    sm: "w-12 h-12",
    md: "w-14 h-14",
    lg: "w-16 h-16",
  };
  const emojiSizes = { sm: "text-xl", md: "text-2xl", lg: "text-3xl" };
  const imgSizes = { sm: "w-6 h-6", md: "w-8 h-8", lg: "w-9 h-9" };
  const nameSizes = { sm: "text-[10px]", md: "text-[11px]", lg: "text-xs" };

  // Ícone genérico: emoji da raridade quando não há emoji nem iconUrl
  const RARITY_FALLBACK_EMOJI: Record<BadgeRarity, string> = {
    common: "🏅",
    uncommon: "🥉",
    rare: "🥈",
    epic: "🥇",
    legendary: "👑",
  };

  return (
    <TooltipPrimitive.Root>
      <TooltipTrigger asChild>
        <div
          className={`relative flex flex-col items-center gap-1 cursor-default transition-all duration-200 group w-full ${
            isEarned ? "opacity-100" : "opacity-30 grayscale"
          }`}
        >
          {/* Badge icon container */}
          <div
            className={`relative ${sizeClasses[size]} flex items-center justify-center rounded-2xl border-2 transition-all ${
              isEarned
                ? `${rarityConfig.bg} ${rarityConfig.ring} ${rarityConfig.glow} group-hover:scale-105`
                : "bg-muted/30 border-border/30"
            }`}
          >
            {/* Prioridade: emoji > iconUrl > genérico colorido por raridade */}
            {badge.emoji ? (
              <span className={`${emojiSizes[size]} leading-none select-none`}>{badge.emoji}</span>
            ) : badge.iconUrl ? (
              <img
                src={badge.iconUrl}
                alt={badge.name}
                className={`${imgSizes[size]} object-contain`}
                onError={(e) => {
                  const img = e.target as HTMLImageElement;
                  img.style.display = "none";
                  const fallback = img.nextElementSibling as HTMLElement;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}

            {/* Fallback genérico colorido por raridade (quando sem emoji e sem iconUrl) */}
            {!badge.emoji && (
              <span
                className={`${emojiSizes[size]} leading-none select-none ${badge.iconUrl ? "hidden" : ""}`}
                style={{ display: badge.iconUrl ? "none" : "inline" }}
              >
                {RARITY_FALLBACK_EMOJI[rarity]}
              </span>
            )}

            {/* Lock overlay para não conquistados */}
            {!isEarned && (
              <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-background border border-border flex items-center justify-center">
                <Lock className="h-2.5 w-2.5 text-muted-foreground" />
              </div>
            )}

            {/* Estrela de conquistado (opcional) */}
            {isEarned && showStar && (
              <div className={`absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center ${rarityConfig.genBg}`}>
                <Star className={`h-2.5 w-2.5 fill-current ${rarityConfig.genText}`} />
              </div>
            )}

            {/* Progress ring para parcialmente completo */}
            {!isEarned && progress > 0 && progress < 100 && (
              <svg
                className="absolute inset-0 w-full h-full -rotate-90"
                viewBox="0 0 56 56"
                fill="none"
              >
                <circle cx="28" cy="28" r="25" stroke="hsl(var(--brand))" strokeWidth="2" strokeOpacity="0.3" fill="none" />
                <circle
                  cx="28" cy="28" r="25"
                  stroke="hsl(var(--brand))" strokeWidth="2"
                  strokeDasharray={`${(progress / 100) * 157} 157`}
                  strokeLinecap="round" fill="none"
                />
              </svg>
            )}
          </div>

          {/* Nome do badge */}
          <span
            className={`font-medium text-center leading-tight line-clamp-2 w-full block ${nameSizes[size]} ${
              isEarned ? "text-foreground" : "text-muted-foreground/60"
            }`}
          >
            {badge.name}
          </span>
        </div>
      </TooltipTrigger>

      {/* Tooltip universal com descrição + raridade */}
      <TooltipContent side="top" className="max-w-[240px] text-center space-y-1.5 p-3">
        <p className="font-semibold text-sm">
          {badge.emoji ? `${badge.emoji} ` : ""}{badge.name}
        </p>

        {/* Raridade */}
        <span
          className={`inline-block text-[10px] px-2 py-0.5 rounded-full border font-semibold uppercase tracking-wide ${
            RARITY_BADGE_COLORS[rarity]
          }`}
        >
          {rarityConfig.label}
        </span>

        <p className="text-xs text-muted-foreground">{badge.description}</p>

        {badge.isManual ? (
          <p className="text-xs text-rose-400">Atribuição exclusiva pelo admin</p>
        ) : badge.criterionType === "early_user" ? (
          <p className="text-xs text-muted-foreground/70">
            Apenas para os primeiros {badge.criterionValue} usuários da plataforma
          </p>
        ) : badge.criterionType && badge.criterionValue !== undefined ? (
          <p className="text-xs text-muted-foreground/70">
            Meta: {badge.criterionType.replace(/_/g, " ")} ≥ {badge.criterionValue}
          </p>
        ) : null}

        {isEarned && badge.earnedAt ? (
          <p className="text-xs text-muted-foreground">
            Conquistado em{"\ "}
            {format(new Date(badge.earnedAt), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        ) : !isEarned && badge.criterionType === "early_user" ? (
          <p className="text-xs text-muted-foreground/50 italic">Não elegível</p>
        ) : !isEarned && progress > 0 ? (
          <p className="text-xs text-muted-foreground/70">
            Progresso: {progress}%
            {badge.currentProgress !== undefined && badge.criterionValue && badge.criterionValue > 0
              ? ` (${badge.currentProgress}/${badge.criterionValue})`
              : ""}
          </p>
        ) : !isEarned ? (
          <p className="text-xs text-muted-foreground/50 italic">Ainda não conquistado</p>
        ) : null}
      </TooltipContent>
    </TooltipPrimitive.Root>
  );
}

export default BadgeCard;
