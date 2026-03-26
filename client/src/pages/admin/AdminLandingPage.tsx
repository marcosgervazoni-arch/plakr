/**
 * Admin — Página de Vendas
 * Controle completo da landing page via painel Super Admin.
 * - Acordeão por seção: toggle ativo/inativo + editor de conteúdo + campo de código customizado
 * - Código customizado tem prioridade total sobre o conteúdo padrão na landing page
 */
import AdminLayout from "@/components/AdminLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Code2,
  Crown,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  HelpCircle,
  LayoutGrid,
  LayoutTemplate,
  Megaphone,
  RotateCcw,
  Save,
  Trophy,
  Users,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LandingConfig {
  heroHeadline: string;
  heroSubheadline: string;
  heroBadgeText: string;
  heroBadgeEnabled: boolean;
  heroCountdownEnabled: boolean;
  heroCountdownDate: string;
  heroCtaPrimaryText: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryEnabled: boolean;
  differentialHeadline: string;
  differentialBody: string;
  ctaFinalHeadline: string;
  ctaFinalPrimaryText: string;
  ctaFinalSecondaryText: string;
  ctaFinalSecondaryEnabled: boolean;
  sectionCredibilityEnabled: boolean;
  sectionHowItWorksEnabled: boolean;
  sectionDifferentialEnabled: boolean;
  sectionFeaturesEnabled: boolean;
  sectionPlansEnabled: boolean;
  sectionFaqEnabled: boolean;
  sectionCtaFinalEnabled: boolean;
  // Custom code per section
  heroCustomCode: string;
  credibilityCustomCode: string;
  howItWorksCustomCode: string;
  differentialCustomCode: string;
  featuresCustomCode: string;
  plansCustomCode: string;
  faqCustomCode: string;
  ctaFinalCustomCode: string;
}

const DEFAULTS: LandingConfig = {
  heroHeadline: "Faça seu bolão com a galera",
  heroSubheadline: "Crie bolões para qualquer campeonato, convide seus amigos e acompanhe tudo em tempo real. Simples, divertido e gratuito.",
  heroBadgeText: "FAÇA SEU BOLÃO PARA A COPA DO MUNDO",
  heroBadgeEnabled: true,
  heroCountdownEnabled: true,
  heroCountdownDate: "2026-06-11T16:00:00Z",
  heroCtaPrimaryText: "Criar bolão grátis",
  heroCtaSecondaryText: "Quero campeonato personalizado → Pro",
  heroCtaSecondaryEnabled: true,
  differentialHeadline: "Seu campeonato. Suas regras.",
  differentialBody: "Com o Plakr! Pro, você não fica limitado aos campeonatos globais. Crie o seu próprio campeonato — do bairro, da empresa, da família — com os times que você quiser, as fases que você definir e as regras que fizerem sentido para o seu grupo.",
  ctaFinalHeadline: "A Copa do Mundo 2026 começa em junho. O seu bolão pode começar hoje.",
  ctaFinalPrimaryText: "Criar bolão grátis",
  ctaFinalSecondaryText: "Criar campeonato personalizado",
  ctaFinalSecondaryEnabled: true,
  sectionCredibilityEnabled: true,
  sectionHowItWorksEnabled: true,
  sectionDifferentialEnabled: true,
  sectionFeaturesEnabled: true,
  sectionPlansEnabled: true,
  sectionFaqEnabled: true,
  sectionCtaFinalEnabled: true,
  heroCustomCode: "",
  credibilityCustomCode: "",
  howItWorksCustomCode: "",
  differentialCustomCode: "",
  featuresCustomCode: "",
  plansCustomCode: "",
  faqCustomCode: "",
  ctaFinalCustomCode: "",
};

// ─── Campo de código customizado ─────────────────────────────────────────────

