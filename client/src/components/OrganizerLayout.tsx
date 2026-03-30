/**
 * OrganizerLayout — Layout com sidebar fixa para todas as telas do Organizador (O2–O6)
 * C1: Sidebar reorganizada com grupos colapsáveis para melhor navegação.
 * Grupos: Visão Geral / Participantes / Configuração / Financeiro
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
  ChevronDown,
  ChevronRight,
  Menu,
  X,
  Crown,
  AlertTriangle,
  Lock,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { AdBanner } from "@/components/AdBanner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export type OrganizerSection =
  | "dashboard"
  | "members"
  | "access"
  | "identity"
  | "rules"
  | "games"
  | "communication"
  | "tournament"
  | "plan";

interface NavItem {
  id: OrganizerSection;
  label: string;
  icon: React.ElementType;
  proOnly?: boolean;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

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
  const [, navigate] = useLocation();

  // Grupos colapsáveis — inicializa com o grupo ativo aberto
  const getInitialOpenGroups = (): Record<string, boolean> => {
    const participantsItems: OrganizerSection[] = ["members", "access", "communication"];
    const configItems: OrganizerSection[] = ["identity", "rules", "games", "tournament"];
    return {
      overview: true,
      participants: participantsItems.includes(activeSection),
      config: configItems.includes(activeSection),
      financial: activeSection === "plan",
    };
  };

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(getInitialOpenGroups);

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Guard: if slug is empty (malformed URL), redirect to dashboard
  useEffect(() => {
    if (!slug) navigate("/dashboard");
  }, [slug, navigate]);

  if (!slug) return null;

  const statusConfig = STATUS_LABELS[poolStatus] ?? STATUS_LABELS.active;

  const sectionPaths: Record<OrganizerSection, string> = {
    dashboard: `/pool/${slug}/manage`,
    members: `/pool/${slug}/manage/members`,
    access: `/pool/${slug}/manage/access`,
    identity: `/pool/${slug}/manage/identity`,
    rules: `/pool/${slug}/manage/rules`,
    games: `/pool/${slug}/manage/games`,
    communication: `/pool/${slug}/manage/communication`,
    tournament: `/pool/${slug}/manage/tournament`,
    plan: `/pool/${slug}/manage/plan`,
  };

  const navGroups: NavGroup[] = [
    {
      label: "Visão Geral",
      items: [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
      ],
      defaultOpen: true,
    },
    {
      label: "Participantes",
      items: [
        { id: "members", label: "Membros", icon: Users },
        { id: "access", label: "Controle de Acesso", icon: Link2 },
        { id: "communication", label: "Comunicação", icon: MessageSquare, proOnly: true },
      ],
    },
    {
      label: "Configuração",
      items: [
        { id: "identity", label: "Identidade Visual", icon: Palette },
        { id: "rules", label: "Regras de Pontuação", icon: Settings2 },
        { id: "games", label: "Jogos e Resultados", icon: ClipboardList, proOnly: true },
        { id: "tournament", label: "Campeonato", icon: Trophy, proOnly: true },
      ],
    },
    {
      label: "Financeiro",
      items: [
        { id: "plan", label: "Plano e Assinatura", icon: Crown },
      ],
    },
  ];

  const groupKeys = ["overview", "participants", "config", "financial"];

  const NavItemButton = ({ item }: { item: NavItem }) => {
    const isActive = activeSection === item.id;
    const isLocked = item.proOnly && !isPro;
    const isReadOnly = item.proOnly && isPro && isProExpired;

    return (
      <Link key={item.id} href={sectionPaths[item.id]}>
        <button
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left",
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
            <p className="font-display font-bold text-sm truncate">
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

      {/* Nav groups */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navGroups.map((group, idx) => {
          const key = groupKeys[idx];
          const isOpen = openGroups[key];
          const hasActiveItem = group.items.some((i) => i.id === activeSection);

          return (
            <div key={key}>
              {/* Group header — "Visão Geral" não tem toggle, sempre visível */}
              {group.items.length === 1 && group.label === "Visão Geral" ? (
                <NavItemButton item={group.items[0]} />
              ) : (
                <>
                  <button
                    onClick={() => toggleGroup(key)}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-wider transition-colors",
                      hasActiveItem
                        ? "text-primary"
                        : "text-muted-foreground/60 hover:text-muted-foreground"
                    )}
                  >
                    <span className="flex-1 text-left">{group.label}</span>
                    {isOpen
                      ? <ChevronDown className="w-3 h-3 shrink-0" />
                      : <ChevronRight className="w-3 h-3 shrink-0" />
                    }
                  </button>
                  {isOpen && (
                    <div className="mt-0.5 space-y-0.5 pl-1">
                      {group.items.map((item) => (
                        <NavItemButton key={item.id} item={item} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
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
        <span className="font-display font-bold text-sm truncate">
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

      {/* Mobile content — apenas para telas pequenas */}
      <div className="lg:hidden flex-1 flex flex-col">
        <main className="min-w-0 flex-1">
          {!isPro && <AdBanner position="top" className="w-full rounded-none border-x-0 border-t-0" />}
          {children}
          {!isPro && <AdBanner position="bottom" className="w-full rounded-none border-x-0" />}
        </main>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Sidebar — desktop only */}
        <aside className="flex flex-col w-60 shrink-0 bg-card border-r border-border/30 sticky top-0 h-screen overflow-y-auto">
          <SidebarContent />
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 overflow-hidden h-screen flex flex-col">
          {/* Banner de topo — apenas para usuários free */}
          {!isPro && <AdBanner position="top" className="w-full rounded-none border-x-0 border-t-0 shrink-0" />}
          {/* Área de conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">{children}</div>
            {/* Banner de rodapé — apenas para usuários free */}
            {!isPro && <AdBanner position="bottom" className="w-full rounded-none border-x-0 border-b-0 shrink-0" />}
          </div>
        </main>
      </div>
      {/* Popup global — apenas para usuários free */}
      {!isPro && <AdBanner position="popup" />}
    </div>
  );
}
