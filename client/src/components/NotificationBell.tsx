import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  Check,
  Loader2,
  Sparkles,
  Trophy,
  Star,
  AlertCircle,
  Gift,
  Clock,
} from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

/** Ícone contextual por tipo de notificação */
function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "pool_concluded":
      return <Sparkles className="w-4 h-4 text-primary" />;
    case "badge_unlocked":
      return <Trophy className="w-4 h-4 text-amber-400" />;
    case "result_available":
    case "ranking_update":
      return <Star className="w-4 h-4 text-yellow-400" />;
    case "plan_expiring":
    case "plan_expired":
      return <AlertCircle className="w-4 h-4 text-red-400" />;
    case "pool_invite":
      return <Gift className="w-4 h-4 text-emerald-400" />;
    case "pool_closing":
      return <Clock className="w-4 h-4 text-orange-400" />;
    default:
      return <Bell className="w-4 h-4 text-muted-foreground" />;
  }
}

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  const { data: notifications, isLoading } = trpc.notifications.list.useQuery(
    { limit: 10 },
    { enabled: isAuthenticated, refetchInterval: 30_000 }
  );

  const markAllRead = trpc.notifications.markAllRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const markRead = trpc.notifications.markRead.useMutation({
    onSuccess: () => utils.notifications.list.invalidate(),
  });

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  if (!isAuthenticated) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative w-9 h-9">
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-card border-border p-0">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/50">
          <h3 className="font-semibold text-sm">Notificações</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 text-primary hover:text-primary/80"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <Check className="w-3 h-3 mr-1" /> Marcar todas como lidas
            </Button>
          )}
        </div>

        <div className="max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : !notifications || notifications.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
              Nenhuma notificação
            </div>
          ) : (
            notifications.map((n) => {
              const isConcluded = n.type === "pool_concluded";
              return (
                <div
                  key={n.id}
                  className={`px-4 py-3 border-b border-border/30 last:border-0 cursor-pointer transition-colors ${
                    isConcluded && !n.isRead
                      ? "bg-primary/8 hover:bg-primary/12 border-l-2 border-l-primary"
                      : !n.isRead
                      ? "bg-muted/20 hover:bg-muted/40"
                      : "hover:bg-muted/30"
                  }`}
                  onClick={() => {
                    if (!n.isRead) markRead.mutate({ id: n.id });
                    if (n.actionUrl) window.location.href = n.actionUrl;
                  }}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Ícone contextual */}
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                        isConcluded ? "bg-primary/15" : "bg-muted/50"
                      }`}
                    >
                      <NotificationIcon type={n.type} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-1">
                        <p className="text-sm font-medium leading-tight">{n.title}</p>
                        {!n.isRead && (
                          <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1">
                        <p className="text-xs text-muted-foreground/60">
                          {formatDistanceToNow(new Date(n.createdAt), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </p>
                        {n.actionLabel && n.actionUrl && (
                          <span
                            className={`text-xs font-semibold ${
                              isConcluded ? "text-primary" : "text-muted-foreground"
                            }`}
                          >
                            {n.actionLabel} →
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
