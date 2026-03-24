/**
 * AppShell — Layout global com sidebar colapsável para usuários autenticados.
 * Usado em: Dashboard, PoolPage, PublicPools, EnterPool, Profile.
 * O Organizador e Admin têm seus próprios layouts (OrganizerLayout, AdminLayout).
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationBell from "@/components/NotificationBell";
import { AdBanner } from "@/components/AdBanner";
import { cn } from "@/lib/utils";
import {
  Trophy,
  LayoutDashboard,
  Search,
  KeyRound,
  Crown,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Plus,
  Medal,
  ChevronDown,
  Users,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface AppShellProps {
  children: React.ReactNode;
}

// Itens de navegação principais (seções — sem Ranking, que virou grupo colapsável)
const navSections = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    // Ativo também em rotas filhas de bolão
    matchFn: (loc: string) =>
      loc === "/dashboard" || loc.startsWith("/pool/"),
  },
  {
    id: "public",
    label: "Bolões Públicos",
    icon: Search,
    href: "/pools/public",
    matchFn: (loc: string) => loc.startsWith("/pools/public"),
  },
];

// Itens de ação (separados visualmente das seções)
const actionItems = [
  {
    id: "enter",
    label: "Entrar por Código",
    icon: KeyRound,
    href: "/enter-pool",
    matchFn: (loc: string) => loc.startsWith("/enter-pool"),
  },
];

export default function AppShell({ children }: AppShellProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  // Grupo de Ranking colapsável — abre automaticamente se estiver em /pool/
  const [rankingOpen, setRankingOpen] = useState(() =>
    typeof window !== "undefined" && window.location.pathname.startsWith("/pool/")
  );

  const { data: userData } = trpc.users.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Buscar contagem de notificações não lidas para badge no mobile
  const { data: notifications } = trpc.notifications.list.useQuery({}, {
    enabled: isAuthenticated,
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  // Bolões ativos do usuário para o submenu de Ranking
  const { data: myPools = [] } = trpc.users.myPools.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const activePools = (myPools as any[]).filter(
    (p: any) => p.pool?.status === "active"
  );

  const isPro =
    userData?.plan?.plan === "pro" && userData?.plan?.isActive;
  const isAdmin =
    userData?.user?.role === "admin" || user?.role === "admin";
  const isBlocked = userData?.user?.isBlocked === true;

  // Redirecionar usuários bloqueados
  useEffect(() => {
    if (isAuthenticated && isBlocked) {
      window.location.href = "/suspended";
    }
  }, [isAuthenticated, isBlocked]);

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-4 border-b border-border/30">
        <Link href="/dashboard" onClick={() => setSidebarOpen(false)}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center shrink-0">
              <Trophy className="w-4 h-4 text-primary-foreground" />
            </div>
            <span
              className="font-bold text-base"
              style={{ fontFamily: "'Syne', sans-serif" }}
            >
              ApostAI
            </span>
          </div>
        </Link>
      </div>

      {/* Card do usuário — clicável para /my-profile */}
      {isAuthenticated && (
        <div className="p-3 border-b border-border/30">
          <Link href="/my-profile" onClick={() => setSidebarOpen(false)}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary overflow-hidden">
                {user?.avatarUrl ? (
                  <img
                    src={user.avatarUrl ?? undefined}
                    alt={user.name ?? ""}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                ) : (
                  initials
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  {isPro ? (
                    <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20 h-4">
                      <Crown className="w-2.5 h-2.5 mr-1" />
                      Pro
                    </Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">
                      Plano Gratuito
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
            </div>
          </Link>
        </div>
      )}

        {/* Navegação principal */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {/* Seções de navegação */}
          {navSections.map((item) => {
            const isActive = item.matchFn(location);
            return (
              <Link
                key={item.id}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
              >
                <button
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                    isActive
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 truncate">{item.label}</span>
                </button>
              </Link>
            );
          })}

          {/* Grupo colapsável: Ranking dos Bolões — visível apenas quando há bolões ativos */}
          {isAuthenticated && activePools.length > 0 && (
            <div>
              <button
                onClick={() => setRankingOpen((v) => !v)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  location.startsWith("/pool/")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Medal className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">Ranking</span>
                <ChevronDown
                  className={cn(
                    "w-3.5 h-3.5 shrink-0 transition-transform duration-200",
                    rankingOpen ? "rotate-180" : ""
                  )}
                />
              </button>

              {/* Submenus: um por bolão ativo */}
              {rankingOpen && (
                <div className="ml-3 mt-0.5 space-y-0.5 border-l border-border/30 pl-3">
                  {activePools.map((p: any) => {
                    const poolSlug = p.pool?.slug;
                    const poolName = p.pool?.name ?? "Bolão";
                    const rankHref = `/pool/${poolSlug}?tab=ranking`;
                    const isPoolRankActive = location.startsWith(`/pool/${poolSlug}`);
                    return (
                      <Link
                        key={poolSlug}
                        href={rankHref}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <button
                          className={cn(
                            "w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm transition-all text-left",
                            isPoolRankActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <Users className="w-3.5 h-3.5 shrink-0" />
                          <span className="flex-1 truncate text-xs">{poolName}</span>
                          {p.rankPosition && (
                            <span className="text-[10px] font-bold text-primary/70 shrink-0">
                              #{p.rankPosition}
                            </span>
                          )}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        {/* Separador visual entre seções e ações */}
        <div className="pt-2 pb-1">
          <div className="border-t border-border/30" />
          <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-3 pt-2">
            Ações
          </p>
        </div>

        {/* Criar Bolão — CTA primário */}
        <Link href="/create-pool" onClick={() => setSidebarOpen(false)}>
          <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20">
            <Plus className="w-4 h-4 shrink-0" />
            <span className="flex-1 truncate font-medium">Criar Bolão</span>
          </button>
        </Link>

        {/* Itens de ação secundários */}
        {actionItems.map((item) => {
          const isActive = item.matchFn(location);
          return (
            <Link
              key={item.id}
              href={item.href}
              onClick={() => setSidebarOpen(false)}
            >
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
              </button>
            </Link>
          );
        })}

        {/* Link de Admin — apenas para administradores */}
        {isAdmin && (
          <div className="pt-1">
            <Link href="/admin" onClick={() => setSidebarOpen(false)}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  location.startsWith("/admin")
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">Super Admin</span>
              </button>
            </Link>
          </div>
        )}
      </nav>

      {/* Ad Banner no sidebar */}
      <div className="px-3 pb-2">
        <AdBanner position="sidebar" className="w-full" />
      </div>

      {/* Upgrade CTA — apenas para usuários free */}
      {isAuthenticated && !isPro && (
        <div className="p-3 border-t border-border/30">
          <Link href="/upgrade" onClick={() => setSidebarOpen(false)}>
            <div className="bg-primary/10 border border-primary/20 rounded-lg p-3 cursor-pointer hover:bg-primary/15 transition-colors">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-bold text-primary">
                  Upgrade para Pro
                </span>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Bolões ilimitados, campeonatos personalizados e muito mais.
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* Logout */}
      {isAuthenticated && (
        <div className="p-3 border-t border-border/30">
          <button
            onClick={() => {
              setSidebarOpen(false);
              logout();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-all text-left"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            <span>Sair</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/30 px-4 h-14 flex items-center gap-3">
        {/* Botão de menu com badge de notificações não lidas */}
        <div className="relative shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-4 h-4" />
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full flex items-center justify-center pointer-events-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </div>

        <Link href="/dashboard" className="flex items-center gap-2 flex-1 min-w-0">
          <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Trophy className="w-3.5 h-3.5 text-primary-foreground" />
          </div>
          <span
            className="font-bold text-sm truncate"
            style={{ fontFamily: "'Syne', sans-serif" }}
          >
            ApostAI
          </span>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0">
          <NotificationBell />
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="relative w-64 bg-card border-r border-border/30 h-full overflow-y-auto">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 w-7 h-7 z-10"
              onClick={() => setSidebarOpen(false)}
            >
              <X className="w-4 h-4" />
            </Button>
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside className="hidden lg:flex flex-col w-60 shrink-0 bg-card border-r border-border/30 sticky top-0 h-screen overflow-y-auto">
          {/* Notification bell no topo desktop */}
          <div className="absolute top-3 right-3 z-10">
            <NotificationBell />
          </div>
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
