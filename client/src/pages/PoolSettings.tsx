import { useAuth } from "@/_core/hooks/useAuth";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  ArrowLeft,
  Copy,
  Loader2,
  Lock,
  Settings,
  Star,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function PoolSettings() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const { data, isLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug! },
    { enabled: !!slug }
  );

  const [poolForm, setPoolForm] = useState({ name: "", description: "" });
  const [rulesForm, setRulesForm] = useState({
    exactScorePoints: 10,
    correctResultPoints: 5,
    totalGoalsPoints: 2,
    goalDiffPoints: 2,
    zebraPoints: 3,
    zebraEnabled: true,
    bettingDeadlineMinutes: 60,
  });

  useEffect(() => {
    if (data?.pool) {
      setPoolForm({ name: data.pool.name, description: data.pool.description ?? "" });
    }
    if (data?.rules) {
      setRulesForm({
        exactScorePoints: data.rules.exactScorePoints,
        correctResultPoints: data.rules.correctResultPoints,
        totalGoalsPoints: data.rules.totalGoalsPoints,
        goalDiffPoints: data.rules.goalDiffPoints,
        zebraPoints: data.rules.zebraPoints,
        zebraEnabled: data.rules.zebraEnabled,
        bettingDeadlineMinutes: data.rules.bettingDeadlineMinutes,
      });
    }
  }, [data]);

  const utils = trpc.useUtils();

  const updatePool = trpc.pools.update.useMutation({
    onSuccess: () => {
      toast.success("Bolão atualizado!");
      utils.pools.getBySlug.invalidate({ slug: slug! });
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const updateRules = trpc.pools.updateScoringRules.useMutation({
    onSuccess: () => {
      toast.success("Regras de pontuação salvas!");
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  const { data: membersRaw } = trpc.pools.getMembers.useQuery(
    { poolId: data?.pool.id ?? 0 },
    { enabled: !!data?.pool.id }
  );
  const members = Array.isArray(membersRaw) ? membersRaw : (membersRaw?.items ?? []);

  const removeMember = trpc.pools.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Membro removido.");
      utils.pools.getMembers.invalidate({ poolId: data?.pool.id });
    },
    onError: (err) => toast.error("Erro", { description: err.message }),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Bolão não encontrado.</p>
        <Link href="/dashboard"><Button variant="outline">Voltar</Button></Link>
      </div>
    );
  }

  const { pool, myRole } = data;
  const isOrganizer = myRole === "organizer" || user?.role === "admin";
  const isPro = pool.plan === "pro";
  const [, navigate] = useLocation();

  const deletePool = trpc.pools.delete.useMutation({
    onSuccess: () => {
      toast.success("Bolão excluído com sucesso.");
      navigate("/dashboard");
    },
    onError: (err) => toast.error("Erro ao excluir", { description: err.message }),
  });

  if (!isOrganizer) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <Lock className="w-12 h-12 text-muted-foreground/30" />
        <p className="text-muted-foreground">Apenas o organizador pode acessar as configurações.</p>
        <Link href={`/pool/${slug}`}><Button variant="outline">Voltar ao bolão</Button></Link>
      </div>
    );
  }

  const inviteLink = `${window.location.origin}/join/${pool.inviteToken}`;

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/80 backdrop-blur-sm">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/pool/${slug}`}>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Settings className="w-4 h-4 text-brand-400" />
            <h1 className="font-semibold text-sm">Configurações — {pool.name}</h1>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        <Tabs defaultValue="general">
          <TabsList className="mb-6 bg-card border border-border/50">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="scoring">
              Pontuação
              {!isPro && <Lock className="w-3 h-3 ml-1 text-muted-foreground" />}
            </TabsTrigger>
            <TabsTrigger value="members">Membros</TabsTrigger>
            <TabsTrigger value="invite">Convite</TabsTrigger>
          </TabsList>

          {/* GENERAL */}
          <TabsContent value="general">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Informações do Bolão</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Bolão</Label>
                  <Input
                    value={poolForm.name}
                    onChange={(e) => setPoolForm((p) => ({ ...p, name: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={poolForm.description}
                    onChange={(e) => setPoolForm((p) => ({ ...p, description: e.target.value }))}
                    rows={3}
                  />
                </div>
                <Button
                  className="bg-brand-600 hover:bg-brand-700 text-white"
                  onClick={() => updatePool.mutate({ poolId: pool.id, ...poolForm })}
                  disabled={updatePool.isPending}
                >
                  {updatePool.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Salvar
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCORING */}
          <TabsContent value="scoring">
            {!isPro ? (
              <Card className="bg-card border-border/50 border-dashed">
                <CardContent className="py-12 text-center">
                  <Lock className="w-10 h-10 mx-auto mb-4 text-muted-foreground/30" />
                  <h3 className="font-semibold mb-2">Recurso exclusivo do Plano Pro</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Personalize as regras de pontuação do seu bolão com o Plano Pro.
                  </p>
                  <Badge className="bg-brand-600/20 text-brand-400 border-brand-500/30">
                    <Star className="w-3 h-3 mr-1" /> Plano Pro
                  </Badge>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">Regras de Pontuação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: "exactScorePoints", label: "Placar exato (pts)" },
                      { key: "correctResultPoints", label: "Resultado correto (pts)" },
                      { key: "totalGoalsPoints", label: "Bônus total de gols (pts)" },
                      { key: "goalDiffPoints", label: "Bônus diferença de gols (pts)" },
                      { key: "zebraPoints", label: "Bônus zebra (pts)" },
                      { key: "bettingDeadlineMinutes", label: "Prazo antes do jogo (min)" },
                    ].map((f) => (
                      <div key={f.key} className="space-y-2">
                        <Label className="text-sm">{f.label}</Label>
                        <Input
                          type="number"
                          min={0}
                          value={(rulesForm as any)[f.key]}
                          onChange={(e) =>
                            setRulesForm((p) => ({ ...p, [f.key]: Number(e.target.value) }))
                          }
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rulesForm.zebraEnabled}
                      onCheckedChange={(v) => setRulesForm((p) => ({ ...p, zebraEnabled: v }))}
                    />
                    <Label>Bônus zebra habilitado</Label>
                  </div>
                  <Button
                    className="bg-brand-600 hover:bg-brand-700 text-white"
                    onClick={() => updateRules.mutate({ poolId: pool.id, ...rulesForm })}
                    disabled={updateRules.isPending}
                  >
                    {updateRules.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    Salvar Regras
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* MEMBERS */}
          <TabsContent value="members">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="w-4 h-4" /> Membros ({members?.length ?? 0})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {members?.map(({ member, user: memberUser }) => (
                  <div key={member.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-brand-500/10 flex items-center justify-center text-xs font-semibold text-brand-400">
                        {memberUser.name?.charAt(0)?.toUpperCase() ?? "?"}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{memberUser.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {member.role === "organizer" ? "Organizador" : "Participante"}
                        </Badge>
                      </div>
                    </div>
                    {member.role !== "organizer" && memberUser.id !== user?.id && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 border-red-500/40 text-red-400 hover:bg-red-500/10"
                        onClick={() => removeMember.mutate({ poolId: pool.id, userId: memberUser.id })}
                        disabled={removeMember.isPending}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          {/* INVITE */}
          <TabsContent value="invite">
            <Card className="bg-card border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Link de Convite</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Compartilhe este link para convidar participantes para o bolão.
                </p>
                <div className="flex gap-2">
                  <Input value={inviteLink} readOnly className="text-sm font-mono" />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(inviteLink);
                      toast.success("Link copiado!");
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <div className="pt-2">
                  <p className="text-sm font-medium mb-1">Código de convite</p>
                  <div className="inline-flex items-center gap-2 bg-brand-500/10 border border-brand-500/20 rounded-lg px-4 py-2">
                    <span className="font-mono text-lg font-bold text-brand-400 tracking-widest">
                      {pool.inviteCode}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => {
                        navigator.clipboard.writeText(pool.inviteCode ?? "");
                        toast.success("Código copiado!");
                      }}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* DANGER ZONE */}
        <div className="mt-8 border border-red-500/30 rounded-xl p-6 bg-red-500/5">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h3 className="font-semibold text-red-400 text-sm">Zona de Perigo</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            A exclusão do bolão é permanente e irreversível. Todos os palpites e dados serão removidos e todos os participantes serão notificados.
          </p>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" className="border-red-500/40 text-red-400 hover:bg-red-500/10 gap-2">
                <Trash2 className="w-4 h-4" />
                Excluir Bolão
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Excluir bolão "{pool.name}"?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação é <strong>permanente e irreversível</strong>. Todos os {members?.length ?? 0} participantes serão notificados e todos os palpites serão removidos.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => deletePool.mutate({ poolId: pool.id })}
                  disabled={deletePool.isPending}
                >
                  {deletePool.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
                  Sim, excluir bolão
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </main>
    </div>
  );
}
