/**
 * AppShell — Layout global com sidebar colapsável para usuários autenticados.
 * Usado em: Dashboard, PoolPage, PublicPools, EnterPool, Profile.
 * O Organizador e Admin têm seus próprios layouts (OrganizerLayout, AdminLayout).
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import {
  Trophy,
  LayoutDashboard,
  Search,
  KeyRound,
  User,
  Crown,
  Shield,
  LogOut,
  Menu,
  X,
  ChevronRight,
  Plus,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface AppShellProps {
  children: React.ReactNode;
}

const navItems = [
  {
    id: "dashboard",
    label: "Meus Bolões",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    id: "public",
    label: "Bolões Públicos",
    icon: Search,
    href: "/pools/public",
  },
  {
    id: "enter",
    label: "Entrar por Código",
    icon: KeyRound,
    href: "/enter-pool",
  },
  {
    id: "profile",
    label: "Meu Perfil",
    icon: User,
    href: "/profile/me",
  },
];

export default function AppShell({ children }: AppShellProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: userData } = trpc.users.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const isPro =
    userData?.plan?.plan === "pro" && userData?.plan?.isActive;
  const isAdmin =
    userData?.user?.role === "admin" || user?.role === "admin";

  const initials =
    user?.name
      ?.split(" ")
      .map((n: string) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() ?? "?";

  const getActiveSection = () => {
    if (location === "/dashboard") return "dashboard";
    if (location.startsWith("/pools/public")) return "public";
    if (location.startsWith("/enter-pool")) return "enter";
    if (location.startsWith("/profile")) return "profile";
    return "";
  };
  const activeSection = getActiveSection();

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

      {/* User info */}
      {isAuthenticated && (
        <div className="p-3 border-b border-border/30">
          <Link href="/profile/me" onClick={() => setSidebarOpen(false)}>
            <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
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

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
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

        {/* Criar bolão CTA */}
        <div className="pt-2">
          <Link href="/create-pool" onClick={() => setSidebarOpen(false)}>
            <button className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left bg-primary/5 hover:bg-primary/10 text-primary border border-primary/20">
              <Plus className="w-4 h-4 shrink-0" />
              <span className="flex-1 truncate font-medium">Criar Bolão</span>
            </button>
          </Link>
        </div>

        {/* Admin link */}
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
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8 shrink-0"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </Button>
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
