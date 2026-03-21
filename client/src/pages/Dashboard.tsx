import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import {
  Trophy,
  Plus,
  Users,
  Calendar,
  ChevronRight,
  Star,
  Loader2,
  Bell,
  LogOut,
  Settings,
  BarChart3,
  Shield,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import CreatePoolModal from "@/components/CreatePoolModal";
import NotificationBell from "@/components/NotificationBell";

export default function Dashboard() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [showCreatePool, setShowCreatePool] = useState(false);

  const { data: userData, isLoading: userLoading } = trpc.users.me.useQuery(undefined, {
    enabled: isAuthenticated,
  });
  const { data: myPools, isLoading: poolsLoading, refetch: refetchPools } = trpc.users.myPools.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  if (loading || userLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-6 text-center px-4">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 flex items-center justify-center">
          <Trophy className="w-8 h-8 text-brand-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold mb-2">Bem-vindo ao ApostAI</h1>
          <p className="text-muted-foreground">Faça login para acessar seus bolões.</p>
        </div>
        <a href={getLoginUrl()}>
          <Button className="bg-brand-600 hover:bg-brand-700 text-white px-8">
            Entrar com Manus
          </Button>
        </a>
      </div>
    );
  }

  const isPro = userData?.plan?.plan === "pro" && userData?.plan?.isActive;

  return (
    <div className="min-h-screen bg-background">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/">
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
                  <Trophy className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-lg tracking-tight hidden sm:block">ApostAI</span>
              </div>
            </Link>
          </div>

          <nav className="hidden md:flex items-center gap-1">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-foreground">
                <BarChart3 className="w-4 h-4 mr-2" /> Meus Bolões
              </Button>
            </Link>
            {user?.role === "admin" && (
              <Link href="/admin">
                <Button variant="ghost" size="sm" className="text-brand-400">
                  <Shield className="w-4 h-4 mr-2" /> Admin
                </Button>
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-2">
            <NotificationBell />
            <div className="flex items-center gap-2 pl-2 border-l border-border/40">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-semibold text-brand-400">
                {user?.name?.charAt(0)?.toUpperCase() ?? "U"}
              </div>
              <span className="hidden sm:block text-sm font-medium max-w-[120px] truncate">{user?.name}</span>
              <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => logout()}>
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome + Plan Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold">
              Olá, {user?.name?.split(" ")[0] ?? "usuário"} 👋
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Gerencie seus bolões e acompanhe os rankings.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isPro ? (
              <Badge className="bg-brand-600/20 text-brand-400 border-brand-500/30">
                <Star className="w-3 h-3 mr-1" /> Plano Pro
              </Badge>
            ) : (
              <Badge variant="outline" className="text-muted-foreground">
                Plano Gratuito
              </Badge>
            )}
            <Button
              onClick={() => setShowCreatePool(true)}
              className="bg-brand-600 hover:bg-brand-700 text-white"
              size="sm"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Bolão
            </Button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Bolões ativos", value: myPools?.length ?? 0, icon: Trophy },
            { label: "Notificações", value: userData?.unreadNotifications ?? 0, icon: Bell },
            { label: "Plano", value: isPro ? "Pro" : "Free", icon: Star },
            { label: "Membro desde", value: new Date(user?.createdAt ?? Date.now()).getFullYear(), icon: Calendar },
          ].map((stat) => (
            <Card key={stat.label} className="bg-card border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">{stat.label}</p>
                    <p className="text-2xl font-bold">{stat.value}</p>
                  </div>
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                    <stat.icon className="w-4 h-4 text-brand-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* My Pools */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Meus Bolões</h2>
          </div>

          {poolsLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
            </div>
          ) : !myPools || myPools.length === 0 ? (
            <Card className="bg-card border-border/50 border-dashed">
              <CardContent className="py-16 text-center">
                <Trophy className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Nenhum bolão ainda</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Crie seu primeiro bolão ou entre em um pelo link de convite.
                </p>
                <Button
                  onClick={() => setShowCreatePool(true)}
                  className="bg-brand-600 hover:bg-brand-700 text-white"
                >
                  <Plus className="w-4 h-4 mr-2" /> Criar Bolão
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {myPools.map(({ pool, member }) => (
                <Link key={pool.id} href={`/pool/${pool.slug}`}>
                  <Card className="bg-card border-border/50 hover:border-brand-500/40 transition-all cursor-pointer group">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-brand-500/10 flex items-center justify-center group-hover:bg-brand-500/20 transition-colors">
                            <Trophy className="w-5 h-5 text-brand-400" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-sm font-semibold truncate">{pool.name}</CardTitle>
                            <p className="text-xs text-muted-foreground capitalize">{member.role === "organizer" ? "Organizador" : "Participante"}</p>
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-xs shrink-0 ${pool.plan === "pro" ? "border-brand-500/40 text-brand-400" : "border-border/50"}`}
                        >
                          {pool.plan === "pro" ? "Pro" : "Free"}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> Membros
                        </span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      {showCreatePool && (
        <CreatePoolModal
          onClose={() => setShowCreatePool(false)}
          onCreated={() => {
            setShowCreatePool(false);
            refetchPools();
          }}
        />
      )}
    </div>
  );
}
