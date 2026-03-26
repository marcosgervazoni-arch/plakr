/**
 * Admin — Página de Vendas
 * Controle total das seções e conteúdo da landing page do Plakr!
 * Governança: apenas super admins têm acesso (garantido pelo AdminLayout).
 */
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Crown,
  Eye,
  EyeOff,
  ExternalLink,
  LayoutTemplate,
  Save,
  RotateCcw,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface LandingConfig {
  // Hero
  heroHeadline: string;
  heroSubheadline: string;
  heroBadgeText: string;
  heroBadgeEnabled: boolean;
  heroCountdownEnabled: boolean;
  heroCountdownDate: string;
  heroCtaPrimaryText: string;
  heroCtaSecondaryText: string;
  heroCtaSecondaryEnabled: boolean;
  // Diferencial Pro
  differentialHeadline: string;
  differentialBody: string;
  // CTA Final
  ctaFinalHeadline: string;
  ctaFinalPrimaryText: string;
  ctaFinalSecondaryText: string;
  ctaFinalSecondaryEnabled: boolean;
  // Seções (toggles)
  sectionCredibilityEnabled: boolean;
  sectionHowItWorksEnabled: boolean;
  sectionDifferentialEnabled: boolean;
  sectionFeaturesEnabled: boolean;
  sectionPlansEnabled: boolean;
  sectionFaqEnabled: boolean;
  sectionCtaFinalEnabled: boolean;
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
};

// ─── Componentes auxiliares ───────────────────────────────────────────────────

function SectionToggle({
  label,
  description,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="flex-1 pr-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <div className="flex items-center gap-2">
        {enabled ? (
          <Eye className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />
        )}
        <Switch checked={enabled} onCheckedChange={onChange} />
      </div>
    </div>
  );
}

