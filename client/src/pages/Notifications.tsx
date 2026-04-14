/**
 * Notificações — /notifications
 * Abas: Notificações | Preferências
 */
import AppShell from "@/components/AppShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NotificationPreferencesContent } from "@/pages/NotificationPreferences";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Check,
  CheckCheck,
  Loader2,
  Megaphone,
  Settings,
  Star,
  Trophy,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { toast } from "sonner";
import { useLocation, useSearch } from "wouter";

const typeConfig: Record<string, { icon: any; label: string; color: string }> = {
  game_reminder: { icon: Bell, label: "Lembrete", color: "text-blue-400" },
  ranking_update: { icon: Trophy, label: "Ranking", color: "text-yellow-400" },
  result_available: { icon: Star, label: "Resultado", color: "text-green-400" },
  system: { icon: Megaphone, label: "Sistema", color: "text-muted-foreground" },
  ad: { icon: Zap, label: "Promoção", color: "text-purple-400" },
};

function NotificationsTab() {
  const utils = trpc.useUtils();
  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { limit: 50 },
    { refetchInterval: 30_000 }
  );
  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });
  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.notifications.list.invalidate();
      toast.success("Todas as notificações marcadas como lidas.");
    },
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
            className="gap-2"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Marcar todas como lidas
          </Button>
        </div>
      )}
      {!notifications || notifications.length === 0 ? (
        <div className="bg-card border border-border/30 rounded-2xl p-12 text-center space-y-3">
          <Bell className="w-10 h-10 text-muted-foreground/20 mx-auto" />
          <p className="font-semibold text-muted-foreground">Nenhuma notificação ainda</p>
          <p className="text-sm text-muted-foreground/70">
            Você será notificado sobre jogos, resultados e atualizações do ranking.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const cfg = typeConfig[n.type] ?? typeConfig.system;
            const Icon = cfg.icon;
            return (
              <div
                key={n.id}
                className={`bg-card border rounded-xl px-4 py-3 flex items-start gap-3 transition-all ${
                  n.isRead ? "border-border/30 opacity-70" : "border-primary/20 bg-primary/5"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg bg-card border border-border/30 flex items-center justify-center shrink-0 mt-0.5 ${cfg.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-sm">{n.title}</p>
                        <Badge variant="outline" className={`text-xs ${cfg.color} border-current/20`}>
                          {cfg.label}
                        </Badge>
                        {!n.isRead && (
                          <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">{n.message}</p>
                      <p className="text-xs text-muted-foreground/60 mt-1">
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </p>
                    </div>
                    {!n.isRead && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7 shrink-0"
                        onClick={() => markRead.mutate({ id: n.id })}
                        disabled={markRead.isPending}
                        title="Marcar como lida"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  const search = useSearch();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(search);
  const activeTab = params.get("tab") ?? "notificacoes";

  const tabs = [
    { id: "notificacoes", label: "Notificações", icon: Bell },
    { id: "preferencias", label: "Preferências", icon: Settings },
  ];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-6">
        {/* Header */}
        <div>
          <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Notificações
          </h1>
        </div>

        {/* Abas */}
        <div className="flex gap-1 p-1 bg-muted/40 rounded-lg border border-border/30">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => {
                  if (tab.id === "notificacoes") {
                    navigate("/notifications", { replace: true });
                  } else {
                    navigate(`/notifications?tab=${tab.id}`, { replace: true });
                  }
                }}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Conteúdo da aba ativa */}
        {activeTab === "notificacoes" ? (
          <NotificationsTab />
        ) : (
          <NotificationPreferencesContent />
        )}
      </div>
    </AppShell>
  );
}
