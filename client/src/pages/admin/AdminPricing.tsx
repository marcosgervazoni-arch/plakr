import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CreditCard,
  ExternalLink,
  Gift,
  Info,
  Loader2,
  Save,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PricingForm {
  // Price IDs Stripe
  stripePriceIdPro: string;
  stripePriceIdProAnnual: string;
  stripePriceIdUnlimited: string;
  stripePriceIdUnlimitedAnnual: string;
  // Preços exibidos na UI (em centavos)
  stripeMonthlyPrice: number;
  stripeProAnnualPrice: number;
  stripeUnlimitedMonthlyPrice: number;
  stripeUnlimitedAnnualPrice: number;
}

// ─── Componente de campo de preço ─────────────────────────────────────────────

function PriceField({
  label,
  value,
  onChange,
  placeholder,
  hint,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder: string;
  hint: string;
}) {
  const display = (value / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  return (
    <div className="space-y-1.5">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={placeholder}
          className="font-mono pr-24"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-mono pointer-events-none">
          {display}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// ─── Componente de campo de Price ID ─────────────────────────────────────────

function PriceIdField({
  label,
  value,
  onChange,
  required,
  hint,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  hint: string;
}) {
  const isValid = value.startsWith("price_");
  const isEmpty = value.trim() === "";

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <Label className="text-sm font-medium">{label}</Label>
        {required && <span className="text-red-400 text-xs">*</span>}
        {!isEmpty && (
          <Badge
            variant="outline"
            className={`text-xs h-4 px-1.5 ${
              isValid
                ? "border-green-500/40 text-green-400"
                : "border-red-500/40 text-red-400"
            }`}
          >
            {isValid ? "✓ válido" : "formato inválido"}
          </Badge>
        )}
      </div>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="price_1ABC..."
        className={`font-mono text-sm ${
          !isEmpty && !isValid ? "border-red-500/50" : ""
        }`}
      />
      <p className="text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// ─── Acordeão de plano ────────────────────────────────────────────────────────

function PlanAccordion({
  id,
  icon: Icon,
  title,
  subtitle,
  accentColor,
  badgeLabel,
  isOpen,
  onToggle,
  children,
  isConfigured,
}: {
  id: string;
  icon: React.ElementType;
  title: string;
  subtitle: string;
  accentColor: string;
  badgeLabel?: string;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  isConfigured?: boolean;
}) {
  return (
    <div className="rounded-xl border border-border/60 overflow-hidden bg-card/40">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors text-left"
      >
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${accentColor}`}
        >
          <Icon className="h-5 w-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-sm">{title}</span>
            {badgeLabel && (
              <Badge
                variant="outline"
                className="text-xs border-brand/40 text-brand"
              >
                {badgeLabel}
              </Badge>
            )}
            {isConfigured !== undefined && (
              <Badge
                variant="outline"
                className={`text-xs ${
                  isConfigured
                    ? "border-green-500/40 text-green-400"
                    : "border-yellow-500/40 text-yellow-400"
                }`}
              >
                {isConfigured ? (
                  <>
                    <CheckCircle2 className="h-2.5 w-2.5 mr-1" />
                    Configurado
                  </>
                ) : (
                  <>
                    <Info className="h-2.5 w-2.5 mr-1" />
                    Pendente
                  </>
                )}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
        {isOpen ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      {/* Body */}
      {isOpen && (
        <div className="border-t border-border/40 p-4 space-y-5 bg-background/20">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function AdminPricing() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const updateSettings = trpc.platform.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Preços salvos com sucesso!");
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const [form, setForm] = useState<PricingForm>({
    stripePriceIdPro: "",
    stripePriceIdProAnnual: "",
    stripePriceIdUnlimited: "",
    stripePriceIdUnlimitedAnnual: "",
    stripeMonthlyPrice: 3990,
    stripeProAnnualPrice: 39900,
    stripeUnlimitedMonthlyPrice: 8990,
    stripeUnlimitedAnnualPrice: 89900,
  });

  // Acordeões abertos por padrão: Pro e Ilimitado (os que têm Price IDs)
  const [openPlans, setOpenPlans] = useState<string[]>(["pro", "unlimited"]);

  useEffect(() => {
    if (settings) {
      setForm({
        stripePriceIdPro: settings.stripePriceIdPro ?? "",
        stripePriceIdProAnnual: (settings as any).stripePriceIdProAnnual ?? "",
        stripePriceIdUnlimited: (settings as any).stripePriceIdUnlimited ?? "",
        stripePriceIdUnlimitedAnnual:
          (settings as any).stripePriceIdUnlimitedAnnual ?? "",
        stripeMonthlyPrice: settings.stripeMonthlyPrice ?? 3990,
        stripeProAnnualPrice: (settings as any).stripeProAnnualPrice ?? 39900,
        stripeUnlimitedMonthlyPrice:
          (settings as any).stripeUnlimitedMonthlyPrice ?? 8990,
        stripeUnlimitedAnnualPrice:
          (settings as any).stripeUnlimitedAnnualPrice ?? 89900,
      });
    }
  }, [settings]);

  const togglePlan = (id: string) => {
    setOpenPlans((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const setField = <K extends keyof PricingForm>(
    key: K,
    value: PricingForm[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    updateSettings.mutate({
      stripePriceIdPro: form.stripePriceIdPro || undefined,
      stripePriceIdProAnnual: form.stripePriceIdProAnnual || undefined,
      stripePriceIdUnlimited: form.stripePriceIdUnlimited || undefined,
      stripePriceIdUnlimitedAnnual:
        form.stripePriceIdUnlimitedAnnual || undefined,
      stripeMonthlyPrice: form.stripeMonthlyPrice,
      stripeProAnnualPrice: form.stripeProAnnualPrice,
      stripeUnlimitedMonthlyPrice: form.stripeUnlimitedMonthlyPrice,
      stripeUnlimitedAnnualPrice: form.stripeUnlimitedAnnualPrice,
    });
  };

  const proConfigured =
    form.stripePriceIdPro.startsWith("price_") &&
    form.stripePriceIdUnlimited.startsWith("price_");

  if (isLoading) {
    return (
      <AdminLayout activeSection="pricing">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout activeSection="pricing">
      <div className="max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold font-display">
              Configuração de Preços
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie os Price IDs do Stripe e os valores exibidos na tela de
              upgrade.
            </p>
          </div>
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="shrink-0"
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar tudo
          </Button>
        </div>

        {/* Status geral */}
        <div
          className={`flex items-center gap-3 rounded-lg border p-3 text-sm ${
            proConfigured
              ? "border-green-500/30 bg-green-500/5 text-green-400"
              : "border-yellow-500/30 bg-yellow-500/5 text-yellow-400"
          }`}
        >
          <CreditCard className="h-4 w-4 shrink-0" />
          {proConfigured
            ? "Stripe configurado — checkout ativo para Pro e Ilimitado."
            : "Configure os Price IDs obrigatórios (Pro Mensal e Ilimitado Mensal) para ativar o checkout."}
        </div>

        {/* ── Plano Gratuito ─────────────────────────────────────────────── */}
        <PlanAccordion
          id="free"
          icon={Gift}
          title="Plano Gratuito"
          subtitle="Sem cobrança — sem Price ID necessário"
          accentColor="bg-muted-foreground/50"
          isOpen={openPlans.includes("free")}
          onToggle={() => togglePlan("free")}
        >
          <div className="rounded-lg bg-muted/30 p-4 text-sm text-muted-foreground space-y-1">
            <p className="font-medium text-foreground">Limites do plano gratuito</p>
            <p>Esses limites são configurados em <strong>Configurações → Plataforma</strong>.</p>
            <ul className="list-disc list-inside space-y-0.5 mt-2">
              <li>Máximo de bolões ativos</li>
              <li>Máximo de participantes por bolão</li>
              <li>Dias até arquivamento automático</li>
            </ul>
          </div>
        </PlanAccordion>

        {/* ── Plano Pro ──────────────────────────────────────────────────── */}
        <PlanAccordion
          id="pro"
          icon={Star}
          title="Plano Pro"
          subtitle="Bolões ilimitados · Pontuação customizável · Campeonatos personalizados"
          accentColor="bg-brand"
          badgeLabel="Popular"
          isOpen={openPlans.includes("pro")}
          onToggle={() => togglePlan("pro")}
          isConfigured={
            form.stripePriceIdPro.startsWith("price_")
          }
        >
          {/* Price IDs */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Price IDs — Stripe
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PriceIdField
                label="Pro Mensal"
                value={form.stripePriceIdPro}
                onChange={(v) => setField("stripePriceIdPro", v)}
                required
                hint="Assinatura recorrente mensal"
              />
              <PriceIdField
                label="Pro Anual"
                value={form.stripePriceIdProAnnual}
                onChange={(v) => setField("stripePriceIdProAnnual", v)}
                hint="Assinatura recorrente anual (opcional)"
              />
            </div>
          </div>

          <Separator />

          {/* Preços de exibição */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Preços exibidos na tela de upgrade
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PriceField
                label="Pro Mensal"
                value={form.stripeMonthlyPrice}
                onChange={(v) => setField("stripeMonthlyPrice", v)}
                placeholder="3990"
                hint="Valor em centavos. Ex: 3990 = R$ 39,90"
              />
              <PriceField
                label="Pro Anual"
                value={form.stripeProAnnualPrice}
                onChange={(v) => setField("stripeProAnnualPrice", v)}
                placeholder="39900"
                hint="Valor em centavos. Ex: 39900 = R$ 399,00"
              />
            </div>
          </div>
        </PlanAccordion>

        {/* ── Plano Ilimitado ────────────────────────────────────────────── */}
        <PlanAccordion
          id="unlimited"
          icon={Zap}
          title="Plano Ilimitado"
          subtitle="Tudo do Pro · Participantes ilimitados · API de resultados automática"
          accentColor="bg-amber-500"
          isOpen={openPlans.includes("unlimited")}
          onToggle={() => togglePlan("unlimited")}
          isConfigured={
            form.stripePriceIdUnlimited.startsWith("price_")
          }
        >
          {/* Price IDs */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Price IDs — Stripe
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PriceIdField
                label="Ilimitado Mensal"
                value={form.stripePriceIdUnlimited}
                onChange={(v) => setField("stripePriceIdUnlimited", v)}
                required
                hint="Assinatura recorrente mensal"
              />
              <PriceIdField
                label="Ilimitado Anual"
                value={form.stripePriceIdUnlimitedAnnual}
                onChange={(v) => setField("stripePriceIdUnlimitedAnnual", v)}
                hint="Assinatura recorrente anual (opcional)"
              />
            </div>
          </div>

          <Separator />

          {/* Preços de exibição */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Preços exibidos na tela de upgrade
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <PriceField
                label="Ilimitado Mensal"
                value={form.stripeUnlimitedMonthlyPrice}
                onChange={(v) => setField("stripeUnlimitedMonthlyPrice", v)}
                placeholder="8990"
                hint="Valor em centavos. Ex: 8990 = R$ 89,90"
              />
              <PriceField
                label="Ilimitado Anual"
                value={form.stripeUnlimitedAnnualPrice}
                onChange={(v) => setField("stripeUnlimitedAnnualPrice", v)}
                placeholder="89900"
                hint="Valor em centavos. Ex: 89900 = R$ 899,00"
              />
            </div>
          </div>
        </PlanAccordion>

        {/* ── Como obter os Price IDs ────────────────────────────────────── */}
        <div className="rounded-lg border border-border/50 bg-surface/50 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-brand" />
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Como obter os Price IDs
            </p>
          </div>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            <li>
              Acesse{" "}
              <a
                href="https://dashboard.stripe.com/products"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand hover:underline inline-flex items-center gap-1"
              >
                dashboard.stripe.com/products{" "}
                <ExternalLink className="h-3 w-3" />
              </a>
            </li>
            <li>
              Crie os produtos <strong>Plakr! Pro</strong> e{" "}
              <strong>Plakr! Ilimitado</strong>
            </li>
            <li>Para cada produto, adicione 2 preços: mensal e anual</li>
            <li>
              Copie cada <strong>Price ID</strong> (começa com{" "}
              <code className="bg-surface px-1 rounded text-xs">price_</code>)
            </li>
            <li>Cole nos campos acima e clique em Salvar</li>
          </ol>
          <p className="text-xs text-muted-foreground pt-1">
            Para testes, use o{" "}
            <a
              href="https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVEQ5dXRQVDFoY0ZaTEtHLDE3NzQ3Mzk4MTMv100kAUqlLlS"
              target="_blank"
              rel="noopener noreferrer"
              className="text-brand hover:underline inline-flex items-center gap-1"
            >
              Sandbox Stripe <ExternalLink className="h-3 w-3" />
            </a>{" "}
            com cartão{" "}
            <code className="bg-surface px-1 rounded text-xs">
              4242 4242 4242 4242
            </code>
          </p>
        </div>

        {/* Botão salvar inferior */}
        <div className="flex justify-end pt-2">
          <Button
            onClick={handleSave}
            disabled={updateSettings.isPending}
            size="lg"
          >
            {updateSettings.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar configurações de preço
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
