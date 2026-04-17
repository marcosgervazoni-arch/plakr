/**
 * OrganizerLayout — Layout com sidebar fixa para todas as telas do Organizador (O2–O6)
 * Redesign UX: navegação plana com separadores visuais, sem grupos colapsáveis.
 * Cabeçalho limpo: nome do bolão + status + "← Ver bolão".
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
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import { Link, useLocation } from "wouter";
import { AdBanner } from "@/components/AdBanner";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc";

export type OrganizerSection =
  | "dashboard"
  | "members"
  | "access"
  | "identity"
  | "rules"
  | "games"
  | "communication"
  | "tournament"
  | "plan"
  | "entry-fee";

interface NavItem {
  id: OrganizerSection;
  label: string;
  icon: React.ElementType;
  proOnly?: boolean;
  badge?: number;
}

interface NavSection {
  label?: string; // undefined = sem separador
  items: NavItem[];
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

  // Buscar contagem de membros pendentes de aprovação
  const { data: poolData } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const poolId = poolData?.pool?.id;
  const { data: pendingMembers } = trpc.pools.listPendingMembers.useQuery(
    { poolId: poolId ?? 0 },
    { enabled: !!poolId && isPro, refetchInterval: 30_000 }
  );
  const pendingCount = pendingMembers?.length ?? 0;

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
    "entry-fee": `/pool/${slug}/manage/entry-fee`,
  };

  // Navegação plana organizada em seções com separadores visuais
  const navSections: NavSection[] = [
    {
      items: [
        { id: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
      ],
    },
    {
      label: "Participantes",
      items: [
        { id: "members", label: "Membros", icon: Users, badge: pendingCount > 0 ? pendingCount : undefined },
        { id: "entry-fee", label: "Taxa de Inscrição", icon: Crown, proOnly: true },
      ],
    },
    {
      label: "Bolão",
      items: [
        { id: "identity", label: "Aparência", icon: Palette },
        { id: "rules", label: "Regras de Pontuação", icon: Settings2 },
        { id: "games", label: "Jogos e Resultados", icon: ClipboardList, proOnly: true },
        { id: "tournament", label: "Campeonato", icon: Trophy, proOnly: true },
      ],
    },
    {
      label: "Geral",
      items: [
        { id: "communication", label: "Comunicação", icon: MessageSquare, proOnly: true },
        { id: "plan", label: "Plano e Assinatura", icon: Crown },
      ],
    },
  ];

  const NavItemButton = ({ item }: { item: NavItem }) => {
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
          <item.icon className={cn("w-4 h-4 shrink-0", isActive && "text-primary")} />
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge !== undefined && item.badge > 0 && (
            <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
              {item.badge > 99 ? "99+" : item.badge}
            </span>
          )}
          {isLocked && <Lock className="w-3 h-3 text-muted-foreground/50 shrink-0" />}
          {isReadOnly && <Lock className="w-3 h-3 text-yellow-400/70 shrink-0" />}
        </button>
      </Link>
    );
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Pool header — nome, status, botão voltar */}
      <div className="p-4 border-b border-border/30">
        <Link href={`/pool/${slug}`}>
          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground px-2 mb-3 -ml-1">
            <ChevronLeft className="w-4 h-4" />
            <span className="text-xs">Ver bolão</span>
          </Button>
        </Link>
        <div className="px-1">
          <p className="font-bold text-sm leading-tight truncate mb-1.5">
            {poolName}
          </p>
          <div className="flex items-center gap-1.5 flex-wrap">
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

      {/* Navegação plana com separadores */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-4">
        {navSections.map((section, idx) => (
          <div key={idx}>
            {section.label && (
              <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider px-3 mb-1">
                {section.label}
              </p>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavItemButton key={item.id} item={item} />
              ))}
            </div>
          </div>
        ))}
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
        <div className="flex-1 min-w-0">
          <span className="font-bold text-sm truncate block">{poolName}</span>
        </div>
        <Badge className={cn("text-xs py-0 px-1.5 border shrink-0", statusConfig.color)}>
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

      {/* Mobile content */}
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
          {!isPro && <AdBanner position="top" className="w-full rounded-none border-x-0 border-t-0 shrink-0" />}
          <div className="flex-1 overflow-y-auto flex flex-col">
            <div className="flex-1">{children}</div>
            {!isPro && <AdBanner position="bottom" className="w-full rounded-none border-x-0 border-b-0 shrink-0" />}
          </div>
        </main>
      </div>
      {/* Popup global — apenas para usuários free */}
      {!isPro && <AdBanner position="popup" />}
    </div>
  );
}
