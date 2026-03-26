/**
 * Plakr! — Landing Page (Home)
 * Redesign completo: foco em bolão com a galera + Copa 2026 + campeonato personalizado como diferencial Pro.
 * Seções controladas via painel Super Admin (landingPage.getConfig).
 * customCode por seção: quando preenchido, tem prioridade total sobre o conteúdo padrão.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  Trophy, Users, ArrowRight, CheckCircle, Crown, Target,
  BarChart3, Award, Settings, Globe, Share2,
} from "lucide-react";

// ─── Countdown Hook ────────────────────────────────────────────────────────────
function useCountdown(targetDate: string) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  useEffect(() => {
    const target = new Date(targetDate).getTime();
    const update = () => {
      const now = Date.now();
      const diff = target - now;
      if (diff <= 0) { setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 }); return; }
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      });
    };
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [targetDate]);
  return timeLeft;
}

// ─── Subcomponentes ───────────────────────────────────────────────────────────

function CountdownUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <div className="w-16 h-16 rounded-xl flex items-center justify-center text-2xl font-bold font-mono"
        style={{ background: "#121826", border: "1px solid #FFB800", color: "#FFB800" }}>
        {String(value).padStart(2, "0")}
      </div>
      <span className="text-xs mt-1 uppercase tracking-wider" style={{ color: "#6B7280" }}>{label}</span>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description, highlight }: {
  icon: React.ElementType; title: string; description: string; highlight?: boolean;
}) {
  return (
    <div className="rounded-2xl p-6 flex flex-col gap-3 transition-all hover:scale-[1.02]"
      style={{
        background: "#121826",
        border: highlight ? "1px solid #FFB800" : "1px solid rgba(255,255,255,0.06)",
        boxShadow: highlight ? "0 0 24px rgba(255,184,0,0.08)" : undefined,
      }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center"
        style={{ background: highlight ? "rgba(255,184,0,0.12)" : "rgba(255,255,255,0.04)" }}>
        <Icon size={20} style={{ color: highlight ? "#FFB800" : "#9CA3AF" }} />
      </div>
      <h3 className="font-semibold text-white text-base">{title}</h3>
      <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }: { number: string; title: string; description: string }) {
  return (
    <div className="flex gap-4 items-start">
      <div className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 text-sm font-bold"
        style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>
        {number}
      </div>
      <div>
        <h3 className="font-semibold text-white mb-1">{title}</h3>
        <p className="text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>{description}</p>
      </div>
    </div>
  );
}

// ─── Mock UI (dados fictícios) ────────────────────────────────────────────────

function MockRankingCard() {
  const players = [
    { pos: 1, name: "Carlos M.", pts: 142, exact: 8 },
    { pos: 2, name: "Ana P.", pts: 138, exact: 7 },
    { pos: 3, name: "Rafael S.", pts: 125, exact: 6 },
    { pos: 4, name: "Juliana T.", pts: 118, exact: 5 },
    { pos: 5, name: "Pedro L.", pts: 110, exact: 4 },
  ];
  const posColor = (p: number) => p === 1 ? "#FFB800" : p === 2 ? "#E5E5E5" : p === 3 ? "#CD7F32" : "#6B7280";
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-2">
          <Trophy size={16} style={{ color: "#FFB800" }} />
          <span className="text-sm font-semibold text-white">Copa do Escritório 2026</span>
        </div>
        <span className="text-xs" style={{ color: "#6B7280" }}>Rodada 4</span>
      </div>
      <div>
        {players.map((p, i) => (
          <div key={p.pos} className="px-4 py-3 flex items-center gap-3"
            style={{ borderBottom: i < players.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
            <span className="w-6 text-center text-sm font-bold" style={{ color: posColor(p.pos) }}>{p.pos}</span>
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
              style={{ background: "rgba(255,184,0,0.1)", color: "#FFB800" }}>
              {p.name.charAt(0)}
            </div>
            <span className="flex-1 text-sm text-white">{p.name}</span>
            <span className="text-xs mr-2" style={{ color: "#00FF88" }}>{p.exact} exatos</span>
            <span className="text-sm font-bold" style={{ color: "#FFB800" }}>{p.pts} pts</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function MockBetCard() {
  const games = [
    { home: "🇧🇷 Brasil", away: "🇦🇷 Argentina", date: "12/06 • 16h", bet: ["2", "1"] },
    { home: "🇩🇪 Alemanha", away: "🇫🇷 França", date: "12/06 • 19h", bet: ["1", "1"] },
    { home: "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra", away: "🇪🇸 Espanha", date: "13/06 • 13h", bet: ["0", "2"] },
  ];
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="px-4 py-3 flex items-center gap-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <Target size={16} style={{ color: "#FFB800" }} />
        <span className="text-sm font-semibold text-white">Seus palpites — Grupo A</span>
      </div>
      {games.map((g, i) => (
        <div key={i} className="px-4 py-3"
          style={{ borderBottom: i < games.length - 1 ? "1px solid rgba(255,255,255,0.04)" : undefined }}>
          <div className="flex items-center justify-between text-sm">
            <span className="text-white text-xs">{g.home}</span>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 text-center rounded-lg text-sm font-bold text-white flex items-center justify-center"
                style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.3)" }}>{g.bet[0]}</div>
              <span style={{ color: "#6B7280" }}>×</span>
              <div className="w-8 h-8 text-center rounded-lg text-sm font-bold text-white flex items-center justify-center"
                style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.3)" }}>{g.bet[1]}</div>
            </div>
            <span className="text-white text-xs">{g.away}</span>
          </div>
          <p className="text-xs mt-1 text-center" style={{ color: "#6B7280" }}>{g.date}</p>
        </div>
      ))}
    </div>
  );
}

function MockCustomTournamentCard() {
  return (
    <div className="rounded-2xl overflow-hidden shadow-2xl"
      style={{ background: "#121826", border: "2px solid #FFB800", boxShadow: "0 0 40px rgba(255,184,0,0.12)" }}>
      <div className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: "1px solid rgba(255,184,0,0.2)", background: "rgba(255,184,0,0.05)" }}>
        <Crown size={16} style={{ color: "#FFB800" }} />
        <span className="text-sm font-semibold" style={{ color: "#FFB800" }}>Campeonato Personalizado — Pro</span>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-white font-medium">Campeonato do Bairro 2026</span>
          <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(0,255,136,0.1)", color: "#00FF88" }}>Ativo</span>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center">
          {[["12", "Times"], ["48", "Jogos"], ["87", "Participantes"]].map(([val, lbl]) => (
            <div key={lbl} className="rounded-lg p-2" style={{ background: "rgba(255,255,255,0.04)" }}>
              <div className="text-lg font-bold" style={{ color: "#FFB800" }}>{val}</div>
              <div className="text-xs" style={{ color: "#6B7280" }}>{lbl}</div>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2 text-xs" style={{ color: "#9CA3AF" }}>
          <Settings size={12} />
          <span>Regras customizadas · Fases configuradas · Resultados manuais</span>
        </div>
      </div>
    </div>
  );
}

// ─── Helper: renderiza customCode ou conteúdo padrão ─────────────────────────
function CustomOrDefault({ customCode, children }: { customCode: string | null | undefined; children: React.ReactNode }) {
  if (customCode && customCode.trim()) {
    return <div dangerouslySetInnerHTML={{ __html: customCode }} />;
  }
  return <>{children}</>;
}

// ─── Landing Page Principal ───────────────────────────────────────────────────

export default function Home() {
  const { data: config } = trpc.landingPage.getConfig.useQuery();
  const { user, loading: authLoading } = useAuth();
  const loginUrl = getLoginUrl("/dashboard");
  const upgradeLoginUrl = getLoginUrl("/upgrade");

  const heroHeadline = config?.heroHeadline ?? "Faça seu bolão com a galera";
  const heroSubheadline = config?.heroSubheadline ?? "Crie bolões para qualquer campeonato, convide seus amigos e acompanhe tudo em tempo real. Simples, divertido e gratuito.";
  const heroBadgeText = config?.heroBadgeText ?? "FAÇA SEU BOLÃO PARA A COPA DO MUNDO";
  const heroBadgeEnabled = config?.heroBadgeEnabled ?? true;
  const heroCountdownEnabled = config?.heroCountdownEnabled ?? true;
  const heroCountdownDate = config?.heroCountdownDate ?? "2026-06-11T16:00:00Z";
  const heroCtaPrimaryText = config?.heroCtaPrimaryText ?? "Criar bolão grátis";
  const heroCtaSecondaryText = config?.heroCtaSecondaryText ?? "Quero campeonato personalizado → Pro";
  const heroCtaSecondaryEnabled = config?.heroCtaSecondaryEnabled ?? true;
  const differentialHeadline = config?.differentialHeadline ?? "Seu campeonato. Suas regras.";
  const differentialBody = config?.differentialBody ?? "Com o Plakr! Pro, você não fica limitado aos campeonatos globais. Crie o seu próprio campeonato — do bairro, da empresa, da família — com os times que você quiser, as fases que você definir e as regras que fizerem sentido para o seu grupo.";
  const ctaFinalHeadline = config?.ctaFinalHeadline ?? "A Copa do Mundo 2026 começa em junho. O seu bolão pode começar hoje.";
  const ctaFinalPrimaryText = config?.ctaFinalPrimaryText ?? "Criar bolão grátis";
  const ctaFinalSecondaryText = config?.ctaFinalSecondaryText ?? "Criar campeonato personalizado";
  const ctaFinalSecondaryEnabled = config?.ctaFinalSecondaryEnabled ?? true;

  const countdown = useCountdown(heroCountdownDate);

  const freeFeatures = [
    "Bolões para Copa do Mundo, Brasileirão e mais",
    "Até 50 participantes por bolão",
    "Ranking em tempo real",
    "Palpites com prazo automático",
    "Perfil público e conquistas",
    "Até 2 bolões simultâneos",
  ];
  const proFeatures = [
    "Tudo do plano gratuito",
    "Participantes ilimitados",
    "Bolões ilimitados",
    "Campeonato personalizado (seu torneio!)",
    "Regras de pontuação customizáveis",
    "Resultados inseridos pelo organizador",
    "Retrospectiva do bolão ao final",
    "Suporte prioritário",
  ];
  const faqs = [
    { q: "O Plakr! é gratuito?", a: "Sim! O plano gratuito permite criar bolões para campeonatos globais com até 50 participantes e 2 bolões simultâneos. O Pro adiciona participantes ilimitados, bolões ilimitados e a criação de campeonatos personalizados." },
    { q: "Como funciona o campeonato personalizado?", a: "Com o Pro, você cria seu próprio campeonato do zero: define os times, as fases (grupos, mata-mata), os jogos e insere os resultados manualmente. Ideal para campeonatos de bairro, empresa, família ou qualquer torneio que não esteja nos campeonatos globais." },
    { q: "Preciso instalar algum aplicativo?", a: "Não! O Plakr! funciona direto no navegador, em qualquer dispositivo. Basta acessar o link do bolão e pronto." },
    { q: "Como os participantes entram no bolão?", a: "Você compartilha um link de convite ou um código de 6 dígitos. Quem receber o link entra diretamente no bolão, sem precisar criar conta previamente." },
    { q: "Posso mudar as regras de pontuação?", a: "No plano Pro, sim! Você define quantos pontos valem placar exato, resultado correto, goleada, zebra e muito mais. No plano gratuito, as regras padrão da plataforma são aplicadas." },
    { q: "O que acontece quando o bolão termina?", a: "O bolão é encerrado automaticamente quando todos os jogos têm resultado. O organizador confirma o encerramento e todos os participantes recebem uma retrospectiva com os melhores momentos e o ranking final." },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#0B0F1A", color: "#F9FAFB" }}>

      {/* ── NAVBAR ─────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: "rgba(11,15,26,0.95)", backdropFilter: "blur(12px)", borderColor: "rgba(255,255,255,0.06)" }} role="navigation" aria-label="Menu principal do Plakr!">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2" aria-label="Plakr! — Página inicial">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>P!</div>
            <span className="font-bold text-white text-lg">Plakr!</span>
          </a>
          <div className="hidden md:flex items-center gap-6 text-sm" style={{ color: "#9CA3AF" }}>
            <a href="#como-funciona" className="hover:text-white transition-colors" title="Como criar um bolão no Plakr!">Como funciona</a>
            <a href="#diferencial" className="hover:text-white transition-colors" title="Campeonato personalizado — exclusivo Plakr! Pro">Campeonato personalizado</a>
            <a href="#planos" className="hover:text-white transition-colors" title="Planos Plakr! — Gratuito e Pro">Planos</a>
          </div>
          {!authLoading && (
            user ? (
              <a href="/dashboard" aria-label="Ir para o dashboard do Plakr!">
                <Button size="sm" className="font-semibold"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A", border: "none" }}>
                  Entrar
                </Button>
              </a>
            ) : (
              <a href={loginUrl} aria-label="Criar bolão grátis no Plakr!">
                <Button size="sm" className="font-semibold"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A", border: "none" }}>
                  {heroCtaPrimaryText}
                </Button>
              </a>
            )
          )}
        </div>
      </nav>

      {/* ── HERO ───────────────────────────────────────────────────────────── */}
      <CustomOrDefault customCode={config?.heroCustomCode}>
        <section className="relative overflow-hidden" aria-label="Seção principal — Bolão da Copa do Mundo 2026">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-10"
              style={{ background: "radial-gradient(ellipse, #FFB800 0%, transparent 70%)" }} />
          </div>
          <div className="max-w-6xl mx-auto px-4 pt-20 pb-16 relative">
            <div className="flex flex-col lg:flex-row items-center gap-12">
              <div className="flex-1 text-center lg:text-left">
                {heroBadgeEnabled && (
                  <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-6"
                    style={{ background: "rgba(255,184,0,0.12)", border: "1px solid rgba(255,184,0,0.3)", color: "#FFB800" }}>
                    <Trophy size={12} />
                    {heroBadgeText}
                  </div>
                )}
                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight mb-6" itemProp="name">
                  {heroHeadline}
                </h1>
                <p className="text-lg leading-relaxed mb-8 max-w-xl mx-auto lg:mx-0" style={{ color: "#9CA3AF" }}>
                  {heroSubheadline}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <a href={loginUrl} aria-label="Criar bolão grátis — começar agora no Plakr!">
                    <Button size="lg" className="w-full sm:w-auto font-bold text-base px-8 py-3"
                      style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A", border: "none" }}>
                      {heroCtaPrimaryText}
                      <ArrowRight size={16} className="ml-2" aria-hidden="true" />
                    </Button>
                  </a>
                  {heroCtaSecondaryEnabled && (
                    <a href={user ? "/upgrade" : upgradeLoginUrl}>
                      <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold text-sm px-6 py-3"
                        style={{ borderColor: "rgba(255,184,0,0.3)", color: "#FFB800", background: "transparent" }}>
                        {heroCtaSecondaryText}
                      </Button>
                    </a>
                  )}
                </div>
                <p className="text-xs mt-4" style={{ color: "#6B7280" }}>
                  Gratuito para começar · Sem cartão de crédito · Pronto em 2 minutos
                </p>
              </div>
              <div className="flex-1 w-full max-w-md lg:max-w-none">
                <MockRankingCard />
              </div>
            </div>

            {heroCountdownEnabled && (
              <div className="mt-16 text-center">
                <p className="text-sm mb-4 uppercase tracking-widest font-semibold" style={{ color: "#6B7280" }}>
                  Copa do Mundo 2026 começa em
                </p>
                <div className="flex items-center justify-center gap-3">
                  <CountdownUnit value={countdown.days} label="dias" />
                  <span className="text-2xl font-bold pb-4" style={{ color: "#FFB800" }}>:</span>
                  <CountdownUnit value={countdown.hours} label="horas" />
                  <span className="text-2xl font-bold pb-4" style={{ color: "#FFB800" }}>:</span>
                  <CountdownUnit value={countdown.minutes} label="min" />
                  <span className="text-2xl font-bold pb-4" style={{ color: "#FFB800" }}>:</span>
                  <CountdownUnit value={countdown.seconds} label="seg" />
                </div>
              </div>
            )}
          </div>
        </section>
      </CustomOrDefault>

      {/* ── CREDIBILIDADE ──────────────────────────────────────────────────── */}
      {(config?.sectionCredibilityEnabled ?? true) && (
        <CustomOrDefault customCode={config?.credibilityCustomCode}>
          <section className="py-12 border-y" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0D1120" }} aria-label="Campeonatos disponíveis no Plakr!">
            <div className="max-w-6xl mx-auto px-4">
              <p className="text-center text-sm uppercase tracking-widest mb-8 font-semibold" style={{ color: "#6B7280" }}>
                Campeonatos disponíveis gratuitamente
              </p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                {[
                  { emoji: "🏆", name: "Copa do Mundo FIFA 2026" },
                  { emoji: "🇧🇷", name: "Brasileirão Série A" },
                  { emoji: "⭐", name: "Champions League" },
                  { emoji: "🏅", name: "Copa do Brasil" },
                  { emoji: "🌎", name: "Copa América" },
                  { emoji: "➕", name: "Crie o seu próprio →" },
                ].map((item) => {
                  const isCustom = item.name.includes("Crie");
                  return (
                    <div key={item.name} className="flex items-center gap-2 px-4 py-2 rounded-full text-sm"
                      style={{
                        background: isCustom ? "rgba(255,184,0,0.1)" : "rgba(255,255,255,0.04)",
                        border: isCustom ? "1px solid rgba(255,184,0,0.3)" : "1px solid rgba(255,255,255,0.06)",
                        color: isCustom ? "#FFB800" : "#D1D5DB",
                        fontWeight: isCustom ? 600 : 400,
                      }}>
                      <span>{item.emoji}</span>
                      <span>{item.name}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── COMO FUNCIONA ──────────────────────────────────────────────────── */}
      {(config?.sectionHowItWorksEnabled ?? true) && (
        <CustomOrDefault customCode={config?.howItWorksCustomCode}>
          <section id="como-funciona" className="py-20" aria-labelledby="section-como-funciona">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-14">
                <h2 id="section-como-funciona" className="text-3xl md:text-4xl font-black mb-4">
                  Seu bolão pronto em{" "}
                  <span style={{ color: "#FFB800" }}>2 minutos</span>
                </h2>
                <p className="text-lg" style={{ color: "#9CA3AF" }}>
                  Você é o organizador. A galera só precisa do link.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <StepCard number="1" title="Crie o bolão"
                    description="Escolha o campeonato, dê um nome ao bolão e defina se é público ou privado. Leva menos de 1 minuto." />
                  <StepCard number="2" title="Convide a galera"
                    description="Compartilhe o link ou o código de 6 dígitos. Quem receber entra direto, sem burocracia." />
                  <StepCard number="3" title="Faça seus palpites"
                    description="Cada participante palpita nos jogos antes do prazo. O sistema calcula os pontos automaticamente." />
                  <StepCard number="4" title="Acompanhe o ranking"
                    description="O ranking atualiza em tempo real conforme os resultados saem. Quem acertar mais, vence." />
                </div>
                <MockBetCard />
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── DIFERENCIAL PRO ────────────────────────────────────────────────── */}
      {(config?.sectionDifferentialEnabled ?? true) && (
        <CustomOrDefault customCode={config?.differentialCustomCode}>
          <section id="diferencial" className="py-20" style={{ background: "#0D1120" }} aria-labelledby="section-diferencial">
            <div className="max-w-6xl mx-auto px-4">
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <MockCustomTournamentCard />
                <div>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest mb-4"
                    style={{ background: "rgba(255,184,0,0.1)", border: "1px solid rgba(255,184,0,0.3)", color: "#FFB800" }}>
                    <Crown size={12} />
                    Exclusivo Pro
                  </div>
                  <h2 id="section-diferencial" className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                    {differentialHeadline}
                  </h2>
                  <p className="text-base leading-relaxed mb-6" style={{ color: "#9CA3AF" }}>
                    {differentialBody}
                  </p>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Crie times e defina grupos",
                      "Configure fases: grupos, oitavas, quartas, semi e final",
                      "Insira os resultados você mesmo",
                      "Participantes ilimitados",
                      "Regras de pontuação customizáveis",
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-3 text-sm">
                        <CheckCircle size={16} style={{ color: "#00FF88", flexShrink: 0 }} />
                        <span style={{ color: "#D1D5DB" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={loginUrl}>
                    <Button className="font-bold"
                      style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A", border: "none" }}>
                      Criar campeonato personalizado
                      <Crown size={14} className="ml-2" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── FEATURES ───────────────────────────────────────────────────────── */}
      {(config?.sectionFeaturesEnabled ?? true) && (
        <CustomOrDefault customCode={config?.featuresCustomCode}>
          <section className="py-20" aria-labelledby="section-features">
            <div className="max-w-6xl mx-auto px-4">
              <div className="text-center mb-14">
                <h2 id="section-features" className="text-3xl md:text-4xl font-black mb-4">
                  Tudo que você precisa para um{" "}
                  <span style={{ color: "#FFB800" }}>bolão épico</span>
                </h2>
                <p className="text-lg" style={{ color: "#9CA3AF" }}>
                  Funcionalidades pensadas para organizadores e participantes.
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <FeatureCard icon={Trophy} title="Ranking em tempo real"
                  description="Pontuação calculada automaticamente após cada resultado. Acompanhe a disputa jogo a jogo." highlight />
                <FeatureCard icon={Target} title="Palpites com prazo"
                  description="O sistema bloqueia palpites automaticamente quando o jogo começa. Sem trapaça." />
                <FeatureCard icon={Users} title="Convite fácil"
                  description="Link direto ou código de 6 dígitos. A galera entra em segundos, sem precisar criar conta antes." />
                <FeatureCard icon={BarChart3} title="Estatísticas detalhadas"
                  description="Aproveitamento, placares exatos, zebras acertadas, goleadas. Perfil completo de cada apostador." />
                <FeatureCard icon={Award} title="Conquistas e badges"
                  description="Sistema de gamificação com badges por desempenho. Quem acerta mais, sobe de nível." />
                <FeatureCard icon={Share2} title="Retrospectiva do bolão"
                  description="Ao final do campeonato, cada participante recebe um card para compartilhar com seu resultado." />
                <FeatureCard icon={Settings} title="Regras customizáveis"
                  description="No Pro, você define quantos pontos vale cada tipo de acerto. Deixe o bolão do seu jeito." />
                <FeatureCard icon={Globe} title="Campeonatos globais"
                  description="Copa do Mundo, Brasileirão, Champions e muito mais. Sempre atualizados pela plataforma." />
                <FeatureCard icon={Crown} title="Campeonato personalizado"
                  description="Crie seu próprio torneio com times, fases e resultados. Exclusivo do plano Pro." highlight />
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── PLANOS ─────────────────────────────────────────────────────────── */}
      {(config?.sectionPlansEnabled ?? true) && (
        <CustomOrDefault customCode={config?.plansCustomCode}>
          <section id="planos" className="py-20" style={{ background: "#0D1120" }} aria-labelledby="section-planos">
            <div className="max-w-4xl mx-auto px-4">
              <div className="text-center mb-14">
                <h2 id="section-planos" className="text-3xl md:text-4xl font-black mb-4">
                  Comece grátis.{" "}
                  <span style={{ color: "#FFB800" }}>Evolua quando quiser.</span>
                </h2>
                <p className="text-lg" style={{ color: "#9CA3AF" }}>
                  O plano gratuito já é completo para a maioria dos bolões. O Pro é para quem quer mais.
                </p>
              </div>
              <div className="grid md:grid-cols-2 gap-6">
                <div className="rounded-2xl p-8" style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">Gratuito</h3>
                    <div className="text-4xl font-black text-white">R$ 0</div>
                    <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Para sempre</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {freeFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <CheckCircle size={14} style={{ color: "#00FF88", flexShrink: 0 }} />
                        <span style={{ color: "#D1D5DB" }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={loginUrl} className="block">
                    <Button className="w-full font-bold" variant="outline"
                      style={{ borderColor: "rgba(255,255,255,0.15)", color: "white", background: "rgba(255,255,255,0.04)" }}>
                      Criar bolão grátis
                    </Button>
                  </a>
                </div>
                <div className="rounded-2xl p-8 relative overflow-hidden"
                  style={{ background: "#121826", border: "2px solid #FFB800", boxShadow: "0 0 40px rgba(255,184,0,0.1)" }}>
                  <div className="absolute top-4 right-4">
                    <span className="px-2 py-1 rounded-full text-xs font-bold"
                      style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}>
                      MAIS POPULAR
                    </span>
                  </div>
                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-white mb-1">
                      Pro <span style={{ color: "#FFB800" }}>por bolão</span>
                    </h3>
                    <div className="flex items-baseline gap-1">
                      <div className="text-4xl font-black text-white">R$ 29</div>
                      <span style={{ color: "#6B7280" }}>/mês por bolão</span>
                    </div>
                    <p className="text-sm mt-1" style={{ color: "#6B7280" }}>Cancele quando quiser</p>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {proFeatures.map((f) => (
                      <li key={f} className="flex items-center gap-3 text-sm">
                        <CheckCircle size={14} style={{ color: "#FFB800", flexShrink: 0 }} />
                        <span style={{ color: "#D1D5DB" }}>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <a href={user ? "/upgrade" : upgradeLoginUrl} className="block">
                    <Button className="w-full font-bold"
                      style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A", border: "none" }}>
                      Começar com Pro
                      <Crown size={14} className="ml-2" />
                    </Button>
                  </a>
                </div>
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── FAQ ────────────────────────────────────────────────────────────── */}
      {(config?.sectionFaqEnabled ?? true) && (
        <CustomOrDefault customCode={config?.faqCustomCode}>
          <section className="py-20" aria-labelledby="section-faq">
            <div className="max-w-3xl mx-auto px-4">
              <div className="text-center mb-12">
                <h2 id="section-faq" className="text-3xl md:text-4xl font-black mb-4">
                  Perguntas{" "}
                  <span style={{ color: "#FFB800" }}>frequentes</span>
                </h2>
              </div>
              <Accordion type="single" collapsible className="space-y-3">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl overflow-hidden"
                    style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <AccordionTrigger className="px-6 py-4 text-left font-semibold text-white hover:no-underline hover:text-white [&>svg]:text-yellow-400">
                      {faq.q}
                    </AccordionTrigger>
                    <AccordionContent className="px-6 pb-4 text-sm leading-relaxed" style={{ color: "#9CA3AF" }}>
                      {faq.a}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── CTA FINAL ──────────────────────────────────────────────────────── */}
      {(config?.sectionCtaFinalEnabled ?? true) && (
        <CustomOrDefault customCode={config?.ctaFinalCustomCode}>
          <section className="py-24 relative overflow-hidden" style={{ background: "#0D1120" }} aria-label="Comece agora no Plakr!">
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full opacity-10"
                style={{ background: "radial-gradient(ellipse, #FFB800 0%, transparent 70%)" }} />
            </div>
            <div className="max-w-3xl mx-auto px-4 text-center relative">
              <div className="text-5xl mb-6" aria-hidden="true">🏆</div>
              <h2 className="text-3xl md:text-4xl font-black mb-4 leading-tight">
                {ctaFinalHeadline}
              </h2>
              <p className="text-lg mb-10" style={{ color: "#9CA3AF" }}>
                Gratuito para começar. Sem cartão de crédito. Pronto em 2 minutos.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <a href={loginUrl} aria-label="Criar bolão grátis agora no Plakr!">
                  <Button size="lg" className="font-bold text-base px-8 py-3"
                    style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A", border: "none" }}>
                    {ctaFinalPrimaryText}
                    <ArrowRight size={16} className="ml-2" aria-hidden="true" />
                  </Button>
                </a>
                {ctaFinalSecondaryEnabled && (
                  <a href={user ? "/upgrade" : upgradeLoginUrl}>
                    <Button size="lg" variant="outline" className="font-semibold text-sm px-6 py-3"
                      style={{ borderColor: "rgba(255,184,0,0.3)", color: "#FFB800", background: "transparent" }}>
                      {ctaFinalSecondaryText}
                      <Crown size={14} className="ml-2" />
                    </Button>
                  </a>
                )}
              </div>
            </div>
          </section>
        </CustomOrDefault>
      )}

      {/* ── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="py-10 border-t" style={{ borderColor: "rgba(255,255,255,0.06)", background: "#0B0F1A" }} role="contentinfo" aria-label="Rodapé do Plakr!">
        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black"
              style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>P!</div>
            <span className="font-bold text-white">Plakr!</span>
          </div>
          <p className="text-sm" style={{ color: "#6B7280" }}>
            © {new Date().getFullYear()} Plakr! · Todos os direitos reservados
          </p>
          <nav className="flex items-center gap-4 text-sm" style={{ color: "#6B7280" }} aria-label="Links legais">
            <a href="/terms" className="hover:text-white transition-colors" title="Termos de uso do Plakr!">Termos</a>
            <a href="/privacy" className="hover:text-white transition-colors" title="Política de privacidade do Plakr!">Privacidade</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
