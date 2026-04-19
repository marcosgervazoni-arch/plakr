import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { useAnalytics } from "@/hooks/useAnalytics";
import {
  CheckCircle2,
  Crown,
  ExternalLink,
  Infinity,
  Loader2,
  Settings,
  Star,
  Trophy,
  Users,
  Zap,
  Minus,
} from "lucide-react";
import { useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { toast } from "sonner";
import OrganizerLayout from "@/components/OrganizerLayout";
import { useUserPlan } from "@/hooks/useUserPlan";

const PLAN_FEATURES = [
  {
    icon: Users,
    title: "Participantes por bolão",
    free: "Máx. 30",
    pro: "Máx. 200",
    unlimited: "Ilimitado",
  },
  {
    icon: Infinity,
    title: "Bolões simultâneos",
    free: "Máx. 2",
    pro: "Máx. 10",
    unlimited: "Ilimitado",
  },
  {
    icon: Trophy,
    title: "Campeonatos personalizados",
    free: "Não",
    pro: "Sim",
    unlimited: "Sim",
  },
  {
    icon: Settings,
    title: "Regras de pontuação",
    free: "Padrão",
    pro: "Customizável",
    unlimited: "Customizável",
  },
  {
    icon: Zap,
    title: "Prazo de palpite",
    free: "1h padrão",
    pro: "Configurável",
    unlimited: "Configurável",
  },
  {
    icon: Star,
    title: "Registro de resultados",
    free: "Não",
    pro: "Sim",
    unlimited: "Sim",
  },
];

function formatPrice(cents: number | undefined, fallback: string) {
  if (!cents) return fallback;
  return `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`;
}

export default function SubscriptionPage() {
  const analytics = useAnalytics();
  const { slug } = useParams<{ slug: string }>();
  const search = useSearch();
  const { isAuthenticated } = useAuth();
  const { isPro, isUnlimited, tier } = useUserPlan();

  const { data: poolData } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData;

  const { data: pricing } = trpc.platform.getPublicPricing.useQuery();

  const checkoutMutation = trpc.stripe.createCheckout.useMutation({
    onSuccess: (data) => {
      if (data.checkoutUrl) {
        toast.info("Redirecionando para o checkout...");
        window.open(data.checkoutUrl, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: (data) => {
      if (data.portalUrl) {
        window.open(data.portalUrl, "_blank");
      }
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  // Detectar retorno do checkout
  useEffect(() => {
    const params = new URLSearchParams(search);
    if (params.get("checkout") === "success") {
      analytics.trackPurchase({ currency: "BRL" });
      const upgradedTier = params.get("tier") ?? "pro";
      const label = upgradedTier === "unlimited" ? "Ilimitado" : "Pro";
      toast.success(`Plano ${label} ativado com sucesso!`);
    } else if (params.get("checkout") === "cancelled") {
      toast.info("Checkout cancelado. Você pode assinar a qualquer momento.");
    }
  }, [search]);

  const handleUpgrade = (targetTier: "pro" | "unlimited") => {
    analytics.trackUpgradeClicked({ source: "organizer_subscription", pool_slug: slug ?? undefined });
    checkoutMutation.mutate({
      tier: targetTier,
      origin: window.location.origin,
    });
  };

  const handleManageSubscription = () => {
    portalMutation.mutate({ origin: window.location.origin });
  };

  const isProExpired = false;

  const proPrice = formatPrice(pricing?.proMonthlyPrice, "R$ --");
  const unlimitedPrice = formatPrice(pricing?.unlimitedMonthlyPrice, "R$ --");

  const activeTierLabel = isUnlimited ? "Ilimitado" : isPro ? "Pro" : null;

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.pool?.name ?? "Carregando..."}
      poolStatus={(pool?.pool?.status as "active" | "closed" | "draft") ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="plan"
    >
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="flex items-center justify-center gap-2">
            <Crown className="h-8 w-8 text-yellow-400" />
            <h1 className="text-3xl font-bold font-display">Planos do Organizador</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Desbloqueie o potencial completo do seu bolão
          </p>
          {activeTierLabel && (
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-sm px-4 py-1">
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Plano {activeTierLabel} Ativo
            </Badge>
          )}
        </div>

        {/* Comparativo de planos — 3 colunas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Gratuito */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base text-muted-foreground">Gratuito</CardTitle>
              <p className="text-3xl font-bold font-mono">R$ 0</p>
              <p className="text-xs text-muted-foreground">Para começar</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {PLAN_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-2.5">
                  <div className="w-4 h-4 rounded-full bg-muted flex items-center justify-center mt-0.5 shrink-0">
                    <Minus className="w-2.5 h-2.5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-xs font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.free}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Pro */}
          <Card className={`border-primary/40 relative overflow-hidden ${tier === "pro" ? "bg-primary/5" : ""}`}>
            {tier !== "unlimited" && (
              <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-bl-lg">
                POPULAR
              </div>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-primary" />
                Pro
              </CardTitle>
              <p className="text-3xl font-bold font-mono">{proPrice}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <p className="text-xs text-muted-foreground">Para organizadores sérios</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {PLAN_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.pro}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Ilimitado */}
          <Card className={`border-yellow-500/40 relative overflow-hidden ${isUnlimited ? "bg-yellow-500/5" : ""}`}>
            {isUnlimited && (
              <div className="absolute top-0 right-0 bg-yellow-500 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
                ATIVO
              </div>
            )}
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-1.5">
                <Crown className="h-4 w-4 text-yellow-400" />
                Ilimitado
              </CardTitle>
              <p className="text-3xl font-bold font-mono">{unlimitedPrice}<span className="text-sm font-normal text-muted-foreground">/mês</span></p>
              <p className="text-xs text-muted-foreground">Sem limites, sem compromisso</p>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {PLAN_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-yellow-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.unlimited}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Detalhes dos recursos */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recursos em detalhe</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {PLAN_FEATURES.map((f, i) => (
              <div key={f.title}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <f.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{f.title}</p>
                  </div>
                  <div className="text-right shrink-0 space-y-0.5">
                    <p className="text-xs text-muted-foreground">Free: {f.free}</p>
                    <p className="text-xs text-primary font-medium">Pro: {f.pro}</p>
                    <p className="text-xs text-yellow-400 font-medium">Ilimitado: {f.unlimited}</p>
                  </div>
                </div>
                {i < PLAN_FEATURES.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4 pb-8">
          {isPro ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Seu bolão está no Plano <strong>{activeTierLabel}</strong>. Gerencie sua assinatura pelo portal Stripe.
              </p>
              {!isUnlimited && (
                <Button
                  size="lg"
                  onClick={() => handleUpgrade("unlimited")}
                  disabled={checkoutMutation.isPending}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2 px-8 mr-3"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  Fazer upgrade para Ilimitado
                </Button>
              )}
              <Button
                size="lg"
                variant="outline"
                onClick={handleManageSubscription}
                disabled={portalMutation.isPending}
                className="gap-2"
              >
                {portalMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                Gerenciar Assinatura
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button
                  size="lg"
                  onClick={() => handleUpgrade("pro")}
                  disabled={checkoutMutation.isPending}
                  className="gap-2 px-8"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  Assinar Pro — {proPrice}/mês
                </Button>
                <Button
                  size="lg"
                  onClick={() => handleUpgrade("unlimited")}
                  disabled={checkoutMutation.isPending}
                  className="bg-yellow-500 hover:bg-yellow-400 text-black font-semibold gap-2 px-8"
                >
                  {checkoutMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Crown className="h-4 w-4" />
                  )}
                  Assinar Ilimitado — {unlimitedPrice}/mês
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Pagamento seguro via Stripe. Cancele a qualquer momento.
              </p>
              <p className="text-xs text-muted-foreground">
                Para testar, use o cartão: <span className="font-mono">4242 4242 4242 4242</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </OrganizerLayout>
  );
}
