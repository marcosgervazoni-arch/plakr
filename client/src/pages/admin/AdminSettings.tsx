import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  Smartphone,
  Target,
  Users,
  XCircle,
  ChevronRight,
  FlaskConical,
  MessageSquare,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const utils = trpc.useUtils();

  const [restrictedInviteMessage, setRestrictedInviteMessage] = useState("");
  const [cobaiaPoolId, setCobaiaPoolId] = useState<string>("");
  const [stripeKeys, setStripeKeys] = useState({ publishableKey: "", secretKey: "", webhookSecret: "" });
  const [showStripeSecret, setShowStripeSecret] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);

  const [form, setForm] = useState({
    freeMaxParticipants: 50,
    freeMaxPools: 2,
    poolArchiveDays: 10,
    defaultScoringExact: 10,
    defaultScoringCorrect: 5,
    defaultScoringBonusGoals: 3,
    defaultScoringBonusDiff: 3,
    defaultScoringBonusUpset: 1,
    defaultScoringBonusOneTeam: 2,
    defaultScoringBonusLandslide: 5,
    defaultLandslideMinDiff: 4,
    defaultZebraThreshold: 75,
    stripePriceIdPro: "",
    stripePriceIdProAnnual: "",
    stripePriceIdUnlimited: "",
    stripePriceIdUnlimitedAnnual: "",
    stripeMonthlyPrice: 2990,
    stripeProAnnualPrice: 39900,
    stripeUnlimitedMonthlyPrice: 8990,
    stripeUnlimitedAnnualPrice: 89900,
  });

  const [pushForm, setPushForm] = useState({
    vapidPublicKey: "",
    vapidPrivateKey: "",
    vapidEmail: "",
    pushEnabled: false,
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [allSaved, setAllSaved] = useState(false);

  useEffect(() => {
    if (settings) {
      setForm({
        freeMaxParticipants: settings.freeMaxParticipants,
        freeMaxPools: settings.freeMaxPools,
        poolArchiveDays: settings.poolArchiveDays,
        defaultScoringExact: settings.defaultScoringExact,
        defaultScoringCorrect: settings.defaultScoringCorrect,
        defaultScoringBonusGoals: settings.defaultScoringBonusGoals,
        defaultScoringBonusDiff: settings.defaultScoringBonusDiff,
        defaultScoringBonusUpset: settings.defaultScoringBonusUpset,
        defaultScoringBonusOneTeam: (settings as any).defaultScoringBonusOneTeam ?? 2,
        defaultScoringBonusLandslide: (settings as any).defaultScoringBonusLandslide ?? 5,
        defaultLandslideMinDiff: (settings as any).defaultLandslideMinDiff ?? 4,
        defaultZebraThreshold: (settings as any).defaultZebraThreshold ?? 75,
        stripePriceIdPro: settings.stripePriceIdPro ?? "",
        stripePriceIdProAnnual: (settings as any).stripePriceIdProAnnual ?? "",
        stripePriceIdUnlimited: (settings as any).stripePriceIdUnlimited ?? "",
        stripePriceIdUnlimitedAnnual: (settings as any).stripePriceIdUnlimitedAnnual ?? "",
        stripeMonthlyPrice: settings.stripeMonthlyPrice ?? 2990,
        stripeProAnnualPrice: (settings as any).stripeProAnnualPrice ?? 39900,
        stripeUnlimitedMonthlyPrice: (settings as any).stripeUnlimitedMonthlyPrice ?? 8990,
        stripeUnlimitedAnnualPrice: (settings as any).stripeUnlimitedAnnualPrice ?? 89900,
      });
      setPushForm({
        vapidPublicKey: (settings as any).vapidPublicKey ?? "",
        vapidPrivateKey: (settings as any).vapidPrivateKey ?? "",
        vapidEmail: (settings as any).vapidEmail ?? "",
        pushEnabled: (settings as any).pushEnabled ?? false,
      });
      setRestrictedInviteMessage((settings as any).restrictedInviteMessage ?? "");
      setCobaiaPoolId((settings as any).cobaiaPoolId?.toString() ?? "");
      setStripeKeys({
        publishableKey: (settings as any).stripePublishableKey ?? "",
        secretKey: (settings as any).stripeSecretKey ? "••••••••••••••••••••" : "",
        webhookSecret: (settings as any).stripeWebhookSecret ? "••••••••••••••••••••" : "",
      });
    }
  }, [settings]);

  const updateMutation = trpc.platform.updateSettings.useMutation({
    onSuccess: () => {
      utils.platform.getSettings.invalidate();
      toast.success("Configurações salvas com sucesso.");
      setAllSaved(true);
      setTimeout(() => setAllSaved(false), 3000);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSaveAll = () => {
    const secretToSave = stripeKeys.secretKey && !stripeKeys.secretKey.startsWith("•") ? stripeKeys.secretKey : undefined;
    const webhookSecretToSave = stripeKeys.webhookSecret && !stripeKeys.webhookSecret.startsWith("•") ? stripeKeys.webhookSecret : undefined;
    updateMutation.mutate({
      ...form,
      ...pushForm,
      restrictedInviteMessage: restrictedInviteMessage.trim() || null,
      cobaiaPoolId: cobaiaPoolId.trim() ? parseInt(cobaiaPoolId.trim(), 10) : null,
      stripePublishableKey: stripeKeys.publishableKey || undefined,
      stripeSecretKey: secretToSave,
      stripeWebhookSecret: webhookSecretToSave,
    });
  };

  const numField = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: parseInt(e.target.value) || 0 })),
    type: "number" as const,
    min: 0,
    className: "font-mono",
  });

  const strField = (key: keyof typeof form) => ({
    value: form[key] as string,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  const stripeConfigured = form.stripePriceIdPro.startsWith("price_") && form.stripePriceIdUnlimited.startsWith("price_");
  const pushConfigured = pushForm.vapidPublicKey.length > 10;

  const generateVapidMutation = trpc.platform.generateVapidKeys.useMutation({
    onSuccess: (keys) => {
      setPushForm((p) => ({ ...p, vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey }));
      toast.success("Novas VAPID keys geradas! Clique em Salvar para aplicar.");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const isSaving = updateMutation.isPending;

  // Badge de status do Stripe
  const stripeBadge = stripeKeys.publishableKey.startsWith("pk_live_") ? (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Produção ativa</Badge>
  ) : stripeKeys.publishableKey.startsWith("pk_test_") ? (
    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs">Modo teste</Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground text-xs">Não configurado</Badge>
  );

  const pushBadge = pushConfigured ? (
    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1">
      <CheckCircle2 className="h-3 w-3" /> Configurado
    </Badge>
  ) : (
    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs gap-1">
      <XCircle className="h-3 w-3" /> Sem VAPID
    </Badge>
  );

  return (
    <AdminLayout activeSection="settings">
      <div className="space-y-6">
        {/* Header com botão único de salvar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand/10 shrink-0">
              <Settings className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Configurações</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Parâmetros globais da plataforma Plakr!</p>
            </div>
          </div>
          <Button
            className={`gap-2 shrink-0 transition-all duration-300 ${allSaved ? "bg-green-600 hover:bg-green-700" : "bg-brand hover:bg-brand/90"}`}
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : allSaved ? <CheckCircle2 className="h-4 w-4" /> : <Save className="h-4 w-4" />}
            <span className="hidden sm:inline">{allSaved ? "Salvo!" : "Salvar"}</span>
            <span className="sm:hidden">{allSaved ? "✓" : "Salvar"}</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Accordion type="single" collapsible className="space-y-2">

            {/* ══════════════════════════════════════════════════════════════
                GRUPO 1 — MONETIZAÇÃO E PAGAMENTOS
            ══════════════════════════════════════════════════════════════ */}
            <AccordionItem value="monetizacao" className="border border-brand/20 rounded-xl overflow-hidden bg-brand/5">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-brand/10 [&[data-state=open]]:bg-brand/10 [&>svg]:text-brand">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <CreditCard className="h-4 w-4 text-brand shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">Monetização e Pagamentos</p>
                    <p className="text-xs text-muted-foreground font-normal">Stripe, Price IDs e chaves de API</p>
                  </div>
                  <div className="ml-2 shrink-0">{stripeBadge}</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2 space-y-5">
                {/* Stripe — Chaves de API */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stripe — Chaves de API</p>
                    <Button variant="outline" size="sm" asChild className="h-7 text-xs gap-1">
                      <a href="/admin/pricing">Price IDs <ChevronRight className="h-3 w-3" /></a>
                    </Button>
                  </div>
                  <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-400">
                    <strong>Como obter as chaves:</strong> Acesse <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="underline">dashboard.stripe.com → Desenvolvedores → Chaves da API</a>. Use as <strong>Chaves padrão</strong>. A publicável começa com <code>pk_live_</code> e a secreta com <code>sk_live_</code>.
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1.5">
                      <Label>Chave Publicável <span className="text-muted-foreground font-normal">(pk_live_...)</span></Label>
                      <Input value={stripeKeys.publishableKey} onChange={e => setStripeKeys(k => ({ ...k, publishableKey: e.target.value }))} placeholder="pk_live_..." className="font-mono text-xs" />
                      <p className="text-xs text-muted-foreground">Usada no frontend para inicializar o Stripe.js</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Chave Secreta <span className="text-muted-foreground font-normal">(sk_live_...)</span></Label>
                      <div className="flex gap-2">
                        <Input type={showStripeSecret ? "text" : "password"} value={stripeKeys.secretKey} onChange={e => setStripeKeys(k => ({ ...k, secretKey: e.target.value }))} placeholder="sk_live_..." className="font-mono text-xs flex-1" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowStripeSecret(s => !s)} className="shrink-0">{showStripeSecret ? "Ocultar" : "Mostrar"}</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Usada no servidor para criar sessões de pagamento. Nunca compartilhe esta chave.</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Webhook Secret <span className="text-muted-foreground font-normal">(whsec_...)</span></Label>
                      <div className="flex gap-2">
                        <Input type={showWebhookSecret ? "text" : "password"} value={stripeKeys.webhookSecret} onChange={e => setStripeKeys(k => ({ ...k, webhookSecret: e.target.value }))} placeholder="whsec_..." className="font-mono text-xs flex-1" />
                        <Button type="button" variant="outline" size="sm" onClick={() => setShowWebhookSecret(s => !s)} className="shrink-0">{showWebhookSecret ? "Ocultar" : "Mostrar"}</Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Obtido em Stripe → Desenvolvedores → Webhooks → seu endpoint → <strong>Signing secret</strong>.</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Price IDs */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Price IDs dos Planos</p>
                    {stripeConfigured ? (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs gap-1"><CheckCircle2 className="h-3 w-3" /> Configurado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 text-xs">Incompleto</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Pro — Mensal</Label>
                      <Input {...strField("stripePriceIdPro")} placeholder="price_..." className="font-mono text-xs" />
                      <Input {...numField("stripeMonthlyPrice")} placeholder="2990" className="font-mono text-xs mt-1" />
                      <p className="text-xs text-muted-foreground">Price ID + valor em centavos (ex: 2990 = R$29,90)</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Pro — Anual</Label>
                      <Input {...strField("stripePriceIdProAnnual")} placeholder="price_..." className="font-mono text-xs" />
                      <Input {...numField("stripeProAnnualPrice")} placeholder="39900" className="font-mono text-xs mt-1" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unlimited — Mensal</Label>
                      <Input {...strField("stripePriceIdUnlimited")} placeholder="price_..." className="font-mono text-xs" />
                      <Input {...numField("stripeUnlimitedMonthlyPrice")} placeholder="8990" className="font-mono text-xs mt-1" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Unlimited — Anual</Label>
                      <Input {...strField("stripePriceIdUnlimitedAnnual")} placeholder="price_..." className="font-mono text-xs" />
                      <Input {...numField("stripeUnlimitedAnnualPrice")} placeholder="89900" className="font-mono text-xs mt-1" />
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ══════════════════════════════════════════════════════════════
                GRUPO 2 — REGRAS E LIMITES
            ══════════════════════════════════════════════════════════════ */}
            <AccordionItem value="regras" className="border border-border/50 rounded-xl overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20 [&>svg]:text-muted-foreground">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Target className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">Regras e Limites</p>
                    <p className="text-xs text-muted-foreground font-normal">Pontuação padrão, limites do plano gratuito e cotas</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2 space-y-5">
                {/* Limites do plano gratuito */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Limites do Plano Gratuito</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Controla o que usuários sem assinatura podem fazer</p>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1.5">
                      <Label>Máx. Participantes por Bolão</Label>
                      <Input {...numField("freeMaxParticipants")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Máx. Bolões por Usuário</Label>
                      <Input {...numField("freeMaxPools")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Dias até Arquivamento</Label>
                      <Input {...numField("poolArchiveDays")} />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Pontuação padrão */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Target className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pontuação Padrão (novos bolões)</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Valores aplicados automaticamente ao criar um bolão. Cada bolão pode personalizar esses valores.</p>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">Pontuação Base</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Placar Exato</Label>
                        <Input {...numField("defaultScoringExact")} />
                        <p className="text-xs text-muted-foreground">Acertou o placar exato</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Resultado Correto</Label>
                        <Input {...numField("defaultScoringCorrect")} />
                        <p className="text-xs text-muted-foreground">Acertou vitória/empate/derrota</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">Bônus</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label>Bônus Gols Totais</Label>
                        <Input {...numField("defaultScoringBonusGoals")} />
                        <p className="text-xs text-muted-foreground">Acertou total de gols</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bônus Diferença</Label>
                        <Input {...numField("defaultScoringBonusDiff")} />
                        <p className="text-xs text-muted-foreground">Acertou saldo de gols</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bônus Zebra</Label>
                        <Input {...numField("defaultScoringBonusUpset")} />
                        <p className="text-xs text-muted-foreground">Acertou resultado improvável</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bônus Gols de 1 Time</Label>
                        <Input {...numField("defaultScoringBonusOneTeam")} />
                        <p className="text-xs text-muted-foreground">Acertou gols de um time</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Bônus Goleada</Label>
                        <Input {...numField("defaultScoringBonusLandslide")} />
                        <p className="text-xs text-muted-foreground">Acertou resultado de goleada</p>
                      </div>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-3">Limiares de Critérios Especiais</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label>Diff. mínima para Goleada (gols)</Label>
                        <Input {...numField("defaultLandslideMinDiff")} min={1} max={10} />
                        <p className="text-xs text-muted-foreground">Diferença de gols para ativar bônus goleada (padrão: 4)</p>
                      </div>
                      <div className="space-y-1.5">
                        <Label>Limiar de Zebra (%)</Label>
                        <Input {...numField("defaultZebraThreshold")} min={50} max={100} />
                        <p className="text-xs text-muted-foreground">% de apostadores no favorito para considerar zebra (padrão: 75%)</p>
                      </div>
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ══════════════════════════════════════════════════════════════
                GRUPO 3 — NOTIFICAÇÕES
            ══════════════════════════════════════════════════════════════ */}
            <AccordionItem value="notificacoes" className="border border-border/50 rounded-xl overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20 [&>svg]:text-muted-foreground">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Smartphone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">Notificações Push</p>
                    <p className="text-xs text-muted-foreground font-normal">VAPID keys e canal Web Push</p>
                  </div>
                  <div className="ml-2 shrink-0">{pushBadge}</div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2 space-y-4">
                {/* Toggle ativar push */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50">
                  <div>
                    <p className="text-sm font-medium">Ativar canal push</p>
                    <p className="text-xs text-muted-foreground">Quando desativado, nenhuma notificação push será enviada mesmo com keys configuradas</p>
                  </div>
                  <Switch checked={pushForm.pushEnabled} onCheckedChange={(v) => setPushForm((p) => ({ ...p, pushEnabled: v }))} disabled={!pushConfigured} />
                </div>

                {/* E-mail VAPID */}
                <div className="space-y-1.5">
                  <Label>E-mail de contato VAPID</Label>
                  <Input type="email" placeholder="suporte@plakr.com.br" value={pushForm.vapidEmail} onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPushForm((p) => ({ ...p, vapidEmail: e.target.value }))} className={pushConfigured && !pushForm.vapidEmail ? "border-yellow-500/60 focus-visible:ring-yellow-500/40" : ""} />
                  {pushConfigured && !pushForm.vapidEmail ? (
                    <p className="text-xs text-yellow-400">⚠️ Recomendado para conformidade com o protocolo VAPID.</p>
                  ) : (
                    <p className="text-xs text-muted-foreground">Usado pelo protocolo VAPID para contato. Não é exibido aos usuários.</p>
                  )}
                </div>

                {/* VAPID Keys */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">VAPID Keys</p>
                    <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={() => generateVapidMutation.mutate()} disabled={generateVapidMutation.isPending}>
                      {generateVapidMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                      {pushConfigured ? "Regen. Keys" : "Gerar Keys"}
                    </Button>
                  </div>
                  {pushConfigured ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Chave Pública</Label>
                        <div className="font-mono text-xs bg-surface/50 border border-border/40 rounded p-2 break-all select-all">{pushForm.vapidPublicKey}</div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Chave Privada (confidencial)</Label>
                          <button type="button" className="text-xs text-brand hover:underline" onClick={() => setShowPrivateKey((v) => !v)}>{showPrivateKey ? "Ocultar" : "Revelar"}</button>
                        </div>
                        <div className="font-mono text-xs bg-surface/50 border border-border/40 rounded p-2 break-all select-all">{showPrivateKey ? pushForm.vapidPrivateKey : "•".repeat(43)}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Nenhuma VAPID key configurada. Clique em <strong>Gerar Keys</strong> para criar um par.</p>
                    </div>
                  )}
                </div>

                {/* Instruções */}
                <div className="rounded-lg border border-border/50 bg-surface/50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como ativar o Push</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Clique em <strong>Gerar Keys</strong> para criar o par VAPID</li>
                    <li>Informe o e-mail de contato VAPID</li>
                    <li>Ative o toggle <strong>Ativar canal push</strong></li>
                    <li>Clique em <strong>Salvar</strong> (botão no topo da página)</li>
                    <li>Os usuários poderão ativar push em Preferências de Notificação</li>
                  </ol>
                  <p className="text-xs text-yellow-400 mt-2">⚠️ Ao regenerar as keys, todas as assinaturas push existentes serão invalidadas.</p>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ══════════════════════════════════════════════════════════════
                GRUPO 4 — MENSAGENS E BADGES
            ══════════════════════════════════════════════════════════════ */}
            <AccordionItem value="mensagens" className="border border-border/50 rounded-xl overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20 [&>svg]:text-muted-foreground">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <MessageSquare className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">Mensagens e Badges</p>
                    <p className="text-xs text-muted-foreground font-normal">Textos da plataforma e badges de lançamento</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-5 pb-5 pt-2 space-y-5">
                {/* Mensagens da Plataforma */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensagens da Plataforma</p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Aviso de convite restrito</Label>
                    <p className="text-xs text-muted-foreground">Exibido quando o organizador configurou o bolão para que apenas ele possa convidar. Deixe vazio para usar o texto padrão: <em>"Convites gerenciados pelo organizador."</em></p>
                    <Input value={restrictedInviteMessage} onChange={(e) => setRestrictedInviteMessage(e.target.value)} placeholder="Convites gerenciados pelo organizador." maxLength={500} />
                    <p className="text-xs text-muted-foreground text-right">{restrictedInviteMessage.length}/500</p>
                  </div>
                </div>

                <Separator />

                {/* Badges Exclusivos */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="h-3.5 w-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Badges Exclusivos de Lançamento</p>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🏆</span>
                      <Label className="text-sm font-semibold">Chegou Cedo</Label>
                      <Badge variant="outline" className="text-xs">Automático</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Atribuído automaticamente aos primeiros 100 usuários cadastrados (userId ≤ 100). Nenhuma configuração necessária — o critério é definido no badge cadastrado em <a href="/admin/badges" className="text-primary hover:underline">Badges</a>.</p>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">🧪</span>
                      <Label className="text-sm font-semibold">Cobaia</Label>
                      <Badge variant="outline" className="text-xs">Configurável</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Atribuído a todos os participantes do primeiro bolão válido após o lançamento. Informe o <strong>ID do bolão</strong> abaixo.</p>
                    <div className="flex gap-2 items-center">
                      <Input type="number" min={1} placeholder="ID do bolão (ex: 42)" value={cobaiaPoolId} onChange={(e) => setCobaiaPoolId(e.target.value)} className="max-w-[200px]" />
                      {cobaiaPoolId && <span className="text-xs text-muted-foreground">Bolão #{cobaiaPoolId} configurado como bolão Cobaia</span>}
                    </div>
                    <p className="text-xs text-muted-foreground/60">A atribuição ocorre automaticamente quando o bolão é arquivado/finalizado. Salve as configurações para ativar.</p>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
}
