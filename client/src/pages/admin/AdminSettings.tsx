import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  RefreshCw,
  Save,
  Settings,
  Smartphone,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const utils = trpc.useUtils();

  const [restrictedInviteMessage, setRestrictedInviteMessage] = useState("");
  const [cobaiaPoolId, setCobaiaPoolId] = useState<string>("");

  const [form, setForm] = useState({
    // Limites do plano gratuito
    freeMaxParticipants: 50,
    freeMaxPools: 2,
    poolArchiveDays: 10,
    // Pontuação padrão
    defaultScoringExact: 10,
    defaultScoringCorrect: 5,
    defaultScoringBonusGoals: 3,
    defaultScoringBonusDiff: 3,
    defaultScoringBonusUpset: 1,
    defaultScoringBonusOneTeam: 2,
    defaultScoringBonusLandslide: 5,
    defaultLandslideMinDiff: 4,
    defaultZebraThreshold: 75,
    // Stripe
    stripePriceIdPro: "",
    stripePriceIdProAnnual: "",
    stripePriceIdUnlimited: "",
    stripePriceIdUnlimitedAnnual: "",
    stripeMonthlyPrice: 2990,
  });

  // Push / VAPID
  const [pushForm, setPushForm] = useState({
    vapidPublicKey: "",
    vapidPrivateKey: "",
    vapidEmail: "",
    pushEnabled: false,
  });
  const [showPrivateKey, setShowPrivateKey] = useState(false);

  // Estado de feedback visual após salvar
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
      });
      setPushForm({
        vapidPublicKey: (settings as any).vapidPublicKey ?? "",
        vapidPrivateKey: (settings as any).vapidPrivateKey ?? "",
        vapidEmail: (settings as any).vapidEmail ?? "",
        pushEnabled: (settings as any).pushEnabled ?? false,
      });
      setRestrictedInviteMessage((settings as any).restrictedInviteMessage ?? "");
      setCobaiaPoolId((settings as any).cobaiaPoolId?.toString() ?? "");
    }
  }, [settings]);

  // Mutation única que salva tudo de uma vez
  const updateMutation = trpc.platform.updateSettings.useMutation({
    onSuccess: () => {
      utils.platform.getSettings.invalidate();
      toast.success("Configurações salvas com sucesso.");
      setAllSaved(true);
      setTimeout(() => setAllSaved(false), 3000);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Salva form principal + pushForm + campos extras juntos
  const handleSaveAll = () => {
    updateMutation.mutate({
      ...form,
      ...pushForm,
      restrictedInviteMessage: restrictedInviteMessage.trim() || null,
      cobaiaPoolId: cobaiaPoolId.trim() ? parseInt(cobaiaPoolId.trim(), 10) : null,
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

  const stripeConfigured = form.stripePriceIdPro.startsWith("price_") &&
    form.stripePriceIdUnlimited.startsWith("price_");
  // S10: vapidPrivateKey nunca é retornada pelo backend por segurança.
  // pushConfigured verifica apenas vapidPublicKey para detectar se keys já existem no banco.
  const pushConfigured = pushForm.vapidPublicKey.length > 10;

  const generateVapidMutation = trpc.platform.generateVapidKeys.useMutation({
    onSuccess: (keys) => {
      setPushForm((p) => ({ ...p, vapidPublicKey: keys.publicKey, vapidPrivateKey: keys.privateKey }));
      toast.success("Novas VAPID keys geradas! Clique em Salvar para aplicar.");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const isSaving = updateMutation.isPending;

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
            className={`gap-2 shrink-0 transition-all duration-300 ${
              allSaved ? "bg-green-600 hover:bg-green-700" : "bg-brand hover:bg-brand/90"
            }`}
            onClick={handleSaveAll}
            disabled={isSaving || isLoading}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : allSaved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{allSaved ? "Salvo!" : "Salvar"}</span>
            <span className="sm:hidden">{allSaved ? "✓" : "Salvar"}</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-6">

            {/* ─── STRIPE / MONETIZAÇÃO ─────────────────────────────────────── */}
            <Card className="border-brand/30 bg-brand/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CreditCard className="h-4 w-4 text-brand" />
                    <CardTitle className="text-base">Stripe — Price IDs dos Planos</CardTitle>
                  </div>
                  {stripeConfigured ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 gap-1">
                      <XCircle className="h-3 w-3" /> Aguardando Price IDs
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Insira os <strong>Price IDs</strong> dos produtos criados no seu Stripe Dashboard.
                  Cada plano e modalidade de cobrança precisa de um Price ID separado.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Pro */}
                <div>
                  <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-3">Plano Pro — R$ 39,90/mês · R$ 399/ano</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Pro Mensal
                        <span className="text-red-400 ml-1">*</span>
                      </Label>
                      <Input
                        {...strField("stripePriceIdPro")}
                        placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Assinatura recorrente mensal</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Pro Anual</Label>
                      <Input
                        {...strField("stripePriceIdProAnnual")}
                        placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Assinatura recorrente anual</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Unlimited */}
                <div>
                  <p className="text-xs font-semibold text-brand uppercase tracking-wider mb-3">Plano Ilimitado — R$ 89,90/mês · R$ 899/ano</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">
                        Ilimitado Mensal
                        <span className="text-red-400 ml-1">*</span>
                      </Label>
                      <Input
                        {...strField("stripePriceIdUnlimited")}
                        placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Assinatura recorrente mensal</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-sm font-medium">Ilimitado Anual</Label>
                      <Input
                        {...strField("stripePriceIdUnlimitedAnnual")}
                        placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
                        className="font-mono text-sm"
                      />
                      <p className="text-xs text-muted-foreground">Assinatura recorrente anual</p>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Preço exibido na UI */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Preço Mensal Pro (em centavos)</Label>
                    <Input
                      {...numField("stripeMonthlyPrice")}
                      placeholder="3990"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Exibido na tela de upgrade. Ex: 3990 = R$&nbsp;39,90/mês
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-border/50 bg-surface/50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como obter os Price IDs</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>
                      Acesse{" "}
                      <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
                        dashboard.stripe.com/products <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Crie os produtos <strong>Plakr! Pro</strong> e <strong>Plakr! Ilimitado</strong></li>
                    <li>Para cada produto, adicione 2 preços: mensal e anual</li>
                    <li>Copie cada <strong>Price ID</strong> (começa com <code className="bg-surface px-1 rounded text-xs">price_</code>)</li>
                    <li>Cole nos campos acima e clique em <strong>Salvar</strong></li>
                  </ol>
                  <p className="text-xs text-muted-foreground pt-1">
                    💡 Para testes, use o{" "}
                    <a href="https://dashboard.stripe.com/claim_sandbox/YWNjdF8xVEQ5dXRQVDFoY0ZaTEtHLDE3NzQ3Mzk4MTMv100kAUqlLlS" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
                      Sandbox Stripe <ExternalLink className="h-3 w-3" />
                    </a>{" "}
                    com cartão <code className="bg-surface px-1 rounded text-xs">4242 4242 4242 4242</code>
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* ─── LIMITES DO PLANO GRATUITO ────────────────────────────────── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Limites do Plano Gratuito</CardTitle>
                </div>
                <CardDescription className="text-sm">Controla o que usuários sem assinatura podem fazer</CardDescription>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              </CardContent>
            </Card>

            {/* ─── PONTUAÇÃO PADRÃO ─────────────────────────────────────────── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base">Pontuação Padrão (novos bolões)</CardTitle>
                </div>
                <CardDescription className="text-sm">Valores aplicados automaticamente ao criar um bolão. Cada bolão pode personalizar esses valores.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Pontuação Base</p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
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
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Bônus</p>
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
                <Separator />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Limiares de Critérios Especiais</p>
                  <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
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
              </CardContent>
            </Card>

            {/* ─── NOTIFICAÇÕES PUSH (VAPID) ─────────────────────────── */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="h-4 w-4 text-muted-foreground" />
                    <CardTitle className="text-base">Notificações Push (Web Push)</CardTitle>
                  </div>
                  {pushConfigured ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Keys configuradas
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 gap-1">
                      <XCircle className="h-3 w-3" /> Sem VAPID keys
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  As VAPID keys permitem enviar notificações push para os navegadores dos usuários sem
                  nenhuma configuração externa. Gere as keys abaixo e salve para ativar o canal push.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Ativar/desativar push */}
                <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-card/50">
                  <div>
                    <p className="text-sm font-medium">Ativar canal push</p>
                    <p className="text-xs text-muted-foreground">
                      Quando desativado, nenhuma notificação push será enviada mesmo com keys configuradas
                    </p>
                  </div>
                  <Switch
                    checked={pushForm.pushEnabled}
                    onCheckedChange={(v) => setPushForm((p) => ({ ...p, pushEnabled: v }))}
                    disabled={!pushConfigured}
                  />
                </div>

                {/* E-mail de contato VAPID */}
                <div className="space-y-1.5">
                  <Label>E-mail de contato VAPID</Label>
                  <Input
                    type="email"
                    placeholder="suporte@plakr.com.br"
                    value={pushForm.vapidEmail}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setPushForm((p) => ({ ...p, vapidEmail: e.target.value }))
                    }
                    className={pushConfigured && !pushForm.vapidEmail ? "border-yellow-500/60 focus-visible:ring-yellow-500/40" : ""}
                  />
                  {pushConfigured && !pushForm.vapidEmail ? (
                    <p className="text-xs text-yellow-400 flex items-center gap-1">
                      <span>⚠️</span> Recomendado para conformidade com o protocolo VAPID. Preencha para evitar problemas de entrega.
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      Usado pelo protocolo VAPID para contato em caso de problemas. Não é exibido aos usuários.
                    </p>
                  )}
                </div>

                {/* VAPID Keys */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">VAPID Keys</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2 text-xs"
                      onClick={() => generateVapidMutation.mutate()}
                      disabled={generateVapidMutation.isPending}
                    >
                      {generateVapidMutation.isPending ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      {pushConfigured ? "Regen. Keys" : "Gerar Keys"}
                    </Button>
                  </div>

                  {pushConfigured ? (
                    <div className="space-y-2">
                      <div className="space-y-1">
                        <Label className="text-xs text-muted-foreground">Chave Pública (compartilhada com o browser)</Label>
                        <div className="font-mono text-xs bg-surface/50 border border-border/40 rounded p-2 break-all select-all">
                          {pushForm.vapidPublicKey}
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs text-muted-foreground">Chave Privada (confidencial)</Label>
                          <button
                            type="button"
                            className="text-xs text-brand hover:underline"
                            onClick={() => setShowPrivateKey((v) => !v)}
                          >
                            {showPrivateKey ? "Ocultar" : "Revelar"}
                          </button>
                        </div>
                        <div className="font-mono text-xs bg-surface/50 border border-border/40 rounded p-2 break-all select-all">
                          {showPrivateKey ? pushForm.vapidPrivateKey : "•".repeat(43)}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                      <Bell className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">
                        Nenhuma VAPID key configurada. Clique em <strong>Gerar Keys</strong> para criar um par.
                      </p>
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
                  <p className="text-xs text-yellow-400 mt-2">
                    ⚠️ Ao regenerar as keys, todas as assinaturas push existentes serão invalidadas.
                    Os usuários precisarão reativar o push nas preferências.
                  </p>
                </div>
              </CardContent>
            </Card>

          {/* Card — Mensagens da Plataforma */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-md bg-brand/10">
                  <BookOpen className="h-4 w-4 text-brand" />
                </div>
                <div>
                  <CardTitle className="text-base">Mensagens da Plataforma</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Textos exibidos para os participantes em situações específicas</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Aviso de convite restrito</Label>
                <p className="text-xs text-muted-foreground">
                  Exibido para participantes quando o organizador configurou o bolão para que apenas ele possa convidar novos membros.
                  Deixe vazio para usar o texto padrão: <em>"Convites gerenciados pelo organizador."</em>
                </p>
                <Input
                  value={restrictedInviteMessage}
                  onChange={(e) => setRestrictedInviteMessage(e.target.value)}
                  placeholder="Convites gerenciados pelo organizador."
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{restrictedInviteMessage.length}/500</p>
              </div>
            </CardContent>
          </Card>

          {/* ── Badges Exclusivos ── */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                  <span className="text-lg">🧪</span>
                </div>
                <div>
                  <CardTitle className="text-base">Badges Exclusivos</CardTitle>
                  <CardDescription className="text-xs mt-0.5">Configure a atribuição automática dos badges de lançamento</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Chegou Cedo */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🏆</span>
                  <Label className="text-sm font-semibold">Chegou Cedo</Label>
                  <Badge variant="outline" className="text-xs">Automático</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atribuído automaticamente aos primeiros 100 usuários cadastrados na plataforma (userId ≤ 100).
                  Nenhuma configuração necessária — o critério é definido no badge cadastrado em{" "}
                  <a href="/admin/badges" className="text-primary hover:underline">Badges</a>.
                </p>
              </div>

              <Separator />

              {/* Cobaia */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🧪</span>
                  <Label className="text-sm font-semibold">Cobaia</Label>
                  <Badge variant="outline" className="text-xs">Configurável</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Atribuído a todos os participantes do primeiro bolão válido após o lançamento oficial da plataforma.
                  Informe o <strong>ID do bolão</strong> abaixo. Quando o bolão for finalizado, todos os participantes receberão o badge automaticamente.
                </p>
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    min={1}
                    placeholder="ID do bolão (ex: 42)"
                    value={cobaiaPoolId}
                    onChange={(e) => setCobaiaPoolId(e.target.value)}
                    className="max-w-[200px]"
                  />
                  {cobaiaPoolId && (
                    <span className="text-xs text-muted-foreground">
                      Bolão #{cobaiaPoolId} configurado como bolão Cobaia
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground/60">
                  A atribuição ocorre automaticamente quando o bolão é arquivado/finalizado.
                  Salve as configurações para ativar.
                </p>
              </div>
            </CardContent>
          </Card>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