function CustomCodeField({
  value,
  onChange,
  sectionName,
}: {
  value: string;
  onChange: (v: string) => void;
  sectionName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const hasCode = value.trim().length > 0;

  return (
    <div
      className="mt-4 rounded-xl overflow-hidden"
      style={{
        border: hasCode
          ? "1px solid rgba(255,184,0,0.4)"
          : "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-white/5"
        style={{
          background: hasCode ? "rgba(255,184,0,0.06)" : "rgba(255,255,255,0.03)",
        }}
      >
        <div className="flex items-center gap-2">
          <Code2 size={14} style={{ color: hasCode ? "#FFB800" : "#6B7280" }} />
          <span style={{ color: hasCode ? "#FFB800" : "#9CA3AF" }}>
            Código customizado{" "}
            {hasCode ? "(ativo — tem prioridade)" : "(opcional)"}
          </span>
          {hasCode && (
            <Badge
              variant="outline"
              className="text-xs"
              style={{ borderColor: "rgba(255,184,0,0.4)", color: "#FFB800" }}
            >
              ATIVO
            </Badge>
          )}
        </div>
        <span style={{ color: "#6B7280" }}>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="p-4 space-y-3" style={{ background: "#0B0F1A" }}>
          <p className="text-xs leading-relaxed" style={{ color: "#9CA3AF" }}>
            Cole HTML, CSS ou JS aqui. Quando preenchido, este código{" "}
            <strong style={{ color: "#FFB800" }}>
              substitui completamente
            </strong>{" "}
            o conteúdo padrão da seção "{sectionName}" na landing page. Deixe
            em branco para usar o conteúdo padrão.
          </p>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={`<!-- Código HTML customizado para a seção ${sectionName} -->\n<section class="...">\n  ...\n</section>`}
            rows={10}
            className="font-mono text-xs"
            style={{
              background: "#121826",
              border: "1px solid rgba(255,255,255,0.1)",
              color: "#E5E7EB",
              resize: "vertical",
            }}
          />
          {hasCode && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onChange("")}
              className="text-xs gap-1.5"
              style={{
                borderColor: "rgba(239,68,68,0.4)",
                color: "#EF4444",
                background: "transparent",
              }}
            >
              <RotateCcw size={12} />
              Limpar código (usar padrão)
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Header de seção no acordeão ─────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  title,
  enabled,
  hasCustomCode,
  onToggle,
}: {
  icon: React.ElementType;
  title: string;
  enabled: boolean;
  hasCustomCode: boolean;
  onToggle?: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center gap-3 flex-1 pr-4">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
        style={{
          background: enabled
            ? "rgba(255,184,0,0.1)"
            : "rgba(255,255,255,0.04)",
        }}
      >
        <Icon size={14} style={{ color: enabled ? "#FFB800" : "#6B7280" }} />
      </div>
      <span
        className="font-semibold text-sm"
        style={{ color: enabled ? "#F9FAFB" : "#6B7280" }}
      >
        {title}
      </span>
      <div className="flex items-center gap-2 ml-auto">
        {hasCustomCode && (
          <Badge
            variant="outline"
            className="text-xs"
            style={{ borderColor: "rgba(255,184,0,0.4)", color: "#FFB800" }}
          >
            <Code2 size={10} className="mr-1" />
            Código
          </Badge>
        )}
        <Badge
          variant="outline"
          className="text-xs"
          style={{
            borderColor: enabled
              ? "rgba(0,255,136,0.4)"
              : "rgba(255,255,255,0.1)",
            color: enabled ? "#00FF88" : "#6B7280",
          }}
        >
          {enabled ? (
            <>
              <Eye size={10} className="mr-1" />
              Ativo
            </>
          ) : (
            <>
              <EyeOff size={10} className="mr-1" />
              Inativo
            </>
          )}
        </Badge>
        {onToggle && (
          <div onClick={(e) => e.stopPropagation()}>
            <Switch
              checked={enabled}
              onCheckedChange={onToggle}
              className="scale-75"
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminLandingPage() {
  const { data: serverConfig, isLoading, refetch } =
    trpc.landingPage.getConfig.useQuery();
  const updateMutation = trpc.landingPage.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Página de vendas atualizada com sucesso!");
      refetch();
      setIsDirty(false);
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const [config, setConfig] = useState<LandingConfig>(DEFAULTS);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (serverConfig) {
      setConfig({
        heroHeadline: serverConfig.heroHeadline ?? DEFAULTS.heroHeadline,
        heroSubheadline:
          serverConfig.heroSubheadline ?? DEFAULTS.heroSubheadline,
        heroBadgeText: serverConfig.heroBadgeText ?? DEFAULTS.heroBadgeText,
        heroBadgeEnabled:
          serverConfig.heroBadgeEnabled ?? DEFAULTS.heroBadgeEnabled,
        heroCountdownEnabled:
          serverConfig.heroCountdownEnabled ?? DEFAULTS.heroCountdownEnabled,
        heroCountdownDate:
          serverConfig.heroCountdownDate ?? DEFAULTS.heroCountdownDate,
        heroCtaPrimaryText:
          serverConfig.heroCtaPrimaryText ?? DEFAULTS.heroCtaPrimaryText,
        heroCtaSecondaryText:
          serverConfig.heroCtaSecondaryText ?? DEFAULTS.heroCtaSecondaryText,
        heroCtaSecondaryEnabled:
          serverConfig.heroCtaSecondaryEnabled ??
          DEFAULTS.heroCtaSecondaryEnabled,
        differentialHeadline:
          serverConfig.differentialHeadline ?? DEFAULTS.differentialHeadline,
        differentialBody:
          serverConfig.differentialBody ?? DEFAULTS.differentialBody,
        ctaFinalHeadline:
          serverConfig.ctaFinalHeadline ?? DEFAULTS.ctaFinalHeadline,
        ctaFinalPrimaryText:
          serverConfig.ctaFinalPrimaryText ?? DEFAULTS.ctaFinalPrimaryText,
        ctaFinalSecondaryText:
          serverConfig.ctaFinalSecondaryText ?? DEFAULTS.ctaFinalSecondaryText,
        ctaFinalSecondaryEnabled:
          serverConfig.ctaFinalSecondaryEnabled ??
          DEFAULTS.ctaFinalSecondaryEnabled,
        sectionCredibilityEnabled:
          serverConfig.sectionCredibilityEnabled ??
          DEFAULTS.sectionCredibilityEnabled,
        sectionHowItWorksEnabled:
          serverConfig.sectionHowItWorksEnabled ??
          DEFAULTS.sectionHowItWorksEnabled,
        sectionDifferentialEnabled:
          serverConfig.sectionDifferentialEnabled ??
          DEFAULTS.sectionDifferentialEnabled,
        sectionFeaturesEnabled:
          serverConfig.sectionFeaturesEnabled ?? DEFAULTS.sectionFeaturesEnabled,
        sectionPlansEnabled:
          serverConfig.sectionPlansEnabled ?? DEFAULTS.sectionPlansEnabled,
        sectionFaqEnabled:
          serverConfig.sectionFaqEnabled ?? DEFAULTS.sectionFaqEnabled,
        sectionCtaFinalEnabled:
          serverConfig.sectionCtaFinalEnabled ?? DEFAULTS.sectionCtaFinalEnabled,
        heroCustomCode: serverConfig.heroCustomCode ?? "",
        credibilityCustomCode: serverConfig.credibilityCustomCode ?? "",
        howItWorksCustomCode: serverConfig.howItWorksCustomCode ?? "",
        differentialCustomCode: serverConfig.differentialCustomCode ?? "",
        featuresCustomCode: serverConfig.featuresCustomCode ?? "",
        plansCustomCode: serverConfig.plansCustomCode ?? "",
        faqCustomCode: serverConfig.faqCustomCode ?? "",
        ctaFinalCustomCode: serverConfig.ctaFinalCustomCode ?? "",
      });
      setIsDirty(false);
    }
  }, [serverConfig]);

  const update = <K extends keyof LandingConfig>(
    key: K,
    value: LandingConfig[K]
  ) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate(config);
  };

  const handleReset = () => {
    setConfig(DEFAULTS);
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <AdminLayout activeSection="landing-page">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">
            Carregando configurações...
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="landing-page">
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <LayoutTemplate className="h-5 w-5 text-brand" />
              <h1 className="text-xl font-bold">Página de Vendas</h1>
            </div>
            <p className="text-sm text-muted-foreground">
              Configure o conteúdo, visibilidade e código customizado de cada
              seção. Código customizado tem prioridade sobre o conteúdo padrão.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Visualizar
              </Button>
            </a>
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              onClick={handleReset}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restaurar padrões
            </Button>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
            >
              <Save className="h-3.5 w-3.5" />
              {updateMutation.isPending
                ? "Salvando..."
                : isDirty
                  ? "Salvar alterações"
                  : "Salvo"}
            </Button>
          </div>
        </div>

        {isDirty && (
          <div
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
            style={{
              background: "rgba(255,184,0,0.08)",
              border: "1px solid rgba(255,184,0,0.25)",
              color: "#FFB800",
            }}
          >
            <Zap size={14} />
            <span className="font-medium">Há alterações não salvas.</span>
            <span className="text-muted-foreground">
              Clique em "Salvar alterações" para publicar.
            </span>
          </div>
        )}

        {/* Acordeão de seções */}
        <Accordion type="multiple" className="space-y-3">
          {/* ── HERO ── */}
          <AccordionItem
            value="hero"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={Trophy}
                title="Hero — Seção principal"
                enabled={true}
                hasCustomCode={config.heroCustomCode.trim().length > 0}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Headline principal
                  </Label>
                  <Input
                    value={config.heroHeadline}
                    onChange={(e) => update("heroHeadline", e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    Texto do badge Copa 2026
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.heroBadgeText}
                      onChange={(e) => update("heroBadgeText", e.target.value)}
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch
                        checked={config.heroBadgeEnabled}
                        onCheckedChange={(v) => update("heroBadgeEnabled", v)}
                      />
                      <span className="text-xs text-muted-foreground">
                        Exibir
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Sub-headline
                </Label>
                <Textarea
                  value={config.heroSubheadline}
                  onChange={(e) => update("heroSubheadline", e.target.value)}
                  rows={2}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    CTA primário (botão principal)
                  </Label>
                  <Input
                    value={config.heroCtaPrimaryText}
                    onChange={(e) =>
                      update("heroCtaPrimaryText", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    CTA secundário (Pro)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.heroCtaSecondaryText}
                      onChange={(e) =>
                        update("heroCtaSecondaryText", e.target.value)
                      }
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch
                        checked={config.heroCtaSecondaryEnabled}
                        onCheckedChange={(v) =>
                          update("heroCtaSecondaryEnabled", v)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Exibir
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Data da Copa (contador regressivo — formato ISO 8601)
                </Label>
                <div className="flex gap-2">
                  <Input
                    value={config.heroCountdownDate}
                    onChange={(e) => update("heroCountdownDate", e.target.value)}
                    placeholder="2026-06-11T16:00:00Z"
                    className="font-mono text-sm"
                  />
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <Switch
                      checked={config.heroCountdownEnabled}
                      onCheckedChange={(v) =>
                        update("heroCountdownEnabled", v)
                      }
                    />
                    <span className="text-xs text-muted-foreground">
                      Exibir
                    </span>
                  </div>
                </div>
              </div>
              <CustomCodeField
                value={config.heroCustomCode}
                onChange={(v) => update("heroCustomCode", v)}
                sectionName="Hero"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── CREDIBILIDADE ── */}
          <AccordionItem
            value="credibility"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={Globe}
                title="Credibilidade — Campeonatos suportados"
                enabled={config.sectionCredibilityEnabled}
                hasCustomCode={config.credibilityCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionCredibilityEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Faixa com os campeonatos disponíveis gratuitamente + "Crie o
                seu próprio →". Sem campos editáveis — use o código customizado
                para personalizar.
              </p>
              <CustomCodeField
                value={config.credibilityCustomCode}
                onChange={(v) => update("credibilityCustomCode", v)}
                sectionName="Credibilidade"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── COMO FUNCIONA ── */}
          <AccordionItem
            value="how-it-works"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={Zap}
                title="Como funciona — 4 passos"
                enabled={config.sectionHowItWorksEnabled}
                hasCustomCode={config.howItWorksCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionHowItWorksEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Seção "Seu bolão pronto em 2 minutos" com os 4 passos do
                organizador. Sem campos editáveis — use o código customizado
                para personalizar.
              </p>
              <CustomCodeField
                value={config.howItWorksCustomCode}
                onChange={(v) => update("howItWorksCustomCode", v)}
                sectionName="Como funciona"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── DIFERENCIAL PRO ── */}
          <AccordionItem
            value="differential"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={Crown}
                title="Diferencial Pro — Campeonato personalizado"
                enabled={config.sectionDifferentialEnabled}
                hasCustomCode={config.differentialCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionDifferentialEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Headline da seção
                </Label>
                <Input
                  value={config.differentialHeadline}
                  onChange={(e) =>
                    update("differentialHeadline", e.target.value)
                  }
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Corpo do texto
                </Label>
                <Textarea
                  value={config.differentialBody}
                  onChange={(e) => update("differentialBody", e.target.value)}
                  rows={4}
                />
              </div>
              <CustomCodeField
                value={config.differentialCustomCode}
                onChange={(v) => update("differentialCustomCode", v)}
                sectionName="Diferencial Pro"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── FEATURES ── */}
          <AccordionItem
            value="features"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={LayoutGrid}
                title="Funcionalidades — Grid de cards"
                enabled={config.sectionFeaturesEnabled}
                hasCustomCode={config.featuresCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionFeaturesEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Grid com cards de funcionalidades (Ranking, Palpites, Convite,
                Estatísticas, Conquistas, Retrospectiva, Regras, Campeonatos,
                Campeonato personalizado). Use o código customizado para
                personalizar.
              </p>
              <CustomCodeField
                value={config.featuresCustomCode}
                onChange={(v) => update("featuresCustomCode", v)}
                sectionName="Funcionalidades"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── PLANOS ── */}
          <AccordionItem
            value="plans"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={Users}
                title="Planos — Comparativo Gratuito vs Pro"
                enabled={config.sectionPlansEnabled}
                hasCustomCode={config.plansCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionPlansEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                Comparativo lado a lado dos planos Gratuito e Pro com CTAs. Os
                preços e features são definidos no código — use o código
                customizado para personalizar ou ajustar valores.
              </p>
              <CustomCodeField
                value={config.plansCustomCode}
                onChange={(v) => update("plansCustomCode", v)}
                sectionName="Planos"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── FAQ ── */}
          <AccordionItem
            value="faq"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={HelpCircle}
                title="FAQ — Perguntas frequentes"
                enabled={config.sectionFaqEnabled}
                hasCustomCode={config.faqCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionFaqEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <p className="text-sm text-muted-foreground">
                6 perguntas frequentes em acordeão. Use o código customizado
                para adicionar, remover ou editar perguntas.
              </p>
              <CustomCodeField
                value={config.faqCustomCode}
                onChange={(v) => update("faqCustomCode", v)}
                sectionName="FAQ"
              />
            </AccordionContent>
          </AccordionItem>

          {/* ── CTA FINAL ── */}
          <AccordionItem
            value="cta-final"
            className="rounded-2xl overflow-hidden border"
            style={{
              background: "#121826",
              borderColor: "rgba(255,255,255,0.06)",
            }}
          >
            <AccordionTrigger className="px-5 py-4 hover:no-underline [&>svg]:text-yellow-400">
              <SectionHeader
                icon={Megaphone}
                title="CTA Final — Chamada para ação"
                enabled={config.sectionCtaFinalEnabled}
                hasCustomCode={config.ctaFinalCustomCode.trim().length > 0}
                onToggle={(v) => update("sectionCtaFinalEnabled", v)}
              />
            </AccordionTrigger>
            <AccordionContent className="px-5 pb-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Headline do CTA final
                </Label>
                <Input
                  value={config.ctaFinalHeadline}
                  onChange={(e) => update("ctaFinalHeadline", e.target.value)}
                />
              </div>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    CTA primário
                  </Label>
                  <Input
                    value={config.ctaFinalPrimaryText}
                    onChange={(e) =>
                      update("ctaFinalPrimaryText", e.target.value)
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">
                    CTA secundário (Pro)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={config.ctaFinalSecondaryText}
                      onChange={(e) =>
                        update("ctaFinalSecondaryText", e.target.value)
                      }
                    />
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <Switch
                        checked={config.ctaFinalSecondaryEnabled}
                        onCheckedChange={(v) =>
                          update("ctaFinalSecondaryEnabled", v)
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Exibir
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <CustomCodeField
                value={config.ctaFinalCustomCode}
                onChange={(v) => update("ctaFinalCustomCode", v)}
                sectionName="CTA Final"
              />
            </AccordionContent>
          </AccordionItem>
        </Accordion>

        {/* Botão salvar fixo no rodapé */}
        {isDirty && (
          <div className="sticky bottom-6 flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="shadow-2xl font-bold gap-2"
              style={{
                background: "linear-gradient(135deg, #FFB800, #FF8A00)",
                color: "#0B0F1A",
                border: "none",
              }}
            >
              <Save size={16} />
              {updateMutation.isPending
                ? "Salvando..."
                : "Salvar alterações"}
            </Button>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
