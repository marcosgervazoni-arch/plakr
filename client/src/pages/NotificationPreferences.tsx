/**
 * Preferências de Notificação — /notification-preferences
 * 15 campos: in-app (5) + push (5) + e-mail (5)
 * Push requer ativação via Service Worker + VAPID.
 */
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  CheckCircle2,
  Loader2,
  Mail,
  Smartphone,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Link } from "wouter";

type Prefs = {
  // In-App
  inAppGameReminder: boolean;
  inAppRankingUpdate: boolean;
  inAppResultAvailable: boolean;
  inAppSystem: boolean;
  inAppAd: boolean;
  // Push
  pushGameReminder: boolean;
  pushRankingUpdate: boolean;
  pushResultAvailable: boolean;
  pushSystem: boolean;
  pushAd: boolean;
  // E-mail
  emailGameReminder: boolean;
  emailRankingUpdate: boolean;
  emailResultAvailable: boolean;
  emailSystem: boolean;
  emailAd: boolean;
};

type PrefItem = { key: keyof Prefs; label: string; description: string };

const ITEMS: PrefItem[] = [
  {
    key: "inAppGameReminder",
    label: "Lembrete de jogo",
    description: "Antes do prazo de palpite encerrar",
  },
  {
    key: "inAppRankingUpdate",
    label: "Atualização de ranking",
    description: "Quando sua posição no ranking mudar",
  },
  {
    key: "inAppResultAvailable",
    label: "Resultado disponível",
    description: "Quando pontos forem calculados",
  },
  {
    key: "inAppSystem",
    label: "Comunicados",
    description: "Avisos e novidades da plataforma",
  },
  {
    key: "inAppAd",
    label: "Promoções",
    description: "Ofertas e conteúdo patrocinado",
  },
];

const PUSH_ITEMS: PrefItem[] = [
  {
    key: "pushGameReminder",
    label: "Lembrete de jogo",
    description: "Notificação push antes do prazo encerrar",
  },
  {
    key: "pushRankingUpdate",
    label: "Atualização de ranking",
    description: "Push quando sua posição mudar",
  },
  {
    key: "pushResultAvailable",
    label: "Resultado disponível",
    description: "Push quando pontos forem calculados",
  },
  {
    key: "pushSystem",
    label: "Comunicados",
    description: "Push de avisos da plataforma",
  },
  {
    key: "pushAd",
    label: "Promoções",
    description: "Push de ofertas e conteúdo patrocinado",
  },
];

const EMAIL_ITEMS: PrefItem[] = [
  {
    key: "emailGameReminder",
    label: "Lembrete de jogo",
    description: "E-mail antes do prazo de palpite encerrar",
  },
  {
    key: "emailRankingUpdate",
    label: "Atualização de ranking",
    description: "E-mail quando sua posição mudar",
  },
  {
    key: "emailResultAvailable",
    label: "Resultado disponível",
    description: "E-mail quando pontos forem calculados",
  },
  {
    key: "emailSystem",
    label: "Comunicados",
    description: "E-mails de avisos da plataforma",
  },
  {
    key: "emailAd",
    label: "Promoções",
    description: "E-mails de ofertas e conteúdo patrocinado",
  },
];

const DEFAULT_PREFS: Prefs = {
  inAppGameReminder: true,
  inAppRankingUpdate: true,
  inAppResultAvailable: true,
  inAppSystem: true,
  inAppAd: true,
  pushGameReminder: true,
  pushRankingUpdate: false,
  pushResultAvailable: true,
  pushSystem: false,
  pushAd: false,
  emailGameReminder: false,
  emailRankingUpdate: false,
  emailResultAvailable: false,
  emailSystem: false,
  emailAd: false,
};

