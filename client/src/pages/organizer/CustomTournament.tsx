import OrganizerLayout from "@/components/OrganizerLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Crown,
  Flag,
  Loader2,
  Plus,
  Shield,
  Swords,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useParams } from "wouter";
import { toast } from "sonner";

type Step = 1 | 2 | 3 | 4;

interface TeamForm {
  name: string;
  shortName: string;
  country: string;
}

interface GameForm {
  homeTeamIndex: number;
  awayTeamIndex: number;
  matchDate: string;
  matchTime: string;
  phase: string;
  venue: string;
}

export default function CustomTournament() {
  const { slug } = useParams<{ slug: string }>();
  const [step, setStep] = useState<Step>(1);

  // Step 1: Tournament info
  const [tourInfo, setTourInfo] = useState({
    name: "",
    season: new Date().getFullYear().toString(),
    country: "Brasil",
    format: "league" as "league" | "cup" | "group_knockout",
  });

  // Step 2: Teams
  const [teams, setTeams] = useState<TeamForm[]>([
    { name: "", shortName: "", country: "" },
    { name: "", shortName: "", country: "" },
  ]);
  const [createdTournamentId, setCreatedTournamentId] = useState<number | null>(null);
  const [createdTeamIds, setCreatedTeamIds] = useState<number[]>([]);

  // Step 3: Games
  const [games, setGames] = useState<GameForm[]>([
    { homeTeamIndex: 0, awayTeamIndex: 1, matchDate: "", matchTime: "16:00", phase: "Rodada 1", venue: "" },
  ]);

  // Step 4: Review
  const [gameDialogOpen, setGameDialogOpen] = useState(false);
  const [editingGameIdx, setEditingGameIdx] = useState<number | null>(null);
  const [gameForm, setGameForm] = useState<GameForm>({ homeTeamIndex: 0, awayTeamIndex: 1, matchDate: "", matchTime: "16:00", phase: "Rodada 1", venue: "" });

  const { data: pool, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery({ slug: slug ?? "" }, { enabled: !!slug });

  const createTournamentMutation = trpc.tournaments.create.useMutation({
    onSuccess: (data) => {
      setCreatedTournamentId(data.id);
      toast.success("Campeonato criado!");
      setStep(2);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const createTeamMutation = trpc.tournaments.addTeam.useMutation();
  const createGameMutation = trpc.tournaments.addGame.useMutation();
  const updatePoolMutation = trpc.pools.update.useMutation();

  const isPro = pool?.pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.pool?.planExpiresAt && new Date(pool.pool.planExpiresAt).getTime() < Date.now();

  const steps = [
    { n: 1, label: "Informações", icon: Trophy },
    { n: 2, label: "Times", icon: Shield },
    { n: 3, label: "Jogos", icon: Swords },
    { n: 4, label: "Revisão", icon: CheckCircle2 },
  ];

  const handleStep1 = () => {
    if (!tourInfo.name.trim()) { toast.error("Nome do campeonato é obrigatório."); return; }
    const slugVal = tourInfo.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now();
    const formatMap: Record<string, "league" | "cup" | "groups_knockout" | "custom"> = {
      league: "league",
      cup: "cup",
      group_knockout: "groups_knockout",
      groups_knockout: "groups_knockout",
    };
    createTournamentMutation.mutate({
      name: tourInfo.name,
      slug: slugVal,
      season: tourInfo.season,
      country: tourInfo.country,
      isGlobal: false,
      format: formatMap[tourInfo.format] ?? "custom",
      poolId: pool?.pool?.id,
    });
  };

  const handleStep2 = async () => {
    const valid = teams.every((t) => t.name.trim());
    if (!valid) { toast.error("Todos os times precisam ter nome."); return; }
    if (!createdTournamentId) return;
    const ids: number[] = [];
    for (const t of teams) {
      const res = await createTeamMutation.mutateAsync({ tournamentId: createdTournamentId, name: t.name, code: t.shortName || t.name.slice(0, 3).toUpperCase(), groupName: t.country || tourInfo.country, poolId: pool?.pool?.id });
      ids.push(res.id);
    }
    setCreatedTeamIds(ids);
    toast.success(`${ids.length} times criados!`);
    setStep(3);
  };

  const handleStep3 = async () => {
    if (!createdTournamentId) return;
    const valid = games.every((g) => g.matchDate);
    if (!valid) { toast.error("Todos os jogos precisam ter data."); return; }
    for (const g of games) {
      const homeTeam = teams[g.homeTeamIndex];
      const awayTeam = teams[g.awayTeamIndex];
      if (!homeTeam || !awayTeam || g.homeTeamIndex === g.awayTeamIndex) continue;
      const dt = new Date(`${g.matchDate}T${g.matchTime}:00`);
      await createGameMutation.mutateAsync({
        tournamentId: createdTournamentId,
        teamAName: homeTeam.name,
        teamBName: awayTeam.name,
        matchDate: dt.getTime(),
        phase: g.phase,
        venue: g.venue,
        poolId: pool?.pool?.id,
      });
    }
    toast.success(`${games.length} jogos criados!`);
    // B4 — Vincular automaticamente o campeonato ao bolão
    if (pool?.pool?.id && createdTournamentId) {
      try {
        await updatePoolMutation.mutateAsync({ poolId: pool.pool.id, tournamentId: createdTournamentId } as any);
        toast.success("Campeonato vinculado ao bolão automaticamente!");
      } catch {
        toast.error("Campeonato criado, mas não foi possível vincular ao bolão. Faça isso manualmente nas configurações.");
      }
    }
    setStep(4);
  };

  const openGameDialog = (idx: number | null) => {
    if (idx === null) {
      setGameForm({ homeTeamIndex: 0, awayTeamIndex: 1, matchDate: "", matchTime: "16:00", phase: "Rodada 1", venue: "" });
    } else {
      setGameForm({ ...games[idx]! });
    }
    setEditingGameIdx(idx);
    setGameDialogOpen(true);
  };

  const saveGame = () => {
    if (editingGameIdx === null) {
      setGames((g) => [...g, gameForm]);
    } else {
      setGames((g) => g.map((x, i) => i === editingGameIdx ? gameForm : x));
    }
    setGameDialogOpen(false);
  };

  if (poolLoading) return <div className="flex items-center justify-center h-screen"><Loader2 className="h-6 w-6 animate-spin text-brand" /></div>;

  if (!isPro) {
    return (
      <OrganizerLayout slug={slug ?? ""} poolName={pool?.pool?.name ?? ""} poolStatus={(pool?.pool?.status as "active" | "closed" | "draft") ?? "active"} isPro={false} isProExpired={false} activeSection="tournament">
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4">
          <Crown className="h-12 w-12 text-yellow-400" />
          <h2 className="text-xl font-bold font-display">Recurso Exclusivo Pro</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            Campeonatos personalizados estão disponíveis apenas no Plano Pro. Faça upgrade para criar seus próprios campeonatos com times e jogos personalizados.
          </p>
          <Button className="bg-brand hover:bg-brand/90 gap-2" onClick={() => window.location.href = `/pool/${slug}/manage/plan`}>
            <Crown className="h-4 w-4" />
            Fazer Upgrade para Pro
          </Button>
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout slug={slug ?? ""} poolName={pool?.pool?.name ?? ""} poolStatus={(pool?.pool?.status as "active" | "closed" | "draft") ?? "active"} isPro={isPro} isProExpired={isProExpired} activeSection="tournament">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Campeonato Personalizado</h1>
          <p className="text-muted-foreground text-sm mt-1">Crie seu próprio campeonato com times e jogos customizados</p>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-0">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = step === s.n;
            const isDone = step > s.n;
            return (
              <div key={s.n} className="flex items-center flex-1">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${isActive ? "bg-brand/20 text-brand" : isDone ? "text-green-400" : "text-muted-foreground"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border ${isActive ? "border-brand bg-brand text-black" : isDone ? "border-green-400 bg-green-400/10 text-green-400" : "border-muted"}`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : s.n}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{s.label}</span>
                </div>
                {i < steps.length - 1 && <div className={`flex-1 h-px mx-1 ${isDone ? "bg-green-400/40" : "bg-border/40"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step 1: Tournament Info */}
        {step === 1 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Trophy className="h-4 w-4 text-brand" />Informações do Campeonato</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1 sm:col-span-2">
                  <Label>Nome do Campeonato *</Label>
                  <Input value={tourInfo.name} onChange={(e) => setTourInfo(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Liga dos Amigos 2026" />
                </div>
                <div className="space-y-1">
                  <Label>Temporada</Label>
                  <Input value={tourInfo.season} onChange={(e) => setTourInfo(f => ({ ...f, season: e.target.value }))} placeholder="2026" />
                </div>
                <div className="space-y-1">
                  <Label>País / Região</Label>
                  <Input value={tourInfo.country} onChange={(e) => setTourInfo(f => ({ ...f, country: e.target.value }))} placeholder="Brasil" />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Formato</Label>
                  <Select value={tourInfo.format} onValueChange={(v) => setTourInfo(f => ({ ...f, format: v as typeof tourInfo.format }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="league">Liga (pontos corridos)</SelectItem>
                      <SelectItem value="cup">Copa (mata-mata)</SelectItem>
                      <SelectItem value="group_knockout">Grupos + Mata-mata</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <Button className="bg-brand hover:bg-brand/90 gap-2" onClick={handleStep1} disabled={createTournamentMutation.isPending}>
                  {createTournamentMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Próximo: Times
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Teams */}
        {step === 2 && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Shield className="h-4 w-4 text-brand" />Times ({teams.length})</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setTeams(t => [...t, { name: "", shortName: "", country: "" }])}>
                  <Plus className="h-3.5 w-3.5" />Adicionar Time
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {teams.map((team, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end">
                  <div className="col-span-5 space-y-1">
                    {i === 0 && <Label className="text-xs">Nome Completo *</Label>}
                    <Input value={team.name} onChange={(e) => setTeams(t => t.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="Flamengo" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    {i === 0 && <Label className="text-xs">Sigla</Label>}
                    <Input value={team.shortName} onChange={(e) => setTeams(t => t.map((x, j) => j === i ? { ...x, shortName: e.target.value } : x))} placeholder="FLA" maxLength={5} className="font-mono uppercase" />
                  </div>
                  <div className="col-span-3 space-y-1">
                    {i === 0 && <Label className="text-xs">País</Label>}
                    <Input value={team.country} onChange={(e) => setTeams(t => t.map((x, j) => j === i ? { ...x, country: e.target.value } : x))} placeholder={tourInfo.country} />
                  </div>
                  <div className="col-span-1">
                    {i === 0 && <div className="h-5" />}
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-red-400" onClick={() => setTeams(t => t.filter((_, j) => j !== i))} disabled={teams.length <= 2}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="gap-2" onClick={() => setStep(1)}>
                  <ChevronLeft className="h-4 w-4" />Voltar
                </Button>
                <Button className="bg-brand hover:bg-brand/90 gap-2" onClick={handleStep2} disabled={createTeamMutation.isPending}>
                  {createTeamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Próximo: Jogos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 3: Games */}
        {step === 3 && (
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2"><Swords className="h-4 w-4 text-brand" />Jogos ({games.length})</CardTitle>
                <Button variant="outline" size="sm" className="gap-1" onClick={() => openGameDialog(null)}>
                  <Plus className="h-3.5 w-3.5" />Adicionar Jogo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {games.map((g, i) => (
                <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/20 border border-border/30 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => openGameDialog(i)}>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      {teams[g.homeTeamIndex]?.name || `Time ${g.homeTeamIndex + 1}`} <span className="text-muted-foreground">×</span> {teams[g.awayTeamIndex]?.name || `Time ${g.awayTeamIndex + 1}`}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge variant="outline" className="text-xs">{g.phase}</Badge>
                      {g.matchDate && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" />{format(new Date(`${g.matchDate}T${g.matchTime}`), "dd/MM HH:mm", { locale: ptBR })}</span>}
                      {g.venue && <span className="text-xs text-muted-foreground flex items-center gap-1"><Flag className="h-3 w-3" />{g.venue}</span>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-300 shrink-0" onClick={(e) => { e.stopPropagation(); setGames(gs => gs.filter((_, j) => j !== i)); }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
              {games.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  <Swords className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Nenhum jogo adicionado. Clique em "Adicionar Jogo" para começar.
                </div>
              )}
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="gap-2" onClick={() => setStep(2)}>
                  <ChevronLeft className="h-4 w-4" />Voltar
                </Button>
                <Button className="bg-brand hover:bg-brand/90 gap-2" onClick={handleStep3} disabled={createGameMutation.isPending || games.length === 0}>
                  {createGameMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ChevronRight className="h-4 w-4" />}
                  Próximo: Revisão
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 4: Review */}
        {step === 4 && (
          <Card className="border-border/50">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-400" />Campeonato Criado com Sucesso!</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-green-400/10 border border-green-400/20 p-4 space-y-2">
                <p className="font-medium text-green-400">{tourInfo.name} — {tourInfo.season}</p>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5" />{teams.length} times</span>
                  <span className="flex items-center gap-1"><Swords className="h-3.5 w-3.5" />{games.length} jogos</span>
                  <Badge variant="outline" className="text-xs">{tourInfo.format}</Badge>
                </div>
              </div>
              <div className="rounded-lg bg-muted/20 border border-border/30 p-4">
                <p className="text-sm text-muted-foreground">
                  O campeonato foi criado e está disponível para uso nos bolões Pro. Os participantes já podem fazer palpites nos jogos cadastrados.
                </p>
              </div>
              <div className="flex justify-between pt-2">
                <Button variant="outline" className="gap-2" onClick={() => window.location.href = `/pool/${slug}/manage`}>
                  <ChevronLeft className="h-4 w-4" />Voltar ao Dashboard
                </Button>
                <Button className="bg-brand hover:bg-brand/90 gap-2" onClick={() => { setStep(1); setTourInfo({ name: "", season: new Date().getFullYear().toString(), country: "Brasil", format: "league" }); setTeams([{ name: "", shortName: "", country: "" }, { name: "", shortName: "", country: "" }]); setGames([{ homeTeamIndex: 0, awayTeamIndex: 1, matchDate: "", matchTime: "16:00", phase: "Rodada 1", venue: "" }]); setCreatedTournamentId(null); setCreatedTeamIds([]); }}>
                  <Plus className="h-4 w-4" />Criar Outro Campeonato
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Game Dialog */}
      <Dialog open={gameDialogOpen} onOpenChange={setGameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingGameIdx === null ? "Adicionar Jogo" : "Editar Jogo"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Time da Casa *</Label>
                <Select value={String(gameForm.homeTeamIndex)} onValueChange={(v) => setGameForm(f => ({ ...f, homeTeamIndex: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t, i) => <SelectItem key={i} value={String(i)}>{t.name || `Time ${i + 1}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Time Visitante *</Label>
                <Select value={String(gameForm.awayTeamIndex)} onValueChange={(v) => setGameForm(f => ({ ...f, awayTeamIndex: parseInt(v) }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {teams.map((t, i) => <SelectItem key={i} value={String(i)}>{t.name || `Time ${i + 1}`}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {gameForm.homeTeamIndex === gameForm.awayTeamIndex && (
              <div className="flex items-center gap-2 text-yellow-400 text-xs"><AlertCircle className="h-3.5 w-3.5" />Os times não podem ser iguais.</div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Data *</Label>
                <Input type="date" value={gameForm.matchDate} onChange={(e) => setGameForm(f => ({ ...f, matchDate: e.target.value }))} />
              </div>
              <div className="space-y-1">
                <Label>Horário</Label>
                <Input type="time" value={gameForm.matchTime} onChange={(e) => setGameForm(f => ({ ...f, matchTime: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Fase / Rodada</Label>
                <Input value={gameForm.phase} onChange={(e) => setGameForm(f => ({ ...f, phase: e.target.value }))} placeholder="Rodada 1" />
              </div>
              <div className="space-y-1">
                <Label>Local</Label>
                <Input value={gameForm.venue} onChange={(e) => setGameForm(f => ({ ...f, venue: e.target.value }))} placeholder="Maracanã" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGameDialogOpen(false)}>Cancelar</Button>
            <Button className="bg-brand hover:bg-brand/90" onClick={saveGame} disabled={!gameForm.matchDate || gameForm.homeTeamIndex === gameForm.awayTeamIndex}>
              {editingGameIdx === null ? "Adicionar" : "Salvar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
}
