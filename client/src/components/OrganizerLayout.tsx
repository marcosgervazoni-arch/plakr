/**
 * OrganizerLayout — Layout com sidebar fixa para todas as telas do Organizador (O2–O6)
 * Especificação: sidebar 240px fixa à esquerda, conteúdo principal à direita.
 * Em mobile: sidebar colapsa em menu hambúrguer.
 */
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  LayoutDashboard,
  Users,
  Link2,
  Palette,
  Trophy,
  Settings2,
  ChevronLeft,
  Menu,
  X,
  Crown,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { cn } from "@/lib/utils";

export type OrganizerSection =
  | "dashboard"
  | "members"
  | "access"
  | "identity"
  | "rules"
  | "tournament"
  | "plan";

interface OrganizerLayoutProps {
  slug: string;
  poolName: string;
  poolStatus: "active" | "closed" | "draft";
  isPro: boolean;
  isProExpired?: boolean;
  activeSection: OrganizerSection;
  children: React.ReactNode;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  active: { label: "Ativo", color: "bg-green-500/20 text-green-400 border-green-500/30" },
  closed: { label: "Encerrado", color: "bg-muted/50 text-muted-foreground border-border/50" },
  draft: { label: "Rascunho", color: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
};

export default function OrganizerLayout({
  slug,
  poolName,
  poolStatus,
  isPro,
  isProExpired = false,
  activeSection,
  children,
}: OrganizerLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const statusConfig = STATUS_LABELS[poolStatus] ?? STATUS_LABELS.active;

  const navItems: { id: OrganizerSection; label: string; icon: React.ElementType; proOnly?: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "members", label: "Membros", icon: Users },
    { id: "access", label: "Controle de Acesso", icon: Link2 },
    { id: "identity", label: "Identidade Visual", icon: Palette },
    { id: "rules", label: "Regras de Pontuação", icon: Settings2 },
    { id: "tournament", label: "Campeonato", icon: Trophy, proOnly: true },
    { id: "plan", label: "Plano e Assinatura", icon: Crown },
  ];

  const sectionPaths: Record<OrganizerSection, string> = {
    dashboard: `/pool/${slug}/manage`,
    members: `/pool/${slug}/manage/members`,
    access: `/pool/${slug}/manage/access`,
    identity: `/pool/${slug}/manage/identity`,
    rules: `/pool/${slug}/manage/rules`,
    tournament: `/pool/${slug}/manage/tournament`,
    plan: `/pool/${slug}/manage/plan`,
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Pool header */}
      <div className="p-4 border-b border-border/30">
        <Link href={`/pool/${slug}`}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground px-2 mb-3">
            <ChevronLeft className="w-4 h-4" /> Ver bolão
          </Button>
        </Link>
        <div className="flex items-center gap-2 px-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
              {poolName}
            </p>
            <div className="flex items-center gap-1.5 mt-0.5">
              <Badge className={cn("text-xs py-0 px-1.5 border", statusConfig.color)}>
                {statusConfig.label}
              </Badge>
              {isPro && !isProExpired && (
                <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                  <Crown className="w-2.5 h-2.5 mr-1" />Pro
                </Badge>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          const isLocked = item.proOnly && !isPro;
          const isReadOnly = item.proOnly && isPro && isProExpired;

          return (
            <Link key={item.id} href={sectionPaths[item.id]}>
              <button
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                )}
                onClick={() => setSidebarOpen(false)}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span className="flex-1 truncate">{item.label}</span>
                {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
                {isReadOnly && <Lock className="w-3 h-3 text-yellow-400/70 shrink-0" />}
              </button>
            </Link>
          );
        })}
      </nav>
    </div>
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Pro expired banner */}
      {isProExpired && (
        <div className="bg-primary text-primary-foreground px-4 py-2.5 flex items-center gap-3 text-sm font-medium">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="flex-1">
            Plano Pro expirado. Funcionalidades avançadas estão limitadas.
          </span>
          <Link href={`/pool/${slug}/manage/plan`}>
            <Button size="sm" variant="outline" className="text-xs bg-transparent border-primary-foreground/40 text-primary-foreground hover:bg-primary-foreground/10 shrink-0">
              Renovar Assinatura
            </Button>
          </Link>
        </div>
      )}

      {/* Mobile top bar */}
      <div className="lg:hidden sticky top-0 z-40 bg-background/80 backdrop-blur-sm border-b border-border/30 px-4 h-14 flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="w-8 h-8"
          onClick={() => setSidebarOpen(true)}
        >
          <Menu className="w-4 h-4" />
        </Button>
        <span className="font-bold text-sm truncate" style={{ fontFamily: "'Syne', sans-serif" }}>
          {poolName}
        </span>
        <Badge className={cn("text-xs py-0 px-1.5 border ml-auto", statusConfig.color)}>
          {statusConfig.label}
        </Badge>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60" onClick={() => setSidebarOpen(false)} />
          <div className="relative w-64 bg-card border-r border-border/30 h-full overflow-y-auto">
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 w-7 h-7"
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
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