function FormField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      {children}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminLandingPage() {
  const { data: serverConfig, isLoading, refetch } = trpc.landingPage.getConfig.useQuery();
  const updateMutation = trpc.landingPage.updateConfig.useMutation({
    onSuccess: () => {
      toast.success("Página de vendas atualizada com sucesso!");
      refetch();
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
        heroSubheadline: serverConfig.heroSubheadline ?? DEFAULTS.heroSubheadline,
        heroBadgeText: serverConfig.heroBadgeText ?? DEFAULTS.heroBadgeText,
        heroBadgeEnabled: serverConfig.heroBadgeEnabled ?? DEFAULTS.heroBadgeEnabled,
        heroCountdownEnabled: serverConfig.heroCountdownEnabled ?? DEFAULTS.heroCountdownEnabled,
        heroCountdownDate: serverConfig.heroCountdownDate ?? DEFAULTS.heroCountdownDate,
        heroCtaPrimaryText: serverConfig.heroCtaPrimaryText ?? DEFAULTS.heroCtaPrimaryText,
        heroCtaSecondaryText: serverConfig.heroCtaSecondaryText ?? DEFAULTS.heroCtaSecondaryText,
        heroCtaSecondaryEnabled: serverConfig.heroCtaSecondaryEnabled ?? DEFAULTS.heroCtaSecondaryEnabled,
        differentialHeadline: serverConfig.differentialHeadline ?? DEFAULTS.differentialHeadline,
        differentialBody: serverConfig.differentialBody ?? DEFAULTS.differentialBody,
        ctaFinalHeadline: serverConfig.ctaFinalHeadline ?? DEFAULTS.ctaFinalHeadline,
        ctaFinalPrimaryText: serverConfig.ctaFinalPrimaryText ?? DEFAULTS.ctaFinalPrimaryText,
        ctaFinalSecondaryText: serverConfig.ctaFinalSecondaryText ?? DEFAULTS.ctaFinalSecondaryText,
        ctaFinalSecondaryEnabled: serverConfig.ctaFinalSecondaryEnabled ?? DEFAULTS.ctaFinalSecondaryEnabled,
        sectionCredibilityEnabled: serverConfig.sectionCredibilityEnabled ?? DEFAULTS.sectionCredibilityEnabled,
        sectionHowItWorksEnabled: serverConfig.sectionHowItWorksEnabled ?? DEFAULTS.sectionHowItWorksEnabled,
        sectionDifferentialEnabled: serverConfig.sectionDifferentialEnabled ?? DEFAULTS.sectionDifferentialEnabled,
        sectionFeaturesEnabled: serverConfig.sectionFeaturesEnabled ?? DEFAULTS.sectionFeaturesEnabled,
        sectionPlansEnabled: serverConfig.sectionPlansEnabled ?? DEFAULTS.sectionPlansEnabled,
        sectionFaqEnabled: serverConfig.sectionFaqEnabled ?? DEFAULTS.sectionFaqEnabled,
        sectionCtaFinalEnabled: serverConfig.sectionCtaFinalEnabled ?? DEFAULTS.sectionCtaFinalEnabled,
      });
      setIsDirty(false);
    }
  }, [serverConfig]);

  const update = <K extends keyof LandingConfig>(key: K, value: LandingConfig[K]) => {
    setConfig((prev) => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateMutation.mutate(config);
    setIsDirty(false);
  };

  const handleReset = () => {
    setConfig(DEFAULTS);
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <AdminLayout activeSection="landing-page">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground text-sm">Carregando configurações...</div>
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
              Configure o conteúdo e a visibilidade de cada seção da landing page pública do Plakr!.
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <a href="/" target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5">
                <ExternalLink className="h-3.5 w-3.5" />
                Visualizar
              </Button>
            </a>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleReset}>
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
              {updateMutation.isPending ? "Salvando..." : isDirty ? "Salvar alterações" : "Salvo"}
            </Button>
          </div>
        </div>

        {isDirty && (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm"
            style={{ background: "rgba(255,184,0,0.08)", border: "1px solid rgba(255,184,0,0.25)", color: "#FFB800" }}>
            <span className="font-medium">Há alterações não salvas.</span>
            <span className="text-muted-foreground">Clique em "Salvar alterações" para publicar.</span>
          </div>
        )}

        {/* ── Visibilidade das Seções ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="h-4 w-4 text-brand" />
              Visibilidade das Seções
            </CardTitle>
            <CardDescription>
              Ative ou desative seções inteiras da landing page sem precisar alterar código.
            </CardDescription>
          </CardHeader>
          <CardContent className="divide-y divide-border/50">
            <SectionToggle
              label="Credibilidade — Campeonatos disponíveis"
              description="Faixa com os campeonatos globais suportados e o CTA de campeonato personalizado."
              enabled={config.sectionCredibilityEnabled}
              onChange={(v) => update("sectionCredibilityEnabled", v)}
            />
            <SectionToggle
              label="Como Funciona — Passo a passo"
              description="4 passos explicando como criar o bolão, convidar a galera e acompanhar o ranking."
              enabled={config.sectionHowItWorksEnabled}
              onChange={(v) => update("sectionHowItWorksEnabled", v)}
            />
            <SectionToggle
              label="Diferencial Pro — Campeonato Personalizado"
              description="Seção destacada mostrando o diferencial do plano Pro com o card de campeonato personalizado."
              enabled={config.sectionDifferentialEnabled}
              onChange={(v) => update("sectionDifferentialEnabled", v)}
            />
            <SectionToggle
              label="Funcionalidades — Grid de features"
              description="Grid com 9 cards de funcionalidades da plataforma."
              enabled={config.sectionFeaturesEnabled}
              onChange={(v) => update("sectionFeaturesEnabled", v)}
            />
            <SectionToggle
              label="Planos — Gratuito vs Pro"
              description="Tabela comparativa dos dois planos com CTAs de conversão."
              enabled={config.sectionPlansEnabled}
              onChange={(v) => update("sectionPlansEnabled", v)}
            />
            <SectionToggle
              label="FAQ — Perguntas frequentes"
              description="Accordion com 6 perguntas e respostas sobre a plataforma."
              enabled={config.sectionFaqEnabled}
              onChange={(v) => update("sectionFaqEnabled", v)}
            />
            <SectionToggle
              label="CTA Final — Chamada de conversão"
              description="Seção final de conversão com headline emocional e dois botões (Gratuito e Pro)."
              enabled={config.sectionCtaFinalEnabled}
              onChange={(v) => update("sectionCtaFinalEnabled", v)}
            />
          </CardContent>
        </Card>

        {/* ── Hero ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Hero — Primeira dobra</CardTitle>
            <CardDescription>
              O conteúdo mais importante da página. Aparece antes de qualquer scroll.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Headline principal" hint="Frase de impacto. Máx. 60 caracteres recomendado.">
              <Input
                value={config.heroHeadline}
                onChange={(e) => update("heroHeadline", e.target.value)}
                placeholder="Faça seu bolão com a galera"
              />
            </FormField>
            <FormField label="Subtítulo" hint="Complementa a headline. Máx. 160 caracteres recomendado.">
              <Textarea
                value={config.heroSubheadline}
                onChange={(e) => update("heroSubheadline", e.target.value)}
                rows={2}
                placeholder="Crie bolões para qualquer campeonato..."
              />
            </FormField>
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Badge de urgência (Copa do Mundo)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Faixa dourada acima da headline.</p>
              </div>
              <Switch
                checked={config.heroBadgeEnabled}
                onCheckedChange={(v) => update("heroBadgeEnabled", v)}
              />
            </div>
            {config.heroBadgeEnabled && (
              <FormField label="Texto do badge">
                <Input
                  value={config.heroBadgeText}
                  onChange={(e) => update("heroBadgeText", e.target.value)}
                  placeholder="FAÇA SEU BOLÃO PARA A COPA DO MUNDO"
                />
              </FormField>
            )}
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Contador regressivo</p>
                <p className="text-xs text-muted-foreground mt-0.5">Mostra dias/horas/min/seg até a data configurada.</p>
              </div>
              <Switch
                checked={config.heroCountdownEnabled}
                onCheckedChange={(v) => update("heroCountdownEnabled", v)}
              />
            </div>
            {config.heroCountdownEnabled && (
              <FormField label="Data alvo do contador" hint="Formato ISO 8601. Ex: 2026-06-11T16:00:00Z">
                <Input
                  value={config.heroCountdownDate}
                  onChange={(e) => update("heroCountdownDate", e.target.value)}
                  placeholder="2026-06-11T16:00:00Z"
                />
              </FormField>
            )}
            <Separator />
            <FormField label="Texto do CTA principal (gratuito)">
              <Input
                value={config.heroCtaPrimaryText}
                onChange={(e) => update("heroCtaPrimaryText", e.target.value)}
                placeholder="Criar bolão grátis"
              />
            </FormField>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">CTA secundário (Pro)</p>
                <p className="text-xs text-muted-foreground mt-0.5">Botão outline abaixo do CTA principal.</p>
              </div>
              <Switch
                checked={config.heroCtaSecondaryEnabled}
                onCheckedChange={(v) => update("heroCtaSecondaryEnabled", v)}
              />
            </div>
            {config.heroCtaSecondaryEnabled && (
              <FormField label="Texto do CTA secundário">
                <Input
                  value={config.heroCtaSecondaryText}
                  onChange={(e) => update("heroCtaSecondaryText", e.target.value)}
                  placeholder="Quero campeonato personalizado → Pro"
                />
              </FormField>
            )}
          </CardContent>
        </Card>

        {/* ── Diferencial Pro ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-brand" />
              Diferencial Pro — Campeonato Personalizado
            </CardTitle>
            <CardDescription>
              Seção de destaque do plano Pro. Aparece após o "Como Funciona".
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Headline da seção">
              <Input
                value={config.differentialHeadline}
                onChange={(e) => update("differentialHeadline", e.target.value)}
                placeholder="Seu campeonato. Suas regras."
              />
            </FormField>
            <FormField label="Corpo do texto" hint="Descrição completa do diferencial. 2-4 frases.">
              <Textarea
                value={config.differentialBody}
                onChange={(e) => update("differentialBody", e.target.value)}
                rows={4}
                placeholder="Com o Plakr! Pro, você não fica limitado..."
              />
            </FormField>
          </CardContent>
        </Card>

        {/* ── CTA Final ── */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">CTA Final — Chamada de conversão</CardTitle>
            <CardDescription>
              Última oportunidade de conversão antes do footer.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormField label="Headline do CTA final" hint="Frase emocional de fechamento.">
              <Textarea
                value={config.ctaFinalHeadline}
                onChange={(e) => update("ctaFinalHeadline", e.target.value)}
                rows={2}
                placeholder="A Copa do Mundo 2026 começa em junho..."
              />
            </FormField>
            <FormField label="Texto do botão principal (gratuito)">
              <Input
                value={config.ctaFinalPrimaryText}
                onChange={(e) => update("ctaFinalPrimaryText", e.target.value)}
                placeholder="Criar bolão grátis"
              />
            </FormField>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Botão secundário (Pro)</p>
              </div>
              <Switch
                checked={config.ctaFinalSecondaryEnabled}
                onCheckedChange={(v) => update("ctaFinalSecondaryEnabled", v)}
              />
            </div>
            {config.ctaFinalSecondaryEnabled && (
              <FormField label="Texto do botão secundário">
                <Input
                  value={config.ctaFinalSecondaryText}
                  onChange={(e) => update("ctaFinalSecondaryText", e.target.value)}
                  placeholder="Criar campeonato personalizado"
                />
              </FormField>
            )}
          </CardContent>
        </Card>

        {/* Botão salvar fixo no final */}
        <div className="flex justify-end gap-3 pb-8">
          <Button variant="outline" onClick={handleReset} className="gap-1.5">
            <RotateCcw className="h-3.5 w-3.5" />
            Restaurar padrões
          </Button>
          <Button
            onClick={handleSave}
            disabled={!isDirty || updateMutation.isPending}
            className="gap-1.5"
          >
            <Save className="h-3.5 w-3.5" />
            {updateMutation.isPending ? "Salvando..." : isDirty ? "Salvar alterações" : "Tudo salvo"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
