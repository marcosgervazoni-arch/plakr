import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronRight,
  FileText,
  Globe,
  Megaphone,
  Menu,
  Settings,
  Shield,
  Trophy,
  Users,
  Wallet,
} from "lucide-react";
import { Link, useLocation } from "wouter";

export type AdminSection =
  | "dashboard"
  | "tournaments"
  | "users"
  | "pools"
  | "subscriptions"
  | "broadcasts"
  | "ads"
  | "settings"
  | "audit";

interface AdminLayoutProps {
  activeSection: AdminSection;
  children: React.ReactNode;
}

const NAV_ITEMS: { id: AdminSection; label: string; icon: React.ElementType; path: string }[] = [
  { id: "dashboard", label: "Dashboard Global", icon: BarChart3, path: "/admin" },
  { id: "tournaments", label: "Campeonatos", icon: Trophy, path: "/admin/tournaments" },
  { id: "users", label: "Usuários", icon: Users, path: "/admin/users" },
  { id: "pools", label: "Bolões", icon: BookOpen, path: "/admin/pools" },
  { id: "subscriptions", label: "Assinaturas", icon: Wallet, path: "/admin/subscriptions" },
  { id: "broadcasts", label: "Broadcasts", icon: Megaphone, path: "/admin/broadcasts" },
  { id: "ads", label: "Publicidade", icon: Bell, path: "/admin/ads" },
  { id: "settings", label: "Configurações", icon: Settings, path: "/admin/settings" },
  { id: "audit", label: "Auditoria", icon: FileText, path: "/admin/audit" },
];

function NavContent({ activeSection }: { activeSection: AdminSection }) {
  const [, navigate] = useLocation();
  return (
    <div className="flex flex-col h-full">
      {/* Brand */}
      <div className="p-4 border-b border-border/50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Shield className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-bold font-display text-sm">Super Admin</p>
            <p className="text-xs text-muted-foreground">ApostAI</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors text-left ${
                isActive
                  ? "bg-brand/15 text-brand font-medium"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{item.label}</span>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </button>
          );
        })}
      </nav>

      <Separator />
      <div className="p-3">
        <button
          onClick={() => navigate("/dashboard")}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <ChevronRight className="h-4 w-4 rotate-180" />
          Voltar à plataforma
        </button>
      </div>
    </div>
  );
}

export default function AdminLayout({ activeSection, children }: AdminLayoutProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Shield className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Acesso restrito a administradores.</p>
        <Link href="/dashboard">
          <Button variant="outline">Voltar ao painel</Button>
        </Link>
      </div>
    );
  }

  const currentItem = NAV_ITEMS.find((i) => i.id === activeSection);

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex flex-col w-60 border-r border-border/50 bg-card/30 shrink-0 fixed inset-y-0 left-0 z-30">
        <NavContent activeSection={activeSection} />
      </aside>

      {/* Main content */}
      <div className="flex-1 lg:ml-60 flex flex-col min-h-screen">
        {/* Top bar */}
        <header className="h-14 border-b border-border/50 flex items-center justify-between px-4 lg:px-6 sticky top-0 bg-background/95 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            {/* Mobile menu */}
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 w-60">
                <NavContent activeSection={activeSection} />
              </SheetContent>
            </Sheet>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Admin</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-medium">{currentItem?.label}</span>
            </div>
          </div>
          <Badge variant="outline" className="text-xs border-brand/30 text-brand">
            <Shield className="h-3 w-3 mr-1" />
            Super Admin
          </Badge>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
