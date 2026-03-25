import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Globe,
  Loader2,
  Plus,
  Settings,
  Shield,
  Trophy,
  Users,
  Calendar,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

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

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="w-8 h-8">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-brand-400" />
              <h1 className="font-semibold">Painel Super Admin</h1>
            </div>
          </div>
          <Badge className="bg-brand-600/20 text-brand-400 border-brand-500/30">Admin</Badge>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Tabs defaultValue="tournaments">
          <TabsList className="mb-6 bg-card border border-border/50">
            <TabsTrigger value="tournaments">
              <Trophy className="w-4 h-4 mr-2" /> Campeonatos
            </TabsTrigger>
            <TabsTrigger value="users">
              <Users className="w-4 h-4 mr-2" /> Usuários
            </TabsTrigger>
            <TabsTrigger value="settings">
              <Settings className="w-4 h-4 mr-2" /> Configurações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tournaments">
            <TournamentsTab />
          </TabsContent>

          <TabsContent value="users">
            <UsersTab />
          </TabsContent>

          <TabsContent value="settings">
            <SettingsTab />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ─── TOURNAMENTS TAB ──────────────────────────────────────────────────────────

function TournamentsTab() {
  const [showCreate, setShowCreate] = useState(false);
  const [showAddGame, setShowAddGame] = useState<number | null>(null);
  const [newTournament, setNewTournament] = useState({ name: "", slug: "" });
  const utils = trpc.useUtils();

  const { data: tournaments, isLoading } = trpc.tournaments.listGlobal.useQuery();

  const createTournament = trpc.tournaments.create.useMutation({
    onSuccess: () => {
      toast.success("Campeonato criado!");
      utils.tournaments.listGlobal.invalidate();
      setShowCreate(false);
      setNewTournament({ name: "", slug: "" });
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold">Campeonatos Globais</h2>
        <Button size="sm" className="bg-brand-600 hover:bg-brand-700 text-white" onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4 mr-2" /> Novo Campeonato
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="space-y-3">
          {tournaments?.map((t) => (
            <Card key={t.id} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-brand-500/10 flex items-center justify-center">
                    <Globe className="w-4 h-4 text-brand-400" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">{t.name}</p>
                    <p className="text-xs text-muted-foreground">/{t.slug}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={t.status === "active" ? "border-green-500/40 text-green-400" : ""}>
                    {t.status}
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setShowAddGame(t.id)}
                  >
                    <Calendar className="w-3 h-3 mr-1" /> Adicionar Jogo
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {(!tournaments || tournaments.length === 0) && (
            <div className="text-center py-12 text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Nenhum campeonato cadastrado.</p>
            </div>
          )}
        </div>
      )}

      {/* Create Tournament Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Novo Campeonato</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input
                value={newTournament.name}
                onChange={(e) => {
                  const name = e.target.value;
                  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
                  setNewTournament({ name, slug });
                }}
                placeholder="Copa do Mundo 2026"
              />
            </div>
            <div className="space-y-2">
              <Label>Slug</Label>
              <Input
                value={newTournament.slug}
                onChange={(e) => setNewTournament((p) => ({ ...p, slug: e.target.value }))}
                placeholder="copa-do-mundo-2026"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setShowCreate(false)} className="flex-1">Cancelar</Button>
              <Button
                className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => createTournament.mutate({ ...newTournament, isGlobal: true })}
                disabled={createTournament.isPending}
              >
                {createTournament.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Game Dialog */}
      {showAddGame && (
        <AddGameDialog tournamentId={showAddGame} onClose={() => setShowAddGame(null)} />
      )}
    </div>
  );
}

function AddGameDialog({ tournamentId, onClose }: { tournamentId: number; onClose: () => void }) {
  const [form, setForm] = useState({
    teamAName: "",
    teamBName: "",
    phase: "group_stage",
    matchDate: "",
    venue: "",
  });
  const utils = trpc.useUtils();

  const addGame = trpc.tournaments.addGame.useMutation({
    onSuccess: () => {
      toast.success("Jogo adicionado!");
      utils.tournaments.getById.invalidate({ id: tournamentId });
      onClose();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="bg-card border-border">
        <DialogHeader>
          <DialogTitle>Adicionar Jogo</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Time A</Label>
              <Input value={form.teamAName} onChange={(e) => setForm((p) => ({ ...p, teamAName: e.target.value }))} placeholder="Brasil" />
            </div>
            <div className="space-y-2">
              <Label>Time B</Label>
              <Input value={form.teamBName} onChange={(e) => setForm((p) => ({ ...p, teamBName: e.target.value }))} placeholder="Argentina" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Fase</Label>
            <Input value={form.phase} onChange={(e) => setForm((p) => ({ ...p, phase: e.target.value }))} placeholder="group_stage" />
          </div>
          <div className="space-y-2">
            <Label>Data e Hora</Label>
            <Input type="datetime-local" value={form.matchDate} onChange={(e) => setForm((p) => ({ ...p, matchDate: e.target.value }))} />
          </div>
          <div className="space-y-2">
            <Label>Local (opcional)</Label>
            <Input value={form.venue} onChange={(e) => setForm((p) => ({ ...p, venue: e.target.value }))} placeholder="Estádio Nacional" />
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => addGame.mutate({
                tournamentId,
                teamAName: form.teamAName,
                teamBName: form.teamBName,
                phase: form.phase,
                matchDate: new Date(form.matchDate).getTime(),
                venue: form.venue || undefined,
              })}
              disabled={addGame.isPending}
            >
              {addGame.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Adicionar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── USERS TAB ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { data: usersData, isLoading } = trpc.users.list.useQuery({ limit: 50 });
  const users = usersData?.items;
  const utils = trpc.useUtils();

  const blockUser = trpc.users.blockUser.useMutation({
    onSuccess: () => {
      toast.success("Status do usuário atualizado.");
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const promoteAdmin = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário promovido a admin.");
      utils.users.list.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  return (
    <div>
      <h2 className="font-semibold mb-4">Usuários ({users?.length ?? 0})</h2>
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
        </div>
      ) : (
        <div className="space-y-2">
          {users?.map((u) => (
            <Card key={u.id} className="bg-card border-border/50">
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-brand-500/10 flex items-center justify-center text-sm font-semibold text-brand-400 shrink-0">
                    {u.name?.charAt(0)?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className={u.role === "admin" ? "border-brand-500/40 text-brand-400" : ""}>
                    {u.role}
                  </Badge>
                  {u.role !== "admin" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => promoteAdmin.mutate({ userId: u.id })}
                      disabled={promoteAdmin.isPending}
                    >
                      Promover
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className={`text-xs h-7 ${(u as any).isBlocked ? "border-green-500/40 text-green-400" : "border-red-500/40 text-red-400"}`}
                    onClick={() => blockUser.mutate({ userId: u.id, isBlocked: !(u as any).isBlocked })}
                    disabled={blockUser.isPending}
                  >
                    {(u as any).isBlocked ? "Desbloquear" : "Bloquear"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── SETTINGS TAB ─────────────────────────────────────────────────────────────

function SettingsTab() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const [form, setForm] = useState<Record<string, number>>({});
  const utils = trpc.useUtils();

  const updateSettings = trpc.platform.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas!");
      utils.platform.getSettings.invalidate();
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-brand-400" />
      </div>
    );
  }

  const getValue = (key: string, defaultVal: number) =>
    form[key] !== undefined ? form[key] : (settings as any)?.[key] ?? defaultVal;

  const fields = [
    { key: "freeMaxParticipants", label: "Máx. participantes (plano gratuito)", default: 50 },
    { key: "freeMaxPools", label: "Máx. bolões (plano gratuito)", default: 2 },
    { key: "poolArchiveDays", label: "Dias para exclusão após encerramento", default: 10 },
    { key: "defaultScoringExact", label: "Pontos por placar exato", default: 10 },
    { key: "defaultScoringCorrect", label: "Pontos por resultado correto", default: 5 },
    { key: "defaultScoringBonusGoals", label: "Bônus total de gols", default: 2 },
    { key: "defaultScoringBonusDiff", label: "Bônus diferença de gols", default: 2 },
    { key: "defaultScoringBonusUpset", label: "Bônus zebra", default: 3 },
  ];

  return (
    <div>
      <h2 className="font-semibold mb-4">Configurações da Plataforma</h2>
      <Card className="bg-card border-border/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.key} className="space-y-2">
                <Label className="text-sm">{f.label}</Label>
                <Input
                  type="number"
                  value={getValue(f.key, f.default)}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, [f.key]: Number(e.target.value) }))
                  }
                  className="h-9"
                />
              </div>
            ))}
          </div>
          <Button
            className="mt-6 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => updateSettings.mutate(form as any)}
            disabled={updateSettings.isPending}
          >
            {updateSettings.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
