/**
 * Dashboard de Acompanhamento do Projeto — ApostAI
 * Visível para gestores e investidores. Mostra progresso das fases,
 * status técnico, métricas e próximos passos.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  Circle,
  Clock,
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
  Users,
  Calendar,
  Star,
} from "lucide-react";

// ─── PHASE DATA ───────────────────────────────────────────────────────────────

const PHASES = [
  {
    id: 1,
    name: "Fundação e Modelagem de Dados",
    weeks: "Semanas 1-2",
    status: "completed" as const,
    progress: 100,
    icon: Database,
    items: [
      { label: "Setup do repositório (Vite + React + tRPC)", done: true },
      { label: "Modelagem Drizzle ORM — 19 tabelas", done: true },
      { label: "Migrações SQL aplicadas no banco", done: true },
      { label: "Autenticação Manus OAuth integrada", done: true },
      { label: "Design system (tema escuro, tokens de cor)", done: true },
    ],
  },
  {
    id: 2,
    name: "Núcleo de Negócios e API",
    weeks: "Semanas 3-5",
    status: "completed" as const,
    progress: 100,
    icon: Code2,
    items: [
      { label: "Routers tRPC — usuários, bolões, campeonatos", done: true },
      { label: "Motor de pontuação (placar exato, bônus, zebra)", done: true },
      { label: "Background jobs BullMQ (fallback síncrono)", done: true },
      { label: "Middlewares de permissão (Admin / Organizador / Participante)", done: true },
      { label: "Cálculo de ranking com critérios de desempate", done: true },
    ],
  },
  {
    id: 3,
    name: "Interface do Participante e Fluxos Públicos",
    weeks: "Semanas 6-8",
    status: "completed" as const,
    progress: 100,
    icon: Globe,
    items: [
      { label: "Landing Page com planos e CTA", done: true },
      { label: "Fluxo de login OAuth e redirecionamento", done: true },
      { label: "Dashboard do participante com bolões ativos", done: true },
      { label: "Página de bolão: jogos, palpites e ranking", done: true },
      { label: "Entrada via link de convite (/join/:token)", done: true },
      { label: "Sino de notificações com polling (30s)", done: true },
    ],
  },
  {
    id: 4,
    name: "Gestão e Monetização",
    weeks: "Semanas 9-11",
    status: "in_progress" as const,
    progress: 70,
    icon: Star,
    items: [
      { label: "Painel do Organizador — configurações do bolão", done: true },
      { label: "Gestão de membros e remoção", done: true },
      { label: "Regras de pontuação customizadas (Pro)", done: true },
      { label: "Painel Super Admin — campeonatos, usuários, planos", done: true },
      { label: "Integração Stripe (checkout + webhooks)", done: false },
      { label: "Campeonatos personalizados (Pro)", done: false },
      { label: "Importação CSV de jogos", done: false },
    ],
  },
  {
    id: 5,
    name: "Polimento, Notificações e Lançamento",
    weeks: "Semanas 12-13",
    status: "pending" as const,
    progress: 20,
    icon: Rocket,
    items: [
      { label: "Sistema de notificações por e-mail (Manus API)", done: false },
      { label: "Exclusão automática de bolões (10 dias)", done: true },
      { label: "Analytics GA4 + Facebook Pixel (Super Admin)", done: false },
      { label: "Testes Vitest — routers críticos", done: false },
      { label: "Testes de carga no motor de pontuação", done: false },
      { label: "Deploy em produção (Manus Hosting)", done: false },
    ],
  },
];

// ─── TECH STACK ───────────────────────────────────────────────────────────────

const TECH_STACK = [
  { label: "Frontend", value: "React 19 + Vite + TailwindCSS 4 + shadcn/ui" },
  { label: "Backend", value: "Express 4 + tRPC 11 + Superjson" },
  { label: "Banco de Dados", value: "MySQL/TiDB + Drizzle ORM (19 tabelas)" },
  { label: "Autenticação", value: "Manus OAuth + JWT em cookies HttpOnly" },
  { label: "Jobs Assíncronos", value: "BullMQ + Redis (fallback síncrono)" },
  { label: "Armazenamento", value: "S3 (Manus Storage) via CDN" },
  { label: "Pagamentos", value: "Stripe (em implementação)" },
  { label: "Hospedagem", value: "Manus Hosting (deploy com 1 clique)" },
];

// ─── METRICS ─────────────────────────────────────────────────────────────────

const METRICS = [
  { label: "Tabelas no banco", value: "19", icon: Database, color: "text-brand-400" },
  { label: "Routers tRPC", value: "40+", icon: Code2, color: "text-green-400" },
  { label: "Páginas implementadas", value: "7", icon: Layers, color: "text-blue-400" },
  { label: "Fases concluídas", value: "3/5", icon: CheckCircle2, color: "text-yellow-400" },
  { label: "Progresso geral", value: "72%", icon: TrendingUp, color: "text-purple-400" },
  { label: "Erros TypeScript", value: "0", icon: Shield, color: "text-emerald-400" },
];

// ─── RISKS ────────────────────────────────────────────────────────────────────

const RISKS = [
  {
    level: "medium",
    title: "Redis não configurado",
    desc: "BullMQ opera em modo síncrono (fallback). Recomenda-se configurar Redis para produção.",
  },
  {
    level: "medium",
    title: "Stripe pendente",
    desc: "Integração de pagamentos ainda não implementada. Monetização Pro bloqueada.",
  },
  {
    level: "low",
    title: "Testes automatizados parciais",
    desc: "Vitest configurado mas cobertura dos routers críticos ainda não completa.",
  },
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  completed: { label: "Concluído", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  in_progress: { label: "Em andamento", color: "bg-brand-500/20 text-brand-400 border-brand-500/30" },
  pending: { label: "Pendente", color: "bg-muted/50 text-muted-foreground border-border/50" },
};

export default function ProjectDashboard() {
  const totalItems = PHASES.flatMap((p) => p.items).length;
  const doneItems = PHASES.flatMap((p) => p.items).filter((i) => i.done).length;
  const overallProgress = Math.round((doneItems / totalItems) * 100);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
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
            <Badge variant="outline" className="border-brand-500/40 text-brand-400">
              <Zap className="w-3 h-3 mr-1" /> Desenvolvimento Ativo
            </Badge>
            <Badge variant="outline" className="text-muted-foreground text-xs">
              <Calendar className="w-3 h-3 mr-1" /> Março 2026
            </Badge>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* ─── OVERVIEW ─────────────────────────────────────────────────────── */}
        <section>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
            {METRICS.map((m) => (
              <Card key={m.label} className="bg-card border-border/50">
                <CardContent className="p-4 text-center">
                  <m.icon className={`w-5 h-5 mx-auto mb-2 ${m.color}`} />
                  <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{m.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Overall progress bar */}
          <Card className="bg-card border-border/50">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-base">Progresso Geral do Projeto</h2>
                  <p className="text-sm text-muted-foreground">
                    {doneItems} de {totalItems} itens concluídos · 5 fases de desenvolvimento
                  </p>
                </div>
                <span className="text-3xl font-bold text-brand-400">{overallProgress}%</span>
              </div>
              <Progress value={overallProgress} className="h-3" />
              <div className="flex items-center gap-6 mt-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" /> Concluído (3 fases)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-brand-500" /> Em andamento (1 fase)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-muted-foreground/40" /> Pendente (1 fase)
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* ─── PHASES ───────────────────────────────────────────────────────── */}
        <section>
          <h2 className="text-xl font-bold mb-4">Fases de Desenvolvimento</h2>
          <div className="space-y-4">
            {PHASES.map((phase) => {
              const cfg = STATUS_CONFIG[phase.status];
              const donePct = Math.round((phase.items.filter((i) => i.done).length / phase.items.length) * 100);
              return (
                <Card key={phase.id} className={`bg-card border-border/50 ${phase.status === "in_progress" ? "border-brand-500/30" : ""}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                          phase.status === "completed" ? "bg-green-500/10" :
                          phase.status === "in_progress" ? "bg-brand-500/10" : "bg-muted/30"
                        }`}>
                          <phase.icon className={`w-4 h-4 ${
                            phase.status === "completed" ? "text-green-400" :
                            phase.status === "in_progress" ? "text-brand-400" : "text-muted-foreground"
                          }`} />
                        </div>
                        <div>
                          <CardTitle className="text-sm font-semibold">
                            Fase {phase.id}: {phase.name}
                          </CardTitle>
                          <p className="text-xs text-muted-foreground mt-0.5">{phase.weeks}</p>
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
                            <Circle className="w-4 h-4 text-muted-foreground/40 shrink-0 mt-0.5" />
                          )}
                          <span className={item.done ? "text-foreground" : "text-muted-foreground"}>
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tech Stack */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-400" /> Stack Tecnológica
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {TECH_STACK.map((t) => (
                  <div key={t.label} className="flex items-start gap-3 text-sm">
                    <span className="text-muted-foreground w-28 shrink-0 text-xs pt-0.5">{t.label}</span>
                    <span className="text-foreground leading-tight">{t.value}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Risks */}
          <Card className="bg-card border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" /> Riscos e Observações
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {RISKS.map((risk) => (
                  <div key={risk.title} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      risk.level === "high" ? "bg-red-500" :
                      risk.level === "medium" ? "bg-yellow-500" : "bg-blue-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium">{risk.title}</p>
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
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Rocket className="w-4 h-4 text-brand-400" /> Próximos Passos (Fase 4 → 5)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                {
                  priority: "Crítico",
                  color: "border-red-500/40 text-red-400",
                  title: "Integração Stripe",
                  desc: "Checkout, webhooks de ativação/cancelamento e gestão de assinaturas Pro.",
                },
                {
                  priority: "Alta",
                  color: "border-yellow-500/40 text-yellow-400",
                  title: "Testes Vitest",
                  desc: "Cobertura dos routers críticos: pontuação, palpites, permissões e planos.",
                },
                {
                  priority: "Média",
                  color: "border-blue-500/40 text-blue-400",
                  title: "Notificações por E-mail",
                  desc: "Lembretes de palpites, resultados e avisos de expiração via Manus API.",
                },
              ].map((step) => (
                <div key={step.title} className="bg-card/60 rounded-lg p-4 border border-border/40">
                  <Badge variant="outline" className={`text-xs mb-3 ${step.color}`}>
                    {step.priority}
                  </Badge>
                  <h3 className="font-semibold text-sm mb-1">{step.title}</h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ─── FOOTER ───────────────────────────────────────────────────────── */}
        <div className="text-center text-xs text-muted-foreground py-4 border-t border-border/30">
          ApostAI — Dashboard de Acompanhamento · Atualizado em {new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })} · Desenvolvido por Manus AI
        </div>
      </main>
    </div>
  );
}
