/**
 * Upgrade — /upgrade
 * Página de pricing: Free | Pro | Ilimitado
 * Preços carregados dinamicamente do banco via trpc.platform.getSettings
 * Modelo: Pro por Conta — o plano é do usuário, não do bolão.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { useAnalytics } from "@/hooks/useAnalytics";
import { getLoginUrl } from "@/const";
import AppShell from "@/components/AppShell";
import {
  Crown,
  CheckCircle2,
  XCircle,
  Zap,
  Users,
  Trophy,
  Settings,
  Star,
  Infinity,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: 2,
  });
}

// ─── Features (estáticas — apenas textos de marketing) ────────────────────────

const FREE_FEATURES = [
  { label: "Até 2 bolões simultâneos", included: true },
  { label: "Até 30 participantes por bolão", included: true },
  { label: "Campeonatos globais da plataforma", included: true },
  { label: "Regras de pontuação padrão", included: true },
  { label: "Campeonatos personalizados", included: false },
  { label: "Mais de 30 participantes", included: false },
  { label: "Mais de 2 bolões simultâneos", included: false },
  { label: "Regras de pontuação customizáveis", included: false },
  { label: "Prazo de palpite configurável", included: false },
  { label: "Suporte prioritário", included: false },
];

const PRO_FEATURES = [
  { icon: Trophy, label: "Até 10 bolões simultâneos" },
  { icon: Users, label: "Até 200 participantes por bolão" },
  { icon: Crown, label: "Campeonatos personalizados" },
  { icon: Settings, label: "Pontuação totalmente customizável" },
  { icon: Zap, label: "Prazo de palpite configurável" },
  { icon: Star, label: "Suporte prioritário" },
];

const UNLIMITED_FEATURES = [
  { icon: Infinity, label: "Bolões ilimitados" },
  { icon: Users, label: "Participantes ilimitados" },
  { icon: Crown, label: "Campeonatos personalizados" },
  { icon: Settings, label: "Pontuação totalmente customizável" },
  { icon: Zap, label: "Prazo de palpite configurável" },
  { icon: Star, label: "Suporte prioritário" },
  { icon: Sparkles, label: "API de resultados automática (em breve)" },
];

const FAQ = [
  {
    q: "O Plano Pro é por bolão ou por conta?",
    a: "O Plano Pro é ativado por conta. Todos os bolões que você criar como organizador terão acesso aos recursos Pro automaticamente.",
  },
  {
    q: "Qual a diferença entre Pro e Ilimitado?",
    a: "O Pro permite até 10 bolões e 200 participantes por bolão. O Ilimitado remove todos os limites e inclui recursos avançados como a API de resultados automática (em breve).",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Você pode cancelar pelo portal de assinatura Stripe. Seu plano continuará ativo até o fim do período pago.",
  },
  {
    q: "O que acontece com meus bolões se eu cancelar?",
    a: "Seus bolões voltarão ao plano gratuito com as limitações correspondentes. Todos os dados e palpites existentes são preservados.",
  },
  {
    q: "Posso testar antes de pagar?",
    a: "Sim! Você pode criar bolões gratuitos e explorar a plataforma sem custo. O upgrade é opcional e pode ser feito a qualquer momento.",
  },
];

// ─── Skeleton de preço ────────────────────────────────────────────────────────

function PriceSkeleton() {
  return <Skeleton className="h-9 w-28 mt-1" />;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function UpgradePage() {
  const analytics = useAnalytics();
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Preços dinâmicos do banco (publicProcedure — sem auth necessária)
  const { data: pricing, isLoading: loadingPrices } =
    trpc.platform.getPublicPricing.useQuery();

  const { data: myPlanData } = trpc.stripe.getMyPlan.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const checkoutMutation = trpc.stripe.createCheckout.useMutation({
    onSuccess: ({ checkoutUrl }) => {
      if (checkoutUrl) {
        window.open(checkoutUrl, "_blank");
        toast.success("Redirecionando para o checkout...");
      }
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao iniciar checkout.");
    },
  });

  const portalMutation = trpc.stripe.createPortalSession.useMutation({
    onSuccess: ({ portalUrl }) => {
      if (portalUrl) window.open(portalUrl, "_blank");
    },
    onError: (err) => toast.error(err.message || "Erro ao abrir portal."),
  });

  const currentTier = myPlanData?.tier ?? "free";

  // Preços vindos do banco, com fallbacks seguros
  const proMonthlyPrice = pricing?.proMonthlyPrice ?? 3990;
  const proAnnualPrice = pricing?.proAnnualPrice ?? 39900;
  const unlimitedMonthlyPrice = pricing?.unlimitedMonthlyPrice ?? 8990;
  const unlimitedAnnualPrice = pricing?.unlimitedAnnualPrice ?? 89900;

  const handleCheckout = (tier: "pro" | "unlimited") => {
    analytics.trackUpgradeClicked({ source: "upgrade_page", pool_slug: tier });
    checkoutMutation.mutate({ tier, origin: window.location.origin });
  };

  return (
    <AppShell>
      <div className="max-w-5xl mx-auto px-4 py-8 lg:py-12 space-y-12">

        {/* ── Hero ── */}
        <div className="text-center space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
            <Crown className="w-3 h-3 mr-1.5" /> Escolha seu plano
          </Badge>
          <h1
            className="font-bold text-3xl lg:text-4xl"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Leve seus bolões ao próximo nível
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Desbloqueie recursos avançados para organizar bolões profissionais.
            O plano é da sua conta — todos os seus bolões ganham os benefícios
            automaticamente.
          </p>
        </div>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Free */}
          <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-5">
            <div>
              <p
                className="font-bold text-lg"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Gratuito
              </p>
              <div className="flex items-end gap-1 mt-1">
                <span
                  className="font-bold text-3xl"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  R$ 0
                </span>
                <span className="text-muted-foreground text-sm mb-1">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Para começar sem compromisso.
              </p>
            </div>
            <div className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span
                    className={`text-sm ${f.included ? "" : "text-muted-foreground/60"}`}
                  >
                    {f.label}
                  </span>
                </div>
              ))}
            </div>
            {isAuthenticated ? (
              <Button
                variant="outline"
                className="w-full"
                disabled={currentTier === "free"}
              >
                {currentTier === "free" ? "Plano atual" : "Plano básico"}
              </Button>
            ) : (
              <a href={getLoginUrl("/upgrade")}>
                <Button variant="outline" className="w-full">
                  Começar grátis
                </Button>
              </a>
            )}
          </div>

          {/* Pro */}
          <div className="bg-card border-2 border-primary/40 rounded-2xl p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-primary-foreground text-xs">
                <Crown className="w-3 h-3 mr-1" /> Popular
              </Badge>
            </div>
            <div>
              <p
                className="font-bold text-lg"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Pro
              </p>
              {loadingPrices ? (
                <PriceSkeleton />
              ) : (
                <div className="flex items-end gap-1 mt-1">
                  <span
                    className="font-bold text-3xl text-primary"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatPrice(proMonthlyPrice)}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">
                    /mês
                  </span>
                </div>
              )}
              {!loadingPrices && proAnnualPrice > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ou {formatPrice(proAnnualPrice)}/ano
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Por conta. Cancele quando quiser.
              </p>
            </div>
            <div className="space-y-2.5">
              {PRO_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>

            {!isAuthenticated ? (
              <a href={getLoginUrl("/upgrade")}>
                <Button className="w-full gap-2">
                  <Crown className="w-4 h-4" /> Assinar Pro
                </Button>
              </a>
            ) : currentTier === "pro" ? (
              <div className="space-y-2">
                <Button className="w-full" disabled>
                  <Crown className="w-4 h-4 mr-2" /> Plano atual
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() =>
                    portalMutation.mutate({ origin: window.location.origin })
                  }
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : null}
                  Gerenciar assinatura
                </Button>
              </div>
            ) : currentTier === "unlimited" ? (
              <Button variant="outline" className="w-full" disabled>
                Você tem Ilimitado
              </Button>
            ) : (
              <Button
                className="w-full gap-2"
                onClick={() => handleCheckout("pro")}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Crown className="w-4 h-4" />
                )}
                Assinar Pro
              </Button>
            )}
          </div>

          {/* Unlimited */}
          <div className="bg-card border-2 border-yellow-500/30 rounded-2xl p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 text-xs">
                <Sparkles className="w-3 h-3 mr-1" /> Ilimitado
              </Badge>
            </div>
            <div>
              <p
                className="font-bold text-lg"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                Ilimitado
              </p>
              {loadingPrices ? (
                <PriceSkeleton />
              ) : (
                <div className="flex items-end gap-1 mt-1">
                  <span
                    className="font-bold text-3xl text-yellow-400"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {formatPrice(unlimitedMonthlyPrice)}
                  </span>
                  <span className="text-muted-foreground text-sm mb-1">
                    /mês
                  </span>
                </div>
              )}
              {!loadingPrices && unlimitedAnnualPrice > 0 && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  ou {formatPrice(unlimitedAnnualPrice)}/ano
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Sem limites. Para quem leva a sério.
              </p>
            </div>
            <div className="space-y-2.5">
              {UNLIMITED_FEATURES.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-yellow-400 shrink-0" />
                  <span className="text-sm">{label}</span>
                </div>
              ))}
            </div>

            {!isAuthenticated ? (
              <a href={getLoginUrl("/upgrade")}>
                <Button className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black">
                  <Sparkles className="w-4 h-4" /> Assinar Ilimitado
                </Button>
              </a>
            ) : currentTier === "unlimited" ? (
              <div className="space-y-2">
                <Button
                  className="w-full bg-yellow-500 hover:bg-yellow-400 text-black"
                  disabled
                >
                  <Sparkles className="w-4 h-4 mr-2" /> Plano atual
                </Button>
                <Button
                  variant="outline"
                  className="w-full text-xs"
                  onClick={() =>
                    portalMutation.mutate({ origin: window.location.origin })
                  }
                  disabled={portalMutation.isPending}
                >
                  {portalMutation.isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : null}
                  Gerenciar assinatura
                </Button>
              </div>
            ) : (
              <Button
                className="w-full gap-2 bg-yellow-500 hover:bg-yellow-400 text-black"
                onClick={() => handleCheckout("unlimited")}
                disabled={checkoutMutation.isPending}
              >
                {checkoutMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                Assinar Ilimitado
              </Button>
            )}
          </div>
        </div>

        {/* ── Feature comparison table ── */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30">
            <h2
              className="font-bold text-lg"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              Comparação detalhada
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Recurso
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">
                    Gratuito
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-primary">
                    Pro
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-yellow-400">
                    Ilimitado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  ["Bolões simultâneos", "2", "10", "Ilimitado"],
                  ["Participantes por bolão", "30", "200", "Ilimitado"],
                  ["Campeonatos globais", "✓", "✓", "✓"],
                  ["Campeonatos personalizados", "—", "✓", "✓"],
                  ["Regras de pontuação", "Padrão", "Customizável", "Customizável"],
                  ["Prazo de palpite", "1h padrão", "Configurável", "Configurável"],
                  ["API de resultados automática", "—", "—", "Em breve"],
                  ["Suporte", "Comunidade", "Prioritário", "Prioritário"],
                ].map(([feature, free, pro, unlimited]) => (
                  <tr
                    key={feature}
                    className="hover:bg-muted/20 transition-colors"
                  >
                    <td className="px-6 py-3 text-sm">{feature}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-sm">
                      {free}
                    </td>
                    <td className="px-4 py-3 text-center text-primary font-medium text-sm">
                      {pro}
                    </td>
                    <td className="px-4 py-3 text-center text-yellow-400 font-medium text-sm">
                      {unlimited}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <h2
            className="font-bold text-lg"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Perguntas frequentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div
                key={i}
                className="bg-card border border-border/30 rounded-xl overflow-hidden"
              >
                <button
                  className="w-full flex items-center justify-between px-5 py-4 text-left gap-4"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                >
                  <span className="font-medium text-sm">{item.q}</span>
                  {openFaq === i ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                  )}
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-4 text-sm text-muted-foreground border-t border-border/20 pt-3">
                    {item.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Bottom CTA ── */}
        <div className="bg-primary/5 border border-primary/20 rounded-2xl p-8 text-center space-y-4">
          <Crown className="w-10 h-10 text-primary mx-auto" />
          <h3
            className="font-bold text-xl"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            Pronto para começar?
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Use o cartão de teste{" "}
            <span className="font-mono font-bold">4242 4242 4242 4242</span>{" "}
            para experimentar o checkout sem custo real.
          </p>
          {!isAuthenticated ? (
            <a href={getLoginUrl("/upgrade")}>
              <Button size="lg" className="gap-2">
                <Crown className="w-4 h-4" /> Começar agora
              </Button>
            </a>
          ) : currentTier === "free" ? (
            <Button
              size="lg"
              className="gap-2"
              onClick={() => handleCheckout("pro")}
              disabled={checkoutMutation.isPending}
            >
              {checkoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Crown className="w-4 h-4" />
              )}
              Assinar Pro agora
            </Button>
          ) : (
            <Link href="/dashboard">
              <Button size="lg" variant="outline" className="gap-2">
                <Trophy className="w-4 h-4" /> Ir para o dashboard
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
