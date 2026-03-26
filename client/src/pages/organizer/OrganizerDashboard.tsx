/**
 * O2 — Dashboard do Bolão (Organizador)
 * Especificação: 4 cards de métricas, participantes inativos, ranking top 5, barra de plano.
 * Layout: sidebar fixa + conteúdo principal.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Users,
  Target,
  Clock,
  Trophy,
  Crown,
  TrendingUp,
  AlertCircle,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { Link, useParams, useLocation } from "wouter";
import { useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  warn,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  warn?: boolean;
}) {
  return (
    <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{label}</p>
        <Icon className={`w-5 h-5 ${warn ? "text-yellow-400" : "text-muted-foreground/50"}`} />
      </div>
      <p
        className={`font-bold text-3xl leading-none ${warn ? "text-yellow-400" : "text-foreground"}`}

      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

function ClosePoolSection({ poolId, poolName, slug }: { poolId: number; poolName: string; slug: string }) {
  const [open, setOpen] = useState(false);
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();

  const closeMutation = trpc.pools.closePool.useMutation({
    onSuccess: (data) => {
      toast.success(`Bolão encerrado! ${data.top3.length > 0 ? `Campeão: ${(data.top3[0] as any).user?.name ?? "?"}` : ""}`);
      utils.pools.getBySlug.invalidate({ slug });
      setOpen(false);
    },
    onError: (err) => toast.error(err.message || "Erro ao encerrar bolão."),
  });

  return (
    <>
      <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-red-400">Zona de Perigo</p>
          <p className="text-xs text-muted-foreground mt-0.5">Encerrar o bolão é uma ação irreversível. Os palpites serão preservados.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 shrink-0"
          onClick={() => setOpen(true)}
        >
          Encerrar Bolão
        </Button>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Encerrar Bolão</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja encerrar <strong>{poolName}</strong>? Os participantes serão notificados com o resultado final.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => closeMutation.mutate({ poolId })}
              disabled={closeMutation.isPending}
            >
              {closeMutation.isPending ? "Encerrando..." : "Sim, encerrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function OrganizerDashboard() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data, isLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const { data: membersData } = trpc.pools.getMembers.useQuery(
    { poolId: data?.pool?.id ?? 0 },
    { enabled: !!data?.pool?.id }
  );

  const { data: rankingData } = trpc.rankings.getPoolRanking.useQuery(
    { poolId: data?.pool?.id ?? 0 },
    { enabled: !!data?.pool?.id }
  );

  const pool = data?.pool;
  const games = data?.games ?? [];
  const members = Array.isArray(membersData) ? membersData : (membersData?.items ?? []);
  const ranking = rankingData ?? [];

  const isPro = pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.planExpiresAt && new Date(pool.planExpiresAt).getTime() < Date.now();

  // Next game with deadline
  const nextGame = useMemo(() => {
    const now = Date.now();
    return games
      .filter((g: any) => g.status === "scheduled" && new Date(g.matchDate).getTime() > now)
      .sort((a: any, b: any) => new Date(a.matchDate).getTime() - new Date(b.matchDate).getTime())[0];
  }, [games]);

  // Countdown for next game
  const countdown = useMemo(() => {
    if (!nextGame) return null;
    const deadline = new Date(nextGame.matchDate).getTime() - ((data?.rules?.bettingDeadlineMinutes ?? 60)) * 60000;
    const diff = deadline - Date.now();
    if (diff <= 0) return "Prazo encerrado";
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
  }, [nextGame]);

  // Inactive members (sem palpite nos últimos 3 jogos encerrados)
  const inactiveMembers = useMemo(() => {
    return (members as any[])
      .filter((m: any) => m.isInactive === true)
      .slice(0, 5);
  }, [members]);

  // Top 5 ranking
  const top5 = ranking.slice(0, 5);

  // Bets coverage
  const totalBets = data?.games?.reduce((acc: number, g: any) => acc + (g.betCount ?? 0), 0) ?? 0;
  const maxBets = games.length * members.length;
  const coverage = maxBets > 0 ? Math.round((totalBets / maxBets) * 100) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Bolão não encontrado.</p>
      </div>
    );
  }

  const isOrganizer = members.find((m: any) => (m.member?.userId ?? m.userId) === user?.id)?.member?.role === "organizer" || user?.role === "admin";
  if (!isOrganizer) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Acesso restrito ao organizador.</p>
      </div>
    );
  }

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool.name}
      poolStatus={pool.status as any}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="dashboard"
    >
      <div className="p-6 space-y-6 max-w-5xl">
        {/* Page title */}
        <div>
          <h1 className="font-display font-bold text-xl">
            Dashboard do Bolão
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Visão geral e indicadores em tempo real.
          </p>
        </div>

        {/* 4 metric cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            icon={Users}
            label="Participantes"
            value={data?.memberCount ?? 0}
            sub={!isPro ? `de 50 no plano gratuito` : "ilimitado (Pro)"}
            warn={!isPro && (data?.memberCount ?? 0) >= 45}
          />
          <MetricCard
            icon={Target}
            label="Palpites"
            value={totalBets}
            sub={`${coverage}% de cobertura`}
          />
          <MetricCard
            icon={Clock}
            label="Próximo Jogo"
            value={countdown ?? "—"}
            sub={nextGame ? `${nextGame.teamAName} × ${nextGame.teamBName}` : "Nenhum agendado"}
            warn={!!countdown && countdown !== "Prazo encerrado" && countdown.includes("min")}
          />
          <MetricCard
            icon={Trophy}
            label="Sua Posição"
            value={ranking.findIndex((r: any) => r.userId === user?.id) + 1 || "—"}
            sub="no ranking do bolão"
          />
        </div>

        {/* Two-column: inactive + top 5 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Inactive members */}
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-yellow-400" />
                <h3 className="font-semibold text-sm">Participantes Inativos</h3>
              </div>
              <Link href={`/pool/${slug}/manage/members`}>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Ver todos <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            {inactiveMembers.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Todos os participantes estão ativos!
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {inactiveMembers.map((m: any) => (
                  <div key={m.id} className="px-4 py-2.5 flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                      {m.userName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm flex-1 truncate">{m.userName ?? "Usuário"}</span>
                    <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400/30">
                      Inativo
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Top 5 ranking */}
          <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <h3 className="font-semibold text-sm">Ranking — Top 5</h3>
              </div>
              <Link href={`/pool/${slug}`}>
                <Button variant="ghost" size="sm" className="text-xs text-muted-foreground">
                  Ver completo <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </Link>
            </div>
            {top5.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum palpite registrado ainda.
              </div>
            ) : (
              <div className="divide-y divide-border/20">
                {top5.map((r: any, i: number) => (
                  <div key={r.userId} className="px-4 py-2.5 flex items-center gap-3">
                    <span
                      className={`w-6 text-center font-bold text-sm shrink-0 ${i === 0 ? "text-yellow-400" : i === 1 ? "text-slate-300" : i === 2 ? "text-amber-600" : "text-muted-foreground"}`}

                    >
                      {i + 1}
                    </span>
                    <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {r.userName?.[0]?.toUpperCase() ?? "?"}
                    </div>
                    <span className="text-sm flex-1 truncate">{r.userName ?? "Usuário"}</span>
                    <span
                      className="font-bold text-sm text-primary shrink-0"

                    >
                      {r.totalPoints} pts
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Danger zone — Encerrar bolão */}
        {pool.status !== "finished" && (
          <ClosePoolSection poolId={pool.id} poolName={pool.name} slug={slug ?? ""} />
        )}

        {/* Plan status bar */}
        <div className="bg-card border border-border/30 rounded-xl p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            {isPro ? (
              <Crown className="w-4 h-4 text-primary" />
            ) : (
              <Trophy className="w-4 h-4 text-muted-foreground" />
            )}
            <span className="text-sm font-medium">
              {isPro ? "Plano Pro" : "Plano Gratuito"}
            </span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-mono font-semibold text-foreground">{data?.memberCount ?? 0}</span>
            {!isPro && <span> de 50 participantes</span>}
            {isPro && <span> participantes (ilimitado)</span>}
          </div>
          {!isPro && (
            <Link href={`/pool/${slug}/manage/plan`} className="ml-auto">
              <Button size="sm" className="text-xs">
                <Crown className="w-3.5 h-3.5 mr-1.5" /> Fazer upgrade para Pro
              </Button>
            </Link>
          )}
        </div>
      </div>
    </OrganizerLayout>
  );
}
