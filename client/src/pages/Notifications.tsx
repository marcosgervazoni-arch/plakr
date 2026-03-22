/**
 * Página de Notificações — /notifications
 * Lista todas as notificações do usuário com opção de marcar como lida.
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Bell, BellOff, Check, CheckCheck, Loader2,
  Trophy, Calendar, TrendingUp, Megaphone, Info, Settings,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "wouter";
import { toast } from "sonner";

const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
  game_reminder:    { icon: Calendar,    color: "text-blue-400",   label: "Lembrete" },
  ranking_update:   { icon: TrendingUp,  color: "text-yellow-400", label: "Ranking" },
  result_available: { icon: Trophy,      color: "text-green-400",  label: "Resultado" },
  system:           { icon: Info,        color: "text-primary",    label: "Sistema" },
  ad:               { icon: Megaphone,   color: "text-orange-400", label: "Novidade" },
  pool_closing:     { icon: BellOff,     color: "text-red-400",    label: "Encerramento" },
  pool_invite:      { icon: Bell,        color: "text-purple-400", label: "Convite" },
  plan_expired:     { icon: Info,        color: "text-red-400",    label: "Plano" },
  plan_expiring:    { icon: Info,        color: "text-orange-400", label: "Plano" },
};

export default function Notifications() {
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

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Notificações
            </h1>
            {unreadCount > 0 && (
              <p className="text-sm text-muted-foreground">{unreadCount} não lida{unreadCount !== 1 ? "s" : ""}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => markAllRead.mutate()}
                disabled={markAllRead.isPending}
                className="gap-2"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Marcar todas
              </Button>
            )}
            <Link href="/notification-preferences">
              <Button variant="ghost" size="icon" className="w-9 h-9">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !notifications || notifications.length === 0 ? (
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
    </AppShell>
  );
}
