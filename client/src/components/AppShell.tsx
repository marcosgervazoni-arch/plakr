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
  Award,
  UserCircle,
  Gamepad2,
  ScrollText,
  GitBranch,
  History,
  Sparkles,
  Swords,
  ChevronDown,
  Settings,
} from "lucide-react";
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

interface AppShellProps {
  children: React.ReactNode;
}

// Itens de navegação principais — ordem definida pelo orquestrador
const navSections = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    matchFn: (loc: string) =>
      loc === "/dashboard" || loc.startsWith("/pool/"),
  },
  {
    id: "profile",
    label: "Meu Perfil",
    icon: UserCircle,
    href: "/my-profile",
    matchFn: (loc: string) => loc === "/my-profile" || loc.startsWith("/profile/"),
  },
  {
    id: "public",
    label: "Explorar Bolões",
    icon: Search,
    href: "/pools/public",
    matchFn: (loc: string) => loc.startsWith("/pools/public"),
  },
  {
    id: "conquistas",
    label: "Conquistas",
    icon: Award,
    href: "/conquistas",
    matchFn: (loc: string) => loc === "/conquistas",
  },
];



export default function AppShell({ children }: AppShellProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const [location] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [poolNavOpen, setPoolNavOpen] = useState(true);
  const { data: userData } = trpc.users.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Buscar contagem de notificações não lidas para badge no mobile
  const { data: notifications } = trpc.notifications.list.useQuery({}, {
    enabled: isAuthenticated,
  });
  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  // Bolões do usuário (ativos + concluídos) para o submenu
  const { data: myPools = [] } = trpc.users.myPools.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const activePools = (myPools as any[]).filter(
    (p: any) => p.pool?.status === "active"
  );

  // Detectar se o usuário está dentro de um bolão específico
  const poolSlugMatch = location.match(/^\/pool\/([^/]+)/);
  const activePoolSlug = poolSlugMatch ? poolSlugMatch[1] : null;
  // Buscar dados do bolão ativo em todos os bolões (não só ativos)
  const activePoolData = activePoolSlug
    ? (myPools as any[]).find((p: any) => p.pool?.slug === activePoolSlug)
    : null;
  const activePoolName = activePoolData?.pool?.name ?? activePoolSlug;
  const activePoolStatus = activePoolData?.pool?.status ?? "active";
  const activePoolIsOrganizer = activePoolData?.member?.role === "organizer" || user?.role === "admin";
  const activePoolIsConcluded = activePoolStatus === "concluded";

  // Itens de subnavegação do bolão ativo — nova ordem e nomenclatura (orquestrador)
  const poolNavItems = activePoolSlug
    ? [
        // Configurações — apenas para organizadores
        ...(activePoolIsOrganizer ? [{
          id: "pool-manage",
          label: "Configurações",
          icon: Settings,
          href: `/pool/${activePoolSlug}/manage`,
          match: (l: string) => l.startsWith(`/pool/${activePoolSlug}/manage`),
          highlight: false,
        }] : []),
        // Meus Palpites — com destaque visual
        { id: "pool-history",  label: "Meus Palpites",  icon: History,     href: `/pool/${activePoolSlug}/history`,          match: (l: string) => l.startsWith(`/pool/${activePoolSlug}/history`),          highlight: true  },
        // Jogos
        { id: "pool-games",    label: "Jogos",          icon: Gamepad2,    href: `/pool/${activePoolSlug}?tab=games`,        match: (l: string) => l === `/pool/${activePoolSlug}` || (l.startsWith(`/pool/${activePoolSlug}`) && !l.includes('/history') && !l.includes('/rules') && !l.includes('/bracket') && !l.includes('/retrospectiva') && !l.includes('/player') && !l.includes('/manage')), highlight: false },
        // Ranking
        { id: "pool-ranking",  label: "Ranking",        icon: Trophy,      href: `/pool/${activePoolSlug}?tab=ranking`,      match: (l: string) => l === `/pool/${activePoolSlug}` && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'ranking'),  highlight: false },
        // Duelos
        { id: "pool-duelos",   label: "Duelos",         icon: Swords,      href: `/pool/${activePoolSlug}?tab=duelos`,       match: (l: string) => l === `/pool/${activePoolSlug}` && (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('tab') === 'duelos'),   highlight: false },
        // Chaveamento
        { id: "pool-bracket",  label: "Chaveamento",    icon: GitBranch,   href: `/pool/${activePoolSlug}/bracket`,          match: (l: string) => l.startsWith(`/pool/${activePoolSlug}/bracket`),          highlight: false },
        // Retrospectiva — apenas quando bolão está concluído
        ...(activePoolIsConcluded ? [{
          id: "pool-retro",
          label: "Retrospectiva",
          icon: Sparkles,
          href: `/pool/${activePoolSlug}/retrospectiva`,
          match: (l: string) => l.startsWith(`/pool/${activePoolSlug}/retrospectiva`),
          highlight: false,
        }] : []),
        // Regras
        { id: "pool-rules",    label: "Regras",         icon: ScrollText,  href: `/pool/${activePoolSlug}/rules`,            match: (l: string) => l.startsWith(`/pool/${activePoolSlug}/rules`),            highlight: false },
      ]
    : [];

  const isAdmin =
    userData?.user?.role === "admin" || user?.role === "admin";
  // Admins sempre veem anúncios (para teste/validação). Usuários Pro não veem.
  const isPro =
    !isAdmin && userData?.plan?.plan === "pro" && userData?.plan?.isActive;
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

            >
              Plakr!
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
                data-tour={item.id === 'conquistas' ? 'achievements-link' : item.id === 'profile' ? 'my-profile' : undefined}
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

          {/* Notificações removidas da sidebar — disponível no top bar mobile */}

          {/* ── Subnavegação contextual do bolão ativo ── */}
          {isAuthenticated && poolNavItems.length > 0 && (
            <div className="pt-2">
              {/* Cabeçalho colapsável com nome do bolão */}
              <button
                className="w-full flex items-center justify-between px-3 pb-1.5 group"
                onClick={() => setPoolNavOpen((v) => !v)}
              >
                <p className="text-[10px] font-semibold text-primary/70 uppercase tracking-wider truncate max-w-[140px]">
                  {activePoolName}
                </p>
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-muted-foreground/50 shrink-0 transition-transform",
                    poolNavOpen ? "rotate-0" : "-rotate-90"
                  )}
                />
              </button>

              {poolNavOpen && (
                <div className="space-y-0.5">
                  {poolNavItems.map((item) => {
                    const isActive = item.match(location);
                    const isHighlight = (item as any).highlight === true;
                    // Detectar se o link usa ?tab= (mesma rota, troca de aba)
                    const hasTabParam = item.href.includes('?tab=');
                    const handleClick = (e: React.MouseEvent) => {
                      if (hasTabParam) {
                        e.preventDefault();
                        // Atualizar a URL sem recarregar (wouter ignora query string changes)
                        const url = new URL(item.href, window.location.origin);
                        window.history.pushState({}, '', url.pathname + url.search);
                        // Disparar evento customizado para a PoolPage escutar
                        window.dispatchEvent(new CustomEvent('pool-tab-change', {
                          detail: { tab: url.searchParams.get('tab') }
                        }));
                      }
                      setSidebarOpen(false);
                    };
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        onClick={handleClick}
                      >
                        <button
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all text-left",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : isHighlight
                                ? "text-primary/90 bg-primary/5 hover:bg-primary/10 font-medium"
                                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                          )}
                        >
                          <item.icon className={cn("w-4 h-4 shrink-0", isHighlight && !isActive && "text-primary")} />
                          <span className="flex-1 truncate">{item.label}</span>
                        </button>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Seção: Meus Bolões — acesso direto, visível apenas quando autenticado ── */}
          {isAuthenticated && (
            <div className="pt-2">
              {/* Cabeçalho da seção */}
              <div className="flex items-center justify-between px-3 pb-1">
                <p className="text-[10px] font-semibold text-muted-foreground/50 uppercase tracking-wider">
                  Meus Bolões
                </p>
                {activePools.length > 0 && (
                  <span className="text-[10px] text-muted-foreground/40">{activePools.length}</span>
                )}
              </div>

              {/* Lista de bolões ativos — um item por bolão */}
              {activePools.length > 0 ? (
                <div className="space-y-0.5">
                  {activePools.map((p: any) => {
                    const poolSlug = p.pool?.slug;
                    const poolName = p.pool?.name ?? "Bolão";
                    const poolHref = `/pool/${poolSlug}`;
                    const isActive = location.startsWith(`/pool/${poolSlug}`);
                    // Calcular palpites pendentes
                    const pendingBets = (p.pendingBetsCount ?? 0) as number;
                    return (
                      <Link
                        key={poolSlug}
                        href={poolHref}
                        onClick={() => setSidebarOpen(false)}
                      >
                        <button
                          className={cn(
                            "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all text-left group",
                            isActive
                              ? "bg-primary/10 text-primary font-medium"
                              : "text-foreground hover:bg-muted/50"
                          )}
                        >
                          <div className="w-6 h-6 rounded-md bg-primary/15 flex items-center justify-center shrink-0">
                            <Trophy className="w-3 h-3 text-primary" />
                          </div>
                          <span className="flex-1 truncate text-sm font-medium">{poolName}</span>
                          {pendingBets > 0 ? (
                            <span className="min-w-[18px] h-[18px] rounded-full bg-primary text-[10px] font-bold text-primary-foreground flex items-center justify-center px-1 shrink-0">
                              {pendingBets > 9 ? "9+" : pendingBets}
                            </span>
                          ) : p.rankPosition ? (
                            <span className="text-[10px] font-bold text-muted-foreground/60 shrink-0">
                              {p.rankPosition === 1 ? "🥇" : p.rankPosition === 2 ? "🥈" : p.rankPosition === 3 ? "🥉" : `${p.rankPosition}º`}
                            </span>
                          ) : null}
                        </button>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                /* Estado vazio — nenhum bolão ativo */
                <div className="px-3 py-2">
                  <p className="text-xs text-muted-foreground/60 italic">Nenhum bolão ativo</p>
                </div>
              )}

              {/* Ação rápida: Criar */}
              <div className="px-3 pt-1.5 pb-0.5">
                <Link href="/create-pool" onClick={() => setSidebarOpen(false)} className="block" data-tour="create-pool">
                  <button className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/20">
                    <Plus className="w-3 h-3" /> Criar bolão
                  </button>
                </Link>
              </div>
            </div>
          )}

        {/* Separador visual */}
        <div className="pt-2 pb-1">
          <div className="border-t border-border/30" />
        </div>
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

      {/* Super Admin — rodapé, apenas para administradores */}
      {isAdmin && (
        <div className="px-3 pb-1">
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

          >
            Plakr!
          </span>
        </Link>

        <div className="flex items-center gap-1.5 shrink-0" data-tour="notifications">
          {/* Engrenagem — apenas quando organizador do bolão ativo */}
          {activePoolSlug && activePoolIsOrganizer && (
            <Link href={`/pool/${activePoolSlug}/manage`}>
              <Button variant="ghost" size="icon" className="w-8 h-8" title="Configurações do bolão">
                <Settings className="w-4 h-4" />
              </Button>
            </Link>
          )}
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
      <div className="hidden lg:flex flex-1 overflow-hidden h-screen">
        {/* Sidebar — desktop only, fixo */}
        <aside className="flex flex-col w-60 shrink-0 bg-card border-r border-border/30 h-screen overflow-y-auto sticky top-0">
          <SidebarContent />
        </aside>

        {/* Main content — apenas este elemento rola */}
        <main className="flex-1 min-w-0 overflow-y-auto h-screen flex flex-col">
          {/* Banner de topo — apenas para usuários free */}
          {!isPro && <AdBanner position="top" className="w-full rounded-none border-x-0 border-t-0" />}
          <div className="flex-1">{children}</div>
          {/* Banner de rodapé — apenas para usuários free */}
          {!isPro && <AdBanner position="bottom" className="w-full rounded-none border-x-0 border-b-0" />}
        </main>
      </div>

      {/* Mobile layout — sem flex fixo, scroll natural */}
      <div className="lg:hidden flex-1 flex flex-col">
        <main className="min-w-0 flex-1">
          {/* Banner de topo mobile — apenas para usuários free */}
          {!isPro && <AdBanner position="top" className="w-full rounded-none border-x-0 border-t-0" />}
          {children}
          {/* Banner de rodapé mobile — apenas para usuários free */}
          {!isPro && <AdBanner position="bottom" className="w-full rounded-none border-x-0" />}
        </main>
      </div>

      {/* Popup global — apenas para usuários free, renderizado fora do fluxo */}
      {!isPro && <AdBanner position="popup" />}
    </div>
  );
}
