import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { trpc } from "@/lib/trpc";
import { Loader2, Save, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminSettings() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();

  const [form, setForm] = useState({
    freeMaxParticipants: 50,
    freeMaxPools: 2,
    poolArchiveDays: 10,
    defaultScoringExact: 10,
    defaultScoringCorrect: 5,
    defaultScoringBonusGoals: 2,
    defaultScoringBonusDiff: 2,
    defaultScoringBonusUpset: 3,
    gaMeasurementId: "",
    fbPixelId: "",
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
        gaMeasurementId: settings.gaMeasurementId ?? "",
        fbPixelId: settings.fbPixelId ?? "",
      });
    }
  }, [settings]);

  const updateMutation = trpc.platform.updateSettings.useMutation({
    onSuccess: () => toast.success("Configurações salvas."),
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
    value: form[key],
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value })),
  });

  return (
    <AdminLayout activeSection="settings">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Configurações</h1>
            <p className="text-muted-foreground text-sm mt-1">Parâmetros globais da plataforma</p>
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
            {/* Limites do Plano Gratuito */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Limites do Plano Gratuito</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <Label>Máx. Participantes por Bolão</Label>
                  <Input {...numField("freeMaxParticipants")} />
                </div>
                <div className="space-y-1">
                  <Label>Máx. Bolões por Usuário</Label>
                  <Input {...numField("freeMaxPools")} />
                </div>
                <div className="space-y-1">
                  <Label>Dias até Arquivamento</Label>
                  <Input {...numField("poolArchiveDays")} />
                </div>
              </CardContent>
            </Card>

            {/* Pontuação Padrão */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Pontuação Padrão (novos bolões)</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                <div className="space-y-1">
                  <Label>Placar Exato</Label>
                  <Input {...numField("defaultScoringExact")} />
                </div>
                <div className="space-y-1">
                  <Label>Resultado Correto</Label>
                  <Input {...numField("defaultScoringCorrect")} />
                </div>
                <div className="space-y-1">
                  <Label>Bônus Gols</Label>
                  <Input {...numField("defaultScoringBonusGoals")} />
                </div>
                <div className="space-y-1">
                  <Label>Bônus Diferença</Label>
                  <Input {...numField("defaultScoringBonusDiff")} />
                </div>
                <div className="space-y-1">
                  <Label>Bônus Zebra</Label>
                  <Input {...numField("defaultScoringBonusUpset")} />
                </div>
              </CardContent>
            </Card>

            {/* Analytics */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Analytics & Rastreamento</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Google Analytics ID</Label>
                  <Input {...strField("gaMeasurementId")} placeholder="G-XXXXXXXXXX" className="font-mono" />
                </div>
                <div className="space-y-1">
                  <Label>Facebook Pixel ID</Label>
                  <Input {...strField("fbPixelId")} placeholder="000000000000000" className="font-mono" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