export default function NotificationPreferences() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.notifications.getPreferences.useQuery();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS);
  const [dirty, setDirty] = useState(false);

  const {
    permission,
    isSubscribed,
    isLoading: pushLoading,
    pushEnabled,
    subscribe,
    unsubscribe,
  } = usePushNotifications();

  useEffect(() => {
    if (data) {
      setPrefs({
        inAppGameReminder: data.inAppGameReminder ?? true,
        inAppRankingUpdate: data.inAppRankingUpdate ?? true,
        inAppResultAvailable: data.inAppResultAvailable ?? true,
        inAppSystem: data.inAppSystem ?? true,
        inAppAd: (data as Prefs).inAppAd ?? true,
        pushGameReminder: (data as Prefs).pushGameReminder ?? true,
        pushRankingUpdate: (data as Prefs).pushRankingUpdate ?? false,
        pushResultAvailable: (data as Prefs).pushResultAvailable ?? true,
        pushSystem: (data as Prefs).pushSystem ?? false,
        pushAd: (data as Prefs).pushAd ?? false,
        emailGameReminder: data.emailGameReminder ?? false,
        emailRankingUpdate: data.emailRankingUpdate ?? false,
        emailResultAvailable: data.emailResultAvailable ?? false,
        emailSystem: data.emailSystem ?? false,
        emailAd: (data as Prefs).emailAd ?? false,
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
    setPrefs((p) => ({ ...p, [key]: !p[key] }));
    setDirty(true);
  };

  const save = () => updatePrefs.mutate(prefs);

  const handlePushToggle = async () => {
    if (isSubscribed) {
      await unsubscribe();
      toast.success("Notificações push desativadas neste dispositivo.");
    } else {
      await subscribe();
      if (permission === "denied") {
        toast.error("Permissão de notificações bloqueada. Verifique as configurações do navegador.");
      } else if (permission === "granted") {
        toast.success("Notificações push ativadas!");
      }
    }
  };

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const pushUnavailable = permission === "unsupported" || !pushEnabled;

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

        {/* ─── In-App ─── */}
        <Section icon={<Bell className="w-4 h-4 text-primary" />} title="No aplicativo">
          {ITEMS.map(({ key, label, description }) => (
            <PrefRow
              key={key}
              label={label}
              description={description}
              checked={prefs[key]}
              onToggle={() => toggle(key)}
            />
          ))}
        </Section>

        {/* ─── Push ─── */}
        <Section
          icon={<Smartphone className="w-4 h-4 text-primary" />}
          title="Notificações Push"
          badge={
            pushUnavailable ? (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Indisponível
              </Badge>
            ) : isSubscribed ? (
              <Badge variant="outline" className="text-xs text-green-400 border-green-400/30">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Ativo neste dispositivo
              </Badge>
            ) : (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Inativo
              </Badge>
            )
          }
        >
          {/* Aviso de permissão */}
          {permission === "denied" && (
            <div className="mx-5 my-3 p-3 rounded-lg bg-red-400/5 border border-red-400/20 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">
                Permissão de notificações bloqueada no navegador. Para ativar, acesse as configurações
                do site no seu navegador e permita notificações.
              </p>
            </div>
          )}

          {!pushEnabled && (
            <div className="mx-5 my-3 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-400">
                As notificações push ainda não foram configuradas pelo administrador da plataforma.
              </p>
            </div>
          )}

          {/* Botão de ativar/desativar push neste dispositivo */}
          {pushEnabled && permission !== "unsupported" && (
            <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Ativar neste dispositivo</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Permite receber notificações mesmo com o app fechado
                </p>
              </div>
              <Button
                variant={isSubscribed ? "outline" : "default"}
                size="sm"
                onClick={handlePushToggle}
                disabled={pushLoading || permission === "denied"}
                className="shrink-0"
              >
                {pushLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : isSubscribed ? (
                  "Desativar"
                ) : (
                  "Ativar push"
                )}
              </Button>
            </div>
          )}

          {/* Preferências individuais de push */}
          {PUSH_ITEMS.map(({ key, label, description }) => (
            <PrefRow
              key={key}
              label={label}
              description={description}
              checked={prefs[key]}
              onToggle={() => toggle(key)}
              disabled={pushUnavailable || !isSubscribed}
            />
          ))}
        </Section>

        {/* ─── E-mail ─── */}
        <Section icon={<Mail className="w-4 h-4 text-primary" />} title="E-mail">
          <div className="px-5 py-3 bg-muted/30 border-b border-border/20">
            <p className="text-xs text-muted-foreground">
              E-mails são enviados para o endereço associado à sua conta. Todos os canais de e-mail
              são opt-in — desativados por padrão.
            </p>
          </div>
          {EMAIL_ITEMS.map(({ key, label, description }) => (
            <PrefRow
              key={key}
              label={label}
              description={description}
              checked={prefs[key]}
              onToggle={() => toggle(key)}
            />
          ))}
        </Section>

        {/* Salvar */}
        <div className="flex justify-end">
          <Button onClick={save} disabled={!dirty || updatePrefs.isPending} className="gap-2">
            {updatePrefs.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Salvar preferências
          </Button>
        </div>
      </div>
    </AppShell>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────────────────────

function Section({
  icon,
  title,
  badge,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
        {icon}
        <h2 className="font-semibold text-sm flex-1">{title}</h2>
        {badge}
      </div>
      <div className="divide-y divide-border/20">{children}</div>
    </div>
  );
}

function PrefRow({
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div
      className={`px-5 py-4 flex items-center justify-between gap-4 ${disabled ? "opacity-50" : ""}`}
    >
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{label}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onToggle} disabled={disabled} />
    </div>
  );
}
