/**
 * Upgrade Pro — /upgrade
 * Página de pricing independente para upgrade do plano do usuário.
 * Exibe comparação Free vs Pro, CTA de checkout e FAQ.
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

const FREE_FEATURES = [
  { label: "Até 2 bolões simultâneos", included: true },
  { label: "Até 50 participantes por bolão", included: true },
  { label: "Campeonatos globais da plataforma", included: true },
  { label: "Regras de pontuação padrão", included: true },
  { label: "Campeonatos personalizados", included: false },
  { label: "Participantes ilimitados", included: false },
  { label: "Bolões ilimitados", included: false },
  { label: "Regras de pontuação customizáveis", included: false },
  { label: "Prazo de palpite configurável", included: false },
  { label: "Suporte prioritário", included: false },
];

const PRO_FEATURES = [
  { icon: Infinity, label: "Bolões ilimitados" },
  { icon: Users, label: "Participantes ilimitados" },
  { icon: Trophy, label: "Campeonatos personalizados" },
  { icon: Settings, label: "Pontuação totalmente customizável" },
  { icon: Zap, label: "Prazo de palpite configurável" },
  { icon: Star, label: "Suporte prioritário" },
];

const FAQ = [
  {
    q: "O Plano Pro é por bolão ou por conta?",
    a: "O Plano Pro é ativado por bolão. Cada bolão que você quiser com recursos Pro precisa de uma assinatura separada.",
  },
  {
    q: "Posso cancelar a qualquer momento?",
    a: "Sim. Você pode cancelar pelo portal de assinatura Stripe. O bolão continuará Pro até o fim do período pago.",
  },
  {
    q: "O que acontece com meu bolão se eu cancelar?",
    a: "O bolão voltará ao plano gratuito com as limitações correspondentes. Dados e palpites existentes são preservados.",
  },
  {
    q: "Posso testar antes de pagar?",
    a: "Sim! Você pode criar bolões gratuitos e explorar a plataforma sem custo. O upgrade Pro é opcional.",
  },
];

export default function UpgradePage() {
  const analytics = useAnalytics();
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const { data: userData } = trpc.users.me.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myPools = [] } = trpc.users.myPools.useQuery(undefined, { enabled: isAuthenticated });

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

  const isPro = userData?.plan?.plan === "pro" && userData?.plan?.isActive;

  // Pools where user is organizer and not yet Pro
  const eligiblePools = (myPools as any[]).filter(
    (item: any) => (item.member?.role ?? item.role) === "organizer" && (item.pool?.plan ?? item.plan) !== "pro"
  );

  const handleCheckout = (poolId: number, poolName?: string) => {
    analytics.trackUpgradeClicked({ source: "upgrade_page", pool_slug: poolName });
    checkoutMutation.mutate({ poolId, origin: window.location.origin });
  };

  return (
    <AppShell>
      <div className="max-w-4xl mx-auto px-4 py-8 lg:py-12 space-y-12">

        {/* ── Hero ── */}
        <div className="text-center space-y-3">
          <Badge className="bg-primary/10 text-primary border-primary/20 text-xs px-3 py-1">
            <Crown className="w-3 h-3 mr-1.5" /> Plano Pro
          </Badge>
          <h1 className="font-bold text-3xl lg:text-4xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Leve seu bolão ao próximo nível
          </h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Desbloqueie recursos avançados para organizar bolões profissionais com campeonatos personalizados, participantes ilimitados e muito mais.
          </p>
        </div>

        {/* ── Pricing cards ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Free */}
          <div className="bg-card border border-border/30 rounded-2xl p-6 space-y-5">
            <div>
              <p className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>Gratuito</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="font-bold text-3xl" style={{ fontFamily: "'JetBrains Mono', monospace" }}>R$ 0</span>
                <span className="text-muted-foreground text-sm mb-1">/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Para começar sem compromisso.</p>
            </div>
            <div className="space-y-2.5">
              {FREE_FEATURES.map((f) => (
                <div key={f.label} className="flex items-center gap-2.5">
                  {f.included ? (
                    <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />
                  ) : (
                    <XCircle className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                  )}
                  <span className={`text-sm ${f.included ? "" : "text-muted-foreground/60"}`}>{f.label}</span>
                </div>
              ))}
            </div>
            {isAuthenticated ? (
              <Button variant="outline" className="w-full" disabled>
                Plano atual
              </Button>
            ) : (
              <a href={getLoginUrl()}>
                <Button variant="outline" className="w-full">Começar grátis</Button>
              </a>
            )}
          </div>

          {/* Pro */}
          <div className="bg-card border-2 border-primary/40 rounded-2xl p-6 space-y-5 relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <Badge className="bg-primary text-primary-foreground text-xs">
                <Crown className="w-3 h-3 mr-1" /> Recomendado
              </Badge>
            </div>
            <div>
              <p className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>Pro</p>
              <div className="flex items-end gap-1 mt-1">
                <span className="font-bold text-3xl text-primary" style={{ fontFamily: "'JetBrains Mono', monospace" }}>R$ 19,90</span>
                <span className="text-muted-foreground text-sm mb-1">/bolão/mês</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Por bolão ativo. Cancele quando quiser.</p>
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
              <a href={getLoginUrl()}>
                <Button className="w-full gap-2">
                  <Crown className="w-4 h-4" /> Entrar e fazer upgrade
                </Button>
              </a>
            ) : isPro ? (
              <Button className="w-full" disabled>
                <Crown className="w-4 h-4 mr-2" /> Você já é Pro
              </Button>
            ) : eligiblePools.length === 0 ? (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  Crie um bolão como organizador para ativar o Pro.
                </p>
                <Link href="/create-pool">
                  <Button className="w-full gap-2">
                    <Trophy className="w-4 h-4" /> Criar bolão
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Selecione o bolão para ativar o Pro:</p>
                {eligiblePools.map((item: any) => {
                  const pool = item.pool ?? item;
                  return (
                    <Button
                      key={pool.id}
                      className="w-full gap-2 justify-start"
                      onClick={() => handleCheckout(pool.id, pool.name)}
                      disabled={checkoutMutation.isPending}
                    >
                      {checkoutMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Crown className="w-4 h-4" />
                      )}
                      {pool.name}
                    </Button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Feature comparison table ── */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border/30">
            <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
              Comparação detalhada
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/30">
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">Recurso</th>
                  <th className="text-center px-4 py-3 font-medium text-muted-foreground">Gratuito</th>
                  <th className="text-center px-4 py-3 font-medium text-primary">Pro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {[
                  ["Bolões simultâneos", "2", "Ilimitado"],
                  ["Participantes por bolão", "50", "Ilimitado"],
                  ["Campeonatos globais", "✓", "✓"],
                  ["Campeonatos personalizados", "—", "✓"],
                  ["Regras de pontuação", "Padrão", "Customizável"],
                  ["Prazo de palpite", "1h padrão", "Configurável"],
                  ["Suporte", "Comunidade", "Prioritário"],
                ].map(([feature, free, pro]) => (
                  <tr key={feature} className="hover:bg-muted/20 transition-colors">
                    <td className="px-6 py-3 text-sm">{feature}</td>
                    <td className="px-4 py-3 text-center text-muted-foreground text-sm">{free}</td>
                    <td className="px-4 py-3 text-center text-primary font-medium text-sm">{pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── FAQ ── */}
        <div className="space-y-3">
          <h2 className="font-bold text-lg" style={{ fontFamily: "'Syne', sans-serif" }}>
            Perguntas frequentes
          </h2>
          <div className="space-y-2">
            {FAQ.map((item, i) => (
              <div key={i} className="bg-card border border-border/30 rounded-xl overflow-hidden">
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
          <h3 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Pronto para começar?
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            Use o cartão de teste <span className="font-mono font-bold">4242 4242 4242 4242</span> para experimentar o checkout sem custo real.
          </p>
          {!isAuthenticated ? (
            <a href={getLoginUrl()}>
              <Button size="lg" className="gap-2">
                <Crown className="w-4 h-4" /> Começar agora
              </Button>
            </a>
          ) : (
            <Link href="/create-pool">
              <Button size="lg" className="gap-2">
                <Trophy className="w-4 h-4" /> Criar meu bolão Pro
              </Button>
            </Link>
          )}
        </div>
      </div>
    </AppShell>
  );
}
