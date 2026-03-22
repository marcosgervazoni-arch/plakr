/**
 * Preferências de Notificação — /notification-preferences
 * Permite ao usuário configurar quais notificações receber por canal (in-app e e-mail).
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Bell, Mail, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useEffect, useState } from "react";

type Prefs = {
  inAppGameReminder: boolean;
  inAppRankingUpdate: boolean;
  inAppResultAvailable: boolean;
  inAppSystem: boolean;
  emailGameReminder: boolean;
  emailRankingUpdate: boolean;
  emailResultAvailable: boolean;
  emailSystem: boolean;
};

const prefLabels: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "inAppGameReminder",    label: "Lembrete de jogo",      description: "Notificação antes do prazo de palpite encerrar" },
  { key: "inAppRankingUpdate",   label: "Atualização de ranking", description: "Quando sua posição no ranking mudar" },
  { key: "inAppResultAvailable", label: "Resultado disponível",  description: "Quando um jogo for finalizado e os pontos calculados" },
  { key: "inAppSystem",          label: "Sistema",               description: "Comunicados e avisos da plataforma" },
];

const emailLabels: { key: keyof Prefs; label: string; description: string }[] = [
  { key: "emailGameReminder",    label: "Lembrete de jogo",      description: "E-mail antes do prazo de palpite encerrar" },
  { key: "emailRankingUpdate",   label: "Atualização de ranking", description: "E-mail quando sua posição mudar" },
  { key: "emailResultAvailable", label: "Resultado disponível",  description: "E-mail quando um jogo for finalizado" },
  { key: "emailSystem",          label: "Sistema",               description: "E-mails de comunicados e avisos" },
];

export default function NotificationPreferences() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.notifications.getPreferences.useQuery();
  const [prefs, setPrefs] = useState<Prefs | null>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (data) {
      setPrefs({
        inAppGameReminder: data.inAppGameReminder,
        inAppRankingUpdate: data.inAppRankingUpdate,
        inAppResultAvailable: data.inAppResultAvailable,
        inAppSystem: data.inAppSystem,
        emailGameReminder: data.emailGameReminder,
        emailRankingUpdate: data.emailRankingUpdate,
        emailResultAvailable: data.emailResultAvailable,
        emailSystem: data.emailSystem,
      });
    }
  }, [data]);

  const updatePrefs = trpc.notifications.updatePreferences.useMutation({
    onSuccess: () => {
      utils.notifications.getPreferences.invalidate();
      setDirty(false);
      toast.success("Preferências salvas!");
    },
    onError: () => toast.error("Erro ao salvar preferências."),
  });

  const toggle = (key: keyof Prefs) => {
    setPrefs((p) => p ? { ...p, [key]: !p[key] } : p);
    setDirty(true);
  };

  const save = () => {
    if (prefs) updatePrefs.mutate(prefs);
  };

  if (isLoading || !prefs) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href="/notifications">
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Preferências de Notificação
            </h1>
            <p className="text-sm text-muted-foreground">Configure como e quando ser notificado.</p>
          </div>
        </div>

        {/* In-app */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
            <Bell className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Notificações no app</h2>
          </div>
          <div className="divide-y divide-border/20">
            {prefLabels.map(({ key, label, description }) => (
              <div key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Email */}
        <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
            <Mail className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm">Notificações por e-mail</h2>
          </div>
          <div className="divide-y divide-border/20">
            {emailLabels.map(({ key, label, description }) => (
              <div key={key} className="px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                </div>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={() => toggle(key)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Save */}
        <div className="flex justify-end">
          <Button
            onClick={save}
            disabled={!dirty || updatePrefs.isPending}
            className="gap-2"
          >
            {updatePrefs.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar preferências
          </Button>
        </div>

      </div>
    </AppShell>
  );
}
