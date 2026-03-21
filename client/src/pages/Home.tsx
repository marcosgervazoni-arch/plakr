import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import {
  Trophy,
  Users,
  Zap,
  Star,
  Shield,
  BarChart3,
  Bell,
  Globe,
  ChevronRight,
  Check,
  Target,
  Calendar,
} from "lucide-react";
import { Link } from "wouter";

const FEATURES = [
  {
    icon: Trophy,
    title: "Bolões Personalizados",
    desc: "Crie bolões com regras de pontuação únicas, prazos configuráveis e campeonatos exclusivos.",
  },
  {
    icon: Target,
    title: "Palpites Precisos",
    desc: "Sistema de palpites com prazo automático, bloqueio antes do jogo e histórico completo.",
  },
  {
    icon: BarChart3,
    title: "Ranking em Tempo Real",
    desc: "Classificação atualizada automaticamente após cada resultado com critérios de desempate.",
  },
  {
    icon: Users,
    title: "Multi-Tenant",
    desc: "Cada organizador tem seu próprio espaço. Gerencie membros, convites e permissões.",
  },
  {
    icon: Bell,
    title: "Notificações Inteligentes",
    desc: "Lembretes de palpites, avisos de resultados e alertas de expiração de plano.",
  },
  {
    icon: Globe,
    title: "Campeonatos Globais",
    desc: "Acesso a campeonatos mundiais pré-configurados com times, fases e jogos importados.",
  },
];

const PLANS = [
  {
    name: "Gratuito",
    price: "R$ 0",
    period: "/mês",
    badge: null,
    features: [
      "Até 2 bolões ativos",
      "Até 50 participantes por bolão",
      "Campeonatos globais",
      "Ranking automático",
      "Notificações in-app",
    ],
    cta: "Começar grátis",
    highlight: false,
  },
  {
    name: "Pro",
    price: "R$ 29",
    period: "/mês",
    badge: "Mais popular",
    features: [
      "Bolões ilimitados",
      "Participantes ilimitados",
      "Campeonatos personalizados",
      "Regras de pontuação customizadas",
      "Registro de resultados pelo organizador",
      "Notificações por e-mail",
      "Suporte prioritário",
    ],
    cta: "Assinar Pro",
    highlight: true,
  },
];

export default function Home() {
  const { user, isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">ApostAI</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#features" className="hover:text-foreground transition-colors">Funcionalidades</a>
            <a href="#plans" className="hover:text-foreground transition-colors">Planos</a>
          </nav>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Link href="/dashboard">
                <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white">
                  Meu Painel <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            ) : (
              <a href={getLoginUrl()}>
                <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white">
                  Entrar
                </Button>
              </a>
            )}
          </div>
        </div>
      </header>

      {/* ─── HERO ────────────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-20 pb-32">
        {/* Background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-brand-500/10 blur-[120px] rounded-full" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="outline" className="mb-6 border-brand-500/40 text-brand-400 bg-brand-500/10">
              <Zap className="w-3 h-3 mr-1" /> Plataforma de Bolões Esportivos
            </Badge>
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 leading-tight">
              Bolões que{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">
                emocionam
              </span>
            </h1>
            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl mx-auto">
              Crie, gerencie e participe de bolões esportivos com pontuação inteligente,
              ranking em tempo real e notificações automáticas. Para grupos de amigos ou
              grandes comunidades.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white px-8 h-12 text-base">
                    Acessar Painel <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </Link>
              ) : (
                <a href={getLoginUrl()}>
                  <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white px-8 h-12 text-base">
                    Começar gratuitamente <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </a>
              )}
              <a href="#features">
                <Button size="lg" variant="outline" className="px-8 h-12 text-base border-border/60">
                  Ver funcionalidades
                </Button>
              </a>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-20 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto">
            {[
              { label: "Bolões criados", value: "10k+" },
              { label: "Palpites registrados", value: "500k+" },
              { label: "Participantes ativos", value: "50k+" },
              { label: "Campeonatos", value: "200+" },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-brand-400">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ────────────────────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Tudo que você precisa</h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              Uma plataforma completa para organizar bolões com profissionalismo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <Card key={f.title} className="bg-card border-border/50 hover:border-brand-500/40 transition-colors group">
                <CardHeader>
                  <div className="w-10 h-10 rounded-lg bg-brand-500/10 flex items-center justify-center mb-3 group-hover:bg-brand-500/20 transition-colors">
                    <f.icon className="w-5 h-5 text-brand-400" />
                  </div>
                  <CardTitle className="text-base">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Como funciona</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              { step: "01", icon: Users, title: "Crie seu bolão", desc: "Escolha um campeonato, configure as regras e gere o link de convite." },
              { step: "02", icon: Calendar, title: "Faça seus palpites", desc: "Registre seus palpites antes do prazo. O sistema bloqueia automaticamente." },
              { step: "03", icon: Trophy, title: "Acompanhe o ranking", desc: "Pontuação calculada automaticamente após cada resultado. Ranking em tempo real." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="relative inline-flex mb-6">
                  <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
                    <item.icon className="w-7 h-7 text-brand-400" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-brand-600 text-white text-xs font-bold flex items-center justify-center">
                    {item.step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PLANS ───────────────────────────────────────────────────────────── */}
      <section id="plans" className="py-24 bg-card/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Planos simples e transparentes</h2>
            <p className="text-muted-foreground text-lg">Comece grátis. Faça upgrade quando precisar.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {PLANS.map((plan) => (
              <Card
                key={plan.name}
                className={`relative border-2 transition-all ${
                  plan.highlight
                    ? "border-brand-500 bg-brand-500/5 shadow-lg shadow-brand-500/10"
                    : "border-border/50 bg-card"
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-brand-600 text-white border-0 px-3">
                      <Star className="w-3 h-3 mr-1" /> {plan.badge}
                    </Badge>
                  </div>
                )}
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl">{plan.name}</CardTitle>
                  <div className="flex items-baseline gap-1 mt-2">
                    <span className="text-4xl font-extrabold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <Check className="w-4 h-4 text-brand-400 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={getLoginUrl()}>
                    <Button
                      className={`w-full ${plan.highlight ? "bg-brand-600 hover:bg-brand-700 text-white" : ""}`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      {plan.cta}
                    </Button>
                  </a>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500/10 mb-6">
            <Shield className="w-8 h-8 text-brand-400" />
          </div>
          <h2 className="text-4xl font-bold mb-4">Pronto para começar?</h2>
          <p className="text-muted-foreground text-lg mb-8">
            Crie seu primeiro bolão em menos de 2 minutos. Sem cartão de crédito.
          </p>
          <a href={getLoginUrl()}>
            <Button size="lg" className="bg-brand-600 hover:bg-brand-700 text-white px-10 h-12 text-base">
              Criar bolão agora <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </a>
        </div>
      </section>

      {/* ─── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-brand-600 flex items-center justify-center">
              <Trophy className="w-3 h-3 text-white" />
            </div>
            <span className="font-semibold text-sm">ApostAI</span>
          </div>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} ApostAI. Plataforma de bolões esportivos.
          </p>
        </div>
      </footer>
    </div>
  );
}
