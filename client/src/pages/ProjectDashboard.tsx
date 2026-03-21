/**
 * Dashboard de Acompanhamento do Projeto — ApostAI
 * Visível para gestores e investidores. Atualizado em 21/03/2026.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Code2,
  Database,
  Globe,
  Layers,
  Rocket,
  Shield,
  Trophy,
  Zap,
  AlertCircle,
  TrendingUp,
  Calendar,
  Star,
  FlaskConical,
  CreditCard,
  Bell,
  BarChart3,
  Clock,
  ExternalLink,
} from "lucide-react";

// ─── TIMELINE ─────────────────────────────────────────────────────────────────

const LAST_UPDATE = "21 de março de 2026";
const APP_URL = "https://apostai-bolao-djv8mgeh.manus.space";

// ─── PHASE DATA ───────────────────────────────────────────────────────────────

const PHASES = [
  {
    id: 1,
    name: "Fundação e Modelagem de Dados",
    weeks: "Semanas 1–2",
    status: "completed" as const,
    icon: Database,
    items: [
      { label: "Setup do repositório (Vite + React 19 + tRPC 11)", done: true },
      { label: "Modelagem Drizzle ORM — 19 tabelas", done: true },
      { label: "Migrações SQL aplicadas no banco TiDB", done: true },
      { label: "Autenticação Manus OAuth + JWT em cookies HttpOnly", done: true },
      { label: "Design system: tema escuro, tokens de cor, fonte Inter", done: true },
    ],
  },
  {
    id: 2,
    name: "Núcleo de Negócios e API",
    weeks: "Semanas 3–5",
    status: "completed" as const,
    icon: Code2,
    items: [
      { label: "40+ procedures tRPC (usuários, bolões, campeonatos, palpites)", done: true },
      { label: "Motor de pontuação: placar exato (10pts), resultado (5pts), bônus zebra", done: true },
      { label: "Background jobs BullMQ com fallback síncrono (sem Redis)", done: true },
      { label: "Middlewares de permissão: Super Admin / Organizador / Participante", done: true },
      { label: "Ranking com critérios de desempate configuráveis", done: true },
      { label: "Limite de plano gratuito: 2 bolões / 50 participantes", done: true },
    ],
  },
  {
    id: 3,
    name: "Interface do Participante e Fluxos Públicos",
    weeks: "Semanas 6–8",
    status: "completed" as const,
    icon: Globe,
    items: [
      { label: "Landing Page com seções de hero, features, planos e CTA", done: true },
      { label: "Fluxo de login OAuth com redirecionamento pós-autenticação", done: true },
      { label: "Dashboard do participante com bolões ativos", done: true },
      { label: "Página do bolão: lista de jogos, formulário de palpites e ranking", done: true },
      { label: "Entrada via link de convite (/join/:token)", done: true },
      { label: "Sino de notificações in-app com polling a cada 30s", done: true },
    ],
  },
  {
    id: 4,
    name: "Gestão e Monetização",
    weeks: "Semanas 9–11",
    status: "in_progress" as const,
    icon: Star,
    items: [
      { label: "Painel do Organizador — configurações e gestão do bolão", done: true },
      { label: "Gestão de membros: remoção e transferência de propriedade", done: true },
      { label: "Regras de pontuação customizadas (exclusivo Pro)", done: true },
      { label: "Painel Super Admin — campeonatos, usuários, planos, configurações", done: true },
      { label: "Integração Stripe (checkout + webhooks de ativação/cancelamento)", done: false },
      { label: "Campeonatos personalizados — fluxo completo (Pro)", done: false },
      { label: "Importação CSV de jogos (Super Admin)", done: false },
    ],
  },
  {
    id: 5,
    name: "Polimento, Notificações e Lançamento",
    weeks: "Semanas 12–13",
    status: "pending" as const,
    icon: Rocket,
    items: [
      { label: "Notificações por e-mail: lembretes, resultados, expiração de plano", done: false },
      { label: "Exclusão automática de bolões encerrados (cron 1h — 10 dias)", done: true },
      { label: "Upload de logos e fotos de times via S3", done: false },
      { label: "Analytics GA4 + Facebook Pixel (exclusivo Super Admin)", done: false },
      { label: "Testes de carga no motor de pontuação", done: false },
      { label: "Deploy em produção (Manus Hosting)", done: false },
    ],
  },
];

// ─── TECH STACK ───────────────────────────────────────────────────────────────

const TECH_STACK = [
  { label: "Frontend", value: "React 19 + Vite 7 + TailwindCSS 4 + shadcn/ui" },
  { label: "Backend", value: "Express 4 + tRPC 11 + Superjson" },
  { label: "Banco de Dados", value: "MySQL/TiDB + Drizzle ORM (19 tabelas)" },
  { label: "Autenticação", value: "Manus OAuth + JWT em cookies HttpOnly" },
  { label: "Jobs Assíncronos", value: "BullMQ + Redis (fallback síncrono ativo)" },
  { label: "Armazenamento", value: "S3 (Manus Storage) via CDN" },
  { label: "Pagamentos", value: "Stripe (integração pendente)" },
  { label: "Hospedagem", value: "Manus Hosting — apostai-bolao-djv8mgeh.manus.space" },
];

// ─── METRICS ─────────────────────────────────────────────────────────────────

const METRICS = [
  { label: "Tabelas no banco", value: "19", icon: Database, color: "text-brand-400" },
  { label: "Procedures tRPC", value: "40+", icon: Code2, color: "text-green-400" },
  { label: "Páginas", value: "8", icon: Layers, color: "text-blue-400" },
  { label: "Testes Vitest", value: "19 ✓", icon: FlaskConical, color: "text-yellow-400" },
  { label: "Erros TypeScript", value: "0", icon: Shield, color: "text-emerald-400" },
  { label: "Progresso geral", value: "74%", icon: TrendingUp, color: "text-purple-400" },
];

// ─── RISKS ────────────────────────────────────────────────────────────────────

const RISKS = [
  {
    level: "high",
    title: "Stripe não integrado",
    desc: "Monetização Pro bloqueada. Checkout e webhooks de ativação/cancelamento de plano precisam ser implementados antes do lançamento.",
  },
  {
    level: "medium",
    title: "Redis não configurado",
    desc: "BullMQ opera em modo síncrono (fallback). Para produção com alta carga (Copa 2026), Redis é necessário para processamento assíncrono de pontuação.",
  },
  {
    level: "medium",
    title: "Notificações por e-mail pendentes",
    desc: "Lembretes de palpites e avisos de expiração de plano ainda não implementados. Impacto direto na retenção de usuários.",
  },
  {
    level: "low",
    title: "Cobertura de testes parcial",
    desc: "19 testes cobrindo motor de pontuação e auth. Faltam testes de isolamento multi-tenant e de limites de plano.",
  },
];

// ─── NEXT STEPS ───────────────────────────────────────────────────────────────

const NEXT_STEPS = [
  {
    priority: "Crítico",
    color: "border-red-500/40 text-red-400",
    icon: CreditCard,
    title: "Integração Stripe",
    desc: "Checkout de assinatura Pro, webhooks de ativação/cancelamento e portal de gestão de plano.",
    eta: "~3 dias",
  },
  {
    priority: "Alta",
    color: "border-yellow-500/40 text-yellow-400",
    icon: Bell,
    title: "Notificações por E-mail",
    desc: "Lembretes de palpites, avisos de resultado e alertas de expiração via Manus Notification API.",
    eta: "~2 dias",
  },
  {
    priority: "Média",
    color: "border-blue-500/40 text-blue-400",
    icon: BarChart3,
    title: "Analytics e Upload S3",
    desc: "GA4 + Facebook Pixel (Super Admin) e upload de logos de bolões e fotos de times.",
    eta: "~2 dias",
  },
];

// ─── STATUS CONFIG ────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  in_progress: { label: "Em andamento", color: "bg-brand-500/20 text-brand-400 border-brand-500/30" },
  pending: { label: "Pendente", color: "bg-muted/50 text-muted-foreground border-border/50" },
};

// ─── COMPONENT ────────────────────────────────────────────────────────────────

export default function ProjectDashboard() {
  const allItems = PHASES.flatMap((p) => p.items);
  const doneItems = allItems.filter((i) => i.done).length;
  const overallProgress = Math.round((doneItems / allItems.length) * 100);

  const completedPhases = PHASES.filter((p) => p.status === "completed").length;
  const inProgressPhases = PHASES.filter((p) => p.status === "in_progress").length;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── HEADER ─────────────────────────────────────────────────────────── */}
      <header className="border-b border-border/40 bg-background/90 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Trophy className="w-4 h-4 text-white" />
            </div>
            <div>
              <span className="font-bold text-base">ApostAI</span>
              <span className="text-muted-foreground text-sm ml-2">— Dashboard de Acompanhamento</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <a
              href={APP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors border border-border/50 rounded-md px-2.5 py-1.5"
            >
              <ExternalLink className="w-3 h-3" /> Ver aplicação
            </a>
            <Badge variant="outline" className="border-brand-500/40 text-brand-400">
              <Zap className="w-3 h-3 mr-1" /> Desenvolvimento Ativo
            </Badge>
            <Badge variant="outline" className="text-muted-foreground text-xs hidden sm:flex">
              <Calendar className="w-3 h-3 mr-1" /> Atualizado: {LAST_UPDATE}
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ─── METRICS ──────────────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
            {METRICS.map((m) => (
              <Card key={m.label} className="bg-card border-border/50">
                <CardContent className="p-4 text-center">
                  <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                  <p className={`text-xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall progress */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-base">Progresso Geral do Projeto</h2>
                  <p className="text-sm text-muted-foreground">
                    {doneItems} de {allItems.length} itens concluídos · {completedPhases} fases completas, {inProgressPhases} em andamento
                  </p>
                </div>
                <span className="text-4xl font-bold text-brand-400">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="grid grid-cols-3 gap-4 mt-5 text-center">
                {[
                  { label: "Fases concluídas", value: `${completedPhases}/5`, color: "text-green-400" },
                  { label: "Em andamento", value: `${inProgressPhases}/5`, color: "text-brand-400" },
                  { label: "Pendentes", value: `${5 - completedPhases - inProgressPhases}/5`, color: "text-muted-foreground" },
                ].map((s) => (
                  <div key={s.label} className="bg-muted/20 rounded-lg p-3">
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── PHASES ───────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold mb-4">Fases de Desenvolvimento</h2>
          <div className="space-y-3">
            {PHASES.map((phase) => {
              const cfg = STATUS_CONFIG[phase.status];
              const phaseDone = phase.items.filter((i) => i.done).length;
              const donePct = Math.round((phaseDone / phase.items.length) * 100);
              return (
                <Card
                  key={phase.id}
                  className={`bg-card border-border/50 ${phase.status === "in_progress" ? "border-brand-500/40 shadow-sm shadow-brand-500/10" : ""}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          phase.status === "completed" ? "bg-green-500/10" :
                          phase.status === "in_progress" ? "bg-brand-500/10" : "bg-muted/20"
                        }`}>
                          <phase.icon className={`w-4 h-4 ${
                            phase.status === "completed" ? "text-green-400" :
                            phase.status === "in_progress" ? "text-brand-400" : "text-muted-foreground/50"
                          }`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            Fase {phase.id}: {phase.name}
                          </CardTitle>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-xs text-muted-foreground">{phase.weeks}</p>
                            <span className="text-muted-foreground/40 text-xs">·</span>
                            <p className="text-xs text-muted-foreground">{phaseDone}/{phase.items.length} itens</p>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-sm font-bold text-muted-foreground">{donePct}%</span>
                        <Badge variant="outline" className={`text-xs ${cfg.color}`}>
                          {cfg.label}
                        </Badge>
                      </div>
                    </div>
                    <Progress value={donePct} className="h-1.5 mt-2" />
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                      {phase.items.map((item) => (
                        <div key={item.label} className="flex items-start gap-2 text-sm">
                          {item.done ? (
                            <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0 mt-0.5" />
                          ) : (
                            <Circle className="w-4 h-4 text-muted-foreground/30 shrink-0 mt-0.5" />
                          )}
                          <span className={item.done ? "text-foreground/90" : "text-muted-foreground/60"}>
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ─── TECH STACK + RISKS ───────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Tech Stack */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Code2 className="w-4 h-4 text-brand-400" /> Stack Tecnológica
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2.5">
                {TECH_STACK.map((t) => (
                  <div key={t.label} className="flex items-start gap-3 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">{t.label}</span>
                    <span className="text-foreground/80 leading-tight text-xs">{t.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risks */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" /> Riscos e Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3.5">
                {RISKS.map((risk) => (
                  <div key={risk.title} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      risk.level === "high" ? "bg-red-500" :
                      risk.level === "medium" ? "bg-yellow-500" : "bg-blue-400"
                    }`} />
                    <div>
                      <p className="text-sm font-medium leading-tight">{risk.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{risk.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ─── NEXT STEPS ───────────────────────────────────────────────────── */}
        <Card className="bg-brand-500/5 border-brand-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Rocket className="w-4 h-4 text-brand-400" /> Próximos Passos Prioritários
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {NEXT_STEPS.map((step) => (
                <div key={step.title} className="bg-card/60 rounded-lg p-4 border border-border/40">
                  <div className="flex items-center justify-between mb-2">
                    <Badge variant="outline" className={`text-xs ${step.color}`}>
                      {step.priority}
                    </Badge>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" /> {step.eta}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <step.icon className="w-4 h-4 text-muted-foreground shrink-0" />
                    <h3 className="font-semibold text-sm">{step.title}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/30 space-y-1">
          <p>
            <span className="font-medium text-foreground/60">ApostAI</span> — Dashboard de Acompanhamento do Projeto
          </p>
          <p>Última atualização: {LAST_UPDATE} · Desenvolvido por Manus AI · <a href={APP_URL} target="_blank" rel="noopener noreferrer" className="text-brand-400 hover:underline">{APP_URL}</a></p>
        </div>
      </main>
    </div>
  );
}
