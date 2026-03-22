import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  Loader2,
  Save,
  Settings,
  Target,
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();

  const [form, setForm] = useState({
    // Limites do plano gratuito
    freeMaxParticipants: 50,
    freeMaxPools: 2,
    poolArchiveDays: 10,
    // Pontuação padrão
    defaultScoringExact: 10,
    defaultScoringCorrect: 5,
    defaultScoringBonusGoals: 2,
    defaultScoringBonusDiff: 2,
    defaultScoringBonusUpset: 3,
    defaultScoringBonusOneTeam: 2,
    defaultScoringBonusLandslide: 5,
    // Stripe
    stripePriceIdPro: "",
    stripeMonthlyPrice: 2990,
  });

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
        stripePriceIdPro: settings.stripePriceIdPro ?? "",
        stripeMonthlyPrice: settings.stripeMonthlyPrice ?? 2990,
      });
    }
  }, [settings]);

  const updateMutation = trpc.platform.updateSettings.useMutation({
    onSuccess: () => toast.success("Configurações salvas com sucesso."),
    onError: (e: { message: string }) => toast.error(e.message),
  });

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

  const stripeConfigured = form.stripePriceIdPro.startsWith("price_");

  return (
    <AdminLayout activeSection="settings">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand/10">
              <Settings className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Configurações</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Parâmetros globais da plataforma ApostAI</p>
            </div>
          </div>
          <Button
            className="bg-brand hover:bg-brand/90 gap-2"
            onClick={() => updateMutation.mutate(form)}
            disabled={updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Salvar Configurações
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
                    <CardTitle className="text-base">Stripe — Plano Pro</CardTitle>
                  </div>
                  {stripeConfigured ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/30 gap-1">
                      <XCircle className="h-3 w-3" /> Aguardando Price ID
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Insira o <strong>Price ID</strong> do produto "ApostAI Pro" criado no seu Stripe Dashboard.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">
                      Price ID do Plano Pro
                      <span className="text-red-400 ml-1">*</span>
                    </Label>
                    <Input
                      {...strField("stripePriceIdPro")}
                      placeholder="price_xxxxxxxxxxxxxxxxxxxxxxxx"
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: <code className="bg-surface px-1 rounded">price_</code> seguido de 24 caracteres
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">Preço Mensal (em centavos)</Label>
                    <Input
                      {...numField("stripeMonthlyPrice")}
                      placeholder="2990"
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Exibido na tela de upgrade. Ex: 2990 = R$&nbsp;29,90/mês
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-border/50 bg-surface/50 p-4 space-y-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como obter o Price ID</p>
                  <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>
                      Acesse{" "}
                      <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
                        dashboard.stripe.com/products <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Clique em <strong>Add product</strong> e crie o produto "ApostAI Pro"</li>
                    <li>Defina o preço recorrente mensal (ex: R$&nbsp;29,90)</li>
                    <li>Copie o <strong>Price ID</strong> (começa com <code className="bg-surface px-1 rounded text-xs">price_</code>)</li>
                    <li>Cole no campo acima e clique em <strong>Salvar Configurações</strong></li>
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
                      <p className="text-xs text-muted-foreground">Acertou goleada (≥3 gols diff)</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
