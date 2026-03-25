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
} from "lucide-react";
import { useEffect } from "react";
import { useParams, useSearch } from "wouter";
import { toast } from "sonner";
import OrganizerLayout from "@/components/OrganizerLayout";

const PRO_FEATURES = [
  {
    icon: Users,
    title: "Participantes ilimitados",
    description: "Sem limite de membros no seu bolão.",
    free: "Máx. 50",
    pro: "Ilimitado",
  },
  {
    icon: Infinity,
    title: "Bolões simultâneos",
    description: "Crie quantos bolões quiser ao mesmo tempo.",
    free: "Máx. 2",
    pro: "Ilimitado",
  },
  {
    icon: Trophy,
    title: "Campeonatos personalizados",
    description: "Crie seus próprios campeonatos com times e jogos customizados.",
    free: "Não",
    pro: "Sim",
  },
  {
    icon: Settings,
    title: "Regras de pontuação customizáveis",
    description: "Defina seus próprios critérios de pontuação e desempate.",
    free: "Padrão",
    pro: "Total",
  },
  {
    icon: Zap,
    title: "Prazo de palpite personalizado",
    description: "Configure o prazo de palpite para cada jogo.",
    free: "1h padrão",
    pro: "Configurável",
  },
  {
    icon: Star,
    title: "Registro de resultados",
    description: "Registre os resultados dos jogos diretamente no painel.",
    free: "Não",
    pro: "Sim",
  },
];

export default function SubscriptionPage() {
  const analytics = useAnalytics();
  const { slug } = useParams<{ slug: string }>();
  const search = useSearch();
  const { isAuthenticated } = useAuth();

  const { data: poolData } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData;
  const poolIdNum = pool?.pool?.id ?? 0;

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
      toast.success("Plano Pro ativado com sucesso! Bem-vindo ao Pro.");
    } else if (params.get("checkout") === "cancelled") {
      toast.info("Checkout cancelado. Você pode assinar a qualquer momento.");
    }
  }, [search]);

  const handleUpgrade = () => {
    if (!poolIdNum) return;
    analytics.trackUpgradeClicked({ source: "organizer_subscription", pool_slug: slug ?? undefined });
    checkoutMutation.mutate({
      poolId: poolIdNum,
      origin: window.location.origin,
    });
  };

  const handleManageSubscription = () => {
    if (!poolIdNum) return;
    portalMutation.mutate({
      poolId: poolIdNum,
      origin: window.location.origin,
    });
  };

  const isPro = pool?.pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.pool?.planExpiresAt && new Date(pool.pool.planExpiresAt).getTime() < Date.now();

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
            <h1 className="text-3xl font-bold font-display">Plano Pro</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Desbloqueie o potencial completo do seu bolão
          </p>
          {isPro && (
            <Badge className="bg-yellow-400/20 text-yellow-400 border-yellow-400/30 text-sm px-4 py-1">
              <Crown className="h-3.5 w-3.5 mr-1.5" />
              Plano Pro Ativo
            </Badge>
          )}
        </div>

        {/* Comparativo de planos */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plano Gratuito */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg text-muted-foreground">Plano Gratuito</CardTitle>
              <p className="text-3xl font-bold font-mono">R$ 0</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <div className="w-5 h-5 rounded-full bg-muted flex items-center justify-center mt-0.5 shrink-0">
                    <span className="text-muted-foreground text-xs">—</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.free}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Plano Pro */}
          <Card className="border-brand/40 bg-brand/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-bl-lg">
              RECOMENDADO
            </div>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Crown className="h-5 w-5 text-yellow-400" />
                Plano Pro
              </CardTitle>
              <div>
                <p className="text-3xl font-bold font-mono">
                  Preço por bolão
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Cobrado por bolão ativo via Stripe
                </p>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <div key={f.title} className="flex items-start gap-3">
                  <CheckCircle2 className="h-5 w-5 text-green-400 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium">{f.title}</p>
                    <p className="text-xs text-muted-foreground">{f.pro}</p>
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
            {PRO_FEATURES.map((f, i) => (
              <div key={f.title}>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    <f.icon className="h-5 w-5 text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{f.title}</p>
                    <p className="text-sm text-muted-foreground">{f.description}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-xs text-muted-foreground">Gratuito: {f.free}</p>
                    <p className="text-xs text-green-400 font-medium">Pro: {f.pro}</p>
                  </div>
                </div>
                {i < PRO_FEATURES.length - 1 && <Separator className="mt-4" />}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center space-y-4 pb-8">
          {isPro ? (
            <div className="space-y-3">
              <p className="text-muted-foreground">
                Seu bolão está no Plano Pro. Gerencie sua assinatura pelo portal Stripe.
              </p>
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
              <Button
                size="lg"
                onClick={handleUpgrade}
                disabled={checkoutMutation.isPending}
                className="bg-brand hover:bg-brand/90 gap-2 px-8"
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Crown className="h-4 w-4" />
                )}
                Assinar Plano Pro
              </Button>
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
