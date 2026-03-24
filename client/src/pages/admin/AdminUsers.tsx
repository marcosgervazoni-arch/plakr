import AdminLayout from "@/components/AdminLayout";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Activity,
  Ban,
  Bell,
  Calendar,
  ChevronRight,
  Crown,
  Download,
  Loader2,
  Mail,
  Search,
  Shield,
  Target,
  Trash2,
  Trophy,
  User,
  UserCheck,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

type UserRow = {
  id: number;
  name: string | null;
  email: string | null;
  role: "admin" | "user";
  isBlocked: boolean | null;
  createdAt: Date;
  lastSignedIn: Date | null;
  loginMethod: string | null;
};

type FilterRole = "all" | "admin" | "user" | "blocked";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [inactiveDays, setInactiveDays] = useState<string>("all");
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [blockTarget, setBlockTarget] = useState<{ id: number; name: string; blocked: boolean } | null>(null);
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [notifTitle, setNotifTitle] = useState("");
  const [notifMessage, setNotifMessage] = useState("");
  const [activeTab, setActiveTab] = useState("actions");

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery({ limit: 100 });

  const { data: userActivity, isLoading: activityLoading } = trpc.users.getUserActivity.useQuery(
    { userId: selectedUser?.id ?? 0 },
    { enabled: !!selectedUser && activeTab === "activity" }
  );

  const blockMutation = trpc.users.blockUser.useMutation({
    onSuccess: () => {
      toast.success(blockTarget?.blocked ? "Usuário desbloqueado." : "Usuário bloqueado.");
      setBlockTarget(null);
      refetch();
      // Update selected user if it's the same
      if (selectedUser && blockTarget && selectedUser.id === blockTarget.id) {
        setSelectedUser((u) => u ? { ...u, isBlocked: !blockTarget.blocked } : u);
      }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const promoteAdminMutation = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => {
      toast.success("Usuário promovido a Admin.");
      refetch();
      if (selectedUser) setSelectedUser((u) => u ? { ...u, role: "admin" } : u);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const demoteAdminMutation = trpc.users.demoteFromAdmin.useMutation({
    onSuccess: () => {
      toast.success("Admin rebaixado para usuário.");
      refetch();
      if (selectedUser) setSelectedUser((u) => u ? { ...u, role: "user" } : u);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const removeMutation = trpc.users.removeUser.useMutation({
    onSuccess: () => {
      toast.success("Usuário anonimizado e removido.");
      setRemoveTarget(null);
      setSelectedUser(null);
      refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const sendNotifMutation = trpc.users.sendNotification.useMutation({
    onSuccess: () => {
      toast.success("Notificação enviada.");
      setNotifTitle("");
      setNotifMessage("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const filtered = (users ?? []).filter((u) => {
    const matchSearch =
      !search ||
      u.name?.toLowerCase().includes(search.toLowerCase()) ||
      u.email?.toLowerCase().includes(search.toLowerCase());
    const matchRole =
      filterRole === "all" ||
      (filterRole === "admin" && u.role === "admin") ||
      (filterRole === "user" && u.role === "user" && !u.isBlocked) ||
      (filterRole === "blocked" && u.isBlocked);
    const matchInactive = inactiveDays === "all" || (() => {
      const days = parseInt(inactiveDays);
      if (!u.lastSignedIn) return true; // nunca logou = inativo
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - days);
      return new Date(u.lastSignedIn) <= cutoff;
    })();
    return matchSearch && matchRole && matchInactive;
  });

  return (
    <AdminLayout activeSection="users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Usuários</h1>
            <p className="text-muted-foreground text-sm mt-1">
              {users?.length ?? 0} usuários cadastrados
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            disabled={!users || users.length === 0}
            onClick={() => {
              const rows = filtered;
              const header = "ID,Nome,Email,Função,Bloqueado,Cadastro,Último Login";
              const csv = [header, ...rows.map(u => [
                u.id,
                `"${u.name ?? ""}"`,
                `"${u.email ?? ""}"`,
                u.role,
                u.isBlocked ? "Sim" : "Não",
                new Date(u.createdAt).toLocaleDateString("pt-BR"),
                u.lastSignedIn ? new Date(u.lastSignedIn).toLocaleDateString("pt-BR") : "",
              ].join(","))].join("\n");
              const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `usuarios-apostai-${new Date().toISOString().slice(0,10)}.csv`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          >
            <Download className="h-3.5 w-3.5 mr-1.5" />
            Exportar CSV
          </Button>
        </div>

        {/* Filtros */}
        <div className="flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterRole} onValueChange={(v) => setFilterRole(v as FilterRole)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
              <SelectItem value="user">Usuários</SelectItem>
              <SelectItem value="blocked">Bloqueados</SelectItem>
            </SelectContent>
          </Select>
          <Select value={inactiveDays} onValueChange={setInactiveDays}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Inatividade" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Qualquer atividade</SelectItem>
              <SelectItem value="7">Inativos há 7+ dias</SelectItem>
              <SelectItem value="30">Inativos há 30+ dias</SelectItem>
              <SelectItem value="90">Inativos há 90+ dias</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((u) => (
              <Card
                key={u.id}
                className={`border-border/50 cursor-pointer hover:border-brand/30 transition-colors ${u.isBlocked ? "opacity-60" : ""}`}
                onClick={() => setSelectedUser(u as UserRow)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm truncate">{u.name ?? "Sem nome"}</span>
                      {u.role === "admin" && (
                        <Badge variant="outline" className="text-xs border-brand/30 text-brand">
                          <Shield className="h-2.5 w-2.5 mr-1" />Admin
                        </Badge>
                      )}
                      {u.isBlocked && (
                        <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">
                          <Ban className="h-2.5 w-2.5 mr-1" />Bloqueado
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      {u.email && (
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Mail className="h-3 w-3" />{u.email}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        Desde {format(new Date(u.createdAt), "MMM/yyyy", { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Painel lateral de detalhes ─────────────────────────────────────── */}
      <Sheet open={!!selectedUser} onOpenChange={(open) => !open && setSelectedUser(null)}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col">
          {selectedUser && (
            <>
              <SheetHeader className="p-5 border-b border-border/50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-brand/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-brand" />
                  </div>
                  <div>
                    <SheetTitle className="text-base">{selectedUser.name ?? "Sem nome"}</SheetTitle>
                    <p className="text-xs text-muted-foreground">{selectedUser.email ?? "Sem e-mail"}</p>
                  </div>
                </div>
                <div className="flex gap-2 flex-wrap mt-2">
                  {selectedUser.role === "admin" && (
                    <Badge variant="outline" className="text-xs border-brand/30 text-brand">
                      <Shield className="h-2.5 w-2.5 mr-1" />Admin
                    </Badge>
                  )}
                  {selectedUser.isBlocked && (
                    <Badge variant="outline" className="text-xs border-red-400/30 text-red-400">
                      <Ban className="h-2.5 w-2.5 mr-1" />Bloqueado
                    </Badge>
                  )}
                </div>
              </SheetHeader>

              <ScrollArea className="flex-1">
                <div className="p-5 space-y-5">
                  {/* Info */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Informações</p>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-muted-foreground">Cadastro:</span>
                        <span>{format(new Date(selectedUser.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                      </div>
                      {selectedUser.lastSignedIn && (
                        <div className="flex items-center gap-2 text-sm">
                          <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Último acesso:</span>
                          <span>{format(new Date(selectedUser.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                        </div>
                      )}
                      {selectedUser.loginMethod && (
                        <div className="flex items-center gap-2 text-sm">
                          <Shield className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-muted-foreground">Login via:</span>
                          <span className="capitalize">{selectedUser.loginMethod}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Separator />

                  {/* Ações de papel */}
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Papel & Acesso</p>
                    <div className="flex gap-2 flex-wrap">
                      {selectedUser.role === "admin" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-yellow-400/30 text-yellow-400 hover:bg-yellow-400/10"
                          onClick={() => demoteAdminMutation.mutate({ userId: selectedUser.id })}
                          disabled={demoteAdminMutation.isPending}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Remover Admin
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-brand/30 text-brand hover:bg-brand/10"
                          onClick={() => promoteAdminMutation.mutate({ userId: selectedUser.id })}
                          disabled={promoteAdminMutation.isPending}
                        >
                          <Crown className="h-3.5 w-3.5" />
                          Tornar Admin
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className={`gap-1.5 ${selectedUser.isBlocked ? "border-green-400/30 text-green-400 hover:bg-green-400/10" : "border-red-400/30 text-red-400 hover:bg-red-400/10"}`}
                        onClick={() => setBlockTarget({ id: selectedUser.id, name: selectedUser.name ?? "Usuário", blocked: selectedUser.isBlocked ?? false })}
                      >
                        {selectedUser.isBlocked ? <UserCheck className="h-3.5 w-3.5" /> : <Ban className="h-3.5 w-3.5" />}
                        {selectedUser.isBlocked ? "Desbloquear" : "Bloquear"}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Tabs: Ações / Atividade */}
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <TabsList className="w-full">
                      <TabsTrigger value="actions" className="flex-1 text-xs">
                        <User className="h-3.5 w-3.5 mr-1.5" />Ações
                      </TabsTrigger>
                      <TabsTrigger value="activity" className="flex-1 text-xs">
                        <Activity className="h-3.5 w-3.5 mr-1.5" />Atividade
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="actions" className="mt-4 space-y-4">
                      {/* Enviar notificação */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Enviar Notificação</p>
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Título</Label>
                            <Input
                              value={notifTitle}
                              onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNotifTitle(e.target.value)}
                              placeholder="Ex: Aviso importante"
                              className="text-sm"
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Mensagem</Label>
                            <Textarea
                              value={notifMessage}
                              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotifMessage(e.target.value)}
                              placeholder="Conteúdo da notificação..."
                              className="text-sm resize-none"
                              rows={3}
                            />
                          </div>
                          <Button
                            size="sm"
                            className="w-full gap-1.5 bg-brand hover:bg-brand/90"
                            onClick={() => sendNotifMutation.mutate({ userId: selectedUser.id, title: notifTitle, message: notifMessage })}
                            disabled={!notifTitle.trim() || !notifMessage.trim() || sendNotifMutation.isPending}
                          >
                            {sendNotifMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
                            Enviar Notificação
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      {/* Zona de perigo */}
                      <div className="space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider text-red-400">Zona de Perigo</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 border-red-400/30 text-red-400 hover:bg-red-400/10 w-full"
                          onClick={() => setRemoveTarget({ id: selectedUser.id, name: selectedUser.name ?? "Usuário" })}
                        >
                          <UserX className="h-3.5 w-3.5" />
                          Anonimizar & Remover Usuário
                        </Button>
                        <p className="text-xs text-muted-foreground">
                          Remove nome, e-mail e dados pessoais. Ação irreversível.
                        </p>
                      </div>
                    </TabsContent>

                    <TabsContent value="activity" className="mt-4 space-y-4">
                      {activityLoading ? (
                        <div className="flex items-center justify-center h-24">
                          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                        </div>
                      ) : (
                        <>
                          {/* Resumo de Acesso */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Activity className="h-3.5 w-3.5" />Resumo de Acesso
                            </p>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="p-2 rounded-md bg-muted/30 text-xs">
                                <p className="text-muted-foreground mb-0.5">Cadastro</p>
                                <p className="font-medium">{userActivity?.createdAt ? format(new Date(userActivity.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
                              </div>
                              <div className="p-2 rounded-md bg-muted/30 text-xs">
                                <p className="text-muted-foreground mb-0.5">Último acesso</p>
                                <p className="font-medium">{userActivity?.lastSignedIn ? format(new Date(userActivity.lastSignedIn), "dd/MM/yyyy HH:mm", { locale: ptBR }) : "—"}</p>
                              </div>
                            </div>
                          </div>
                          <Separator />
                          {/* Bolões */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Trophy className="h-3.5 w-3.5" />Bolões ({userActivity?.pools.length ?? 0})
                            </p>
                            {(userActivity?.pools ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhum bolão encontrado.</p>
                            ) : (
                              <div className="space-y-1">
                                {(userActivity?.pools ?? []).map((p) => (
                                  <div key={p.poolId} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs">
                                    <div className="min-w-0">
                                      <span className="font-medium truncate block">{p.poolName}</span>
                                      <span className="text-muted-foreground">{p.joinedAt ? format(new Date(p.joinedAt), "dd/MM/yyyy", { locale: ptBR }) : ""}</span>
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                      {p.rank && <span className="text-muted-foreground">#{p.rank}</span>}
                                      <span className="font-semibold text-brand">{p.totalPoints ?? 0}pts</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <Separator />
                          {/* Palpites recentes */}
                          <div className="space-y-2">
                            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                              <Target className="h-3.5 w-3.5" />Palpites Recentes ({userActivity?.bets.length ?? 0})
                            </p>
                            {(userActivity?.bets ?? []).length === 0 ? (
                              <p className="text-xs text-muted-foreground">Nenhum palpite encontrado.</p>
                            ) : (
                              <div className="space-y-1">
                                {(userActivity?.bets ?? []).map((b, i) => (
                                  <div key={i} className="flex items-center justify-between p-2 rounded-md bg-muted/30 text-xs">
                                    <div className="truncate">
                                      <span className="font-medium">{b.teamAName} {b.predictedScoreA} × {b.predictedScoreB} {b.teamBName}</span>
                                      {b.realScoreA !== null && (
                                        <span className="text-muted-foreground ml-1">(Real: {b.realScoreA}×{b.realScoreB})</span>
                                      )}
                                    </div>
                                    {b.pointsEarned !== null && (
                                      <span className={`font-semibold shrink-0 ml-2 ${b.pointsEarned > 0 ? "text-green-400" : "text-muted-foreground"}`}>
                                        +{b.pointsEarned}pts
                                      </span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {/* Logs sobre este usuário (ações de admin) */}
                          {(userActivity?.logs ?? []).length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <Activity className="h-3.5 w-3.5" />Ações Administrativas ({userActivity?.logs.length ?? 0})
                                </p>
                                <div className="space-y-1">
                                  {(userActivity?.logs ?? []).map((l) => (
                                    <div key={l.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs">
                                      <span className="font-mono text-muted-foreground shrink-0">{format(new Date(l.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                                      <span className={`font-medium truncate flex-1 ${
                                        l.level === "error" ? "text-red-400" : l.level === "warn" ? "text-yellow-400" : "text-foreground"
                                      }`}>{l.action}</span>
                                      {l.ipAddress && <span className="text-muted-foreground shrink-0 font-mono">{l.ipAddress}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                          {/* Ações do próprio usuário como admin */}
                          {(userActivity?.adminActions ?? []).length > 0 && (
                            <>
                              <Separator />
                              <div className="space-y-2">
                                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                  <Shield className="h-3.5 w-3.5" />Ações como Admin ({userActivity?.adminActions.length ?? 0})
                                </p>
                                <div className="space-y-1">
                                  {(userActivity?.adminActions ?? []).map((l) => (
                                    <div key={l.id} className="flex items-start gap-2 p-2 rounded-md bg-muted/30 text-xs">
                                      <span className="font-mono text-muted-foreground shrink-0">{format(new Date(l.createdAt), "dd/MM HH:mm", { locale: ptBR })}</span>
                                      <span className="font-medium truncate flex-1">{l.action}</span>
                                      {l.entityType && <span className="text-muted-foreground shrink-0">{l.entityType}#{l.entityId}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </>
                          )}
                        </>
                      )}
                    </TabsContent>
                  </Tabs>
                </div>
              </ScrollArea>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Confirm block/unblock */}
      <AlertDialog open={!!blockTarget} onOpenChange={() => setBlockTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {blockTarget?.blocked ? "Desbloquear usuário?" : "Bloquear usuário?"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {blockTarget?.blocked
                ? `${blockTarget.name} poderá acessar a plataforma novamente.`
                : `${blockTarget?.name} não conseguirá mais acessar a plataforma.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className={blockTarget?.blocked ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}
              onClick={() => blockTarget && blockMutation.mutate({ userId: blockTarget.id, isBlocked: !blockTarget.blocked })}
            >
              {blockTarget?.blocked ? "Desbloquear" : "Bloquear"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm remove */}
      <AlertDialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-400">
              <Trash2 className="h-4 w-4" />
              Remover usuário permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{removeTarget?.name}</strong> terá seus dados pessoais anonimizados (nome, e-mail, foto).
              Esta ação é <strong>irreversível</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => removeTarget && removeMutation.mutate({ userId: removeTarget.id })}
            >
              Remover Permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
