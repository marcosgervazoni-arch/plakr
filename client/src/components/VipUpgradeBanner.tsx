/**
 * VipUpgradeBanner — CTA contextual do VIP
 *
 * Exibido em dois contextos:
 *  1. Análise de IA pré-jogo bloqueada (limite diário atingido)
 *  2. Duelos X1 bloqueados (limite de 5 ativos atingido)
 *
 * Ao clicar, inicia o checkout do VIP via Stripe.
 * O checkout redireciona de volta para o bolão de origem após conclusão.
 */
import { useState } from "react";
import { Sparkles, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type VipBannerVariant = "ai" | "x1" | "ads";

interface VipUpgradeBannerProps {
  variant: VipBannerVariant;
  poolSlug?: string;
  /** Se true, renderiza inline (dentro do card). Se false, renderiza como bottom-sheet */
  inline?: boolean;
  onDismiss?: () => void;
}

const VARIANT_CONFIG: Record<VipBannerVariant, {
  icon: React.ReactNode;
  title: string;
  description: string;
  cta: string;
}> = {
  ai: {
    icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
    title: "Limite de análises atingido",
    description: "Você usou suas 3 análises de IA de hoje. Com o VIP, análises ilimitadas todo dia.",
    cta: "Ativar VIP · R$4,90/mês",
  },
  x1: {
    icon: <Zap className="w-4 h-4 text-yellow-400" />,
    title: "Limite de Duelos atingido",
    description: "Você atingiu o limite de 5 duelos ativos no Free. Com o VIP, duelos ilimitados.",
    cta: "Ativar VIP · R$4,90/mês",
  },
  ads: {
    icon: <Sparkles className="w-4 h-4 text-yellow-400" />,
    title: "Experiência sem anúncios",
    description: "Assine o VIP e navegue sem nenhum anúncio em todos os bolões.",
    cta: "Ativar VIP · R$4,90/mês",
  },
};

export function VipUpgradeBanner({
  variant,
  poolSlug,
  inline = true,
  onDismiss,
}: VipUpgradeBannerProps) {
  const [loading, setLoading] = useState(false);
  const createVipCheckout = trpc.stripe.createVipCheckout.useMutation();
  const { data: pricing } = trpc.platform.getPublicPricing.useQuery();
  const vipPrice = pricing?.vipMonthlyPrice
    ? `R$${(pricing.vipMonthlyPrice / 100).toFixed(2).replace('.', ',')}/mês`
    : "R$4,90/mês";
  const config = {
    ...VARIANT_CONFIG[variant],
    cta: VARIANT_CONFIG[variant].cta.replace("R$4,90/mês", vipPrice),
  };

  const handleActivate = async () => {
    setLoading(true);
    try {
      const result = await createVipCheckout.mutateAsync({
        origin: window.location.origin,
        poolSlug,
      });
      if (result.checkoutUrl) {
        toast.info("Redirecionando para o checkout...");
        window.open(result.checkoutUrl, "_blank");
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Tente novamente.";
      toast.error("Erro ao iniciar checkout", { description: message });
    } finally {
      setLoading(false);
    }
  };

  if (inline) {
    return (
      <div className="relative bg-gradient-to-r from-yellow-500/10 via-amber-500/10 to-yellow-500/10 border border-yellow-500/25 rounded-xl p-3 space-y-2">
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="absolute top-2 right-2 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
        <div className="flex items-center gap-1.5">
          {config.icon}
          <p className="text-xs font-semibold text-yellow-400">{config.title}</p>
        </div>
        <p className="text-[11px] text-muted-foreground/80 leading-relaxed pr-4">
          {config.description}
        </p>
        <div className="flex items-center gap-2 pt-0.5">
          <Button
            size="sm"
            onClick={handleActivate}
            disabled={loading}
            className="h-7 text-[11px] bg-yellow-500 hover:bg-yellow-400 text-black font-semibold px-3 rounded-lg"
          >
            {loading ? "Aguarde..." : config.cta}
          </Button>
          <span className="text-[10px] text-muted-foreground/50">Cancele quando quiser</span>
        </div>
      </div>
    );
  }

  // Bottom-sheet variant (para uso futuro)
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border/30 p-4 space-y-3 shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {config.icon}
          <p className="text-sm font-semibold text-yellow-400">{config.title}</p>
        </div>
        {onDismiss && (
          <button onClick={onDismiss} className="text-muted-foreground/50 hover:text-muted-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
      <p className="text-xs text-muted-foreground/80 leading-relaxed">{config.description}</p>
      <div className="grid grid-cols-3 gap-2 text-[10px] text-muted-foreground/60">
        <div className="flex items-center gap-1"><Sparkles className="w-3 h-3 text-yellow-400/70" /> IA ilimitada</div>
        <div className="flex items-center gap-1"><Zap className="w-3 h-3 text-yellow-400/70" /> Duelos ilimitados</div>
        <div className="flex items-center gap-1"><X className="w-3 h-3 text-yellow-400/70" /> Zero anúncios</div>
      </div>
      <Button
        onClick={handleActivate}
        disabled={loading}
        className="w-full bg-yellow-500 hover:bg-yellow-400 text-black font-semibold"
      >
        {loading ? "Aguarde..." : config.cta}
      </Button>
      <p className="text-[10px] text-center text-muted-foreground/40">Cancele quando quiser · Válido em todos os bolões</p>
    </div>
  );
}
