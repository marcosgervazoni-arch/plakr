import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Crown,
  ExternalLink,
  Globe,
  Lock,
  Loader2,
  Plus,
  Search,
  Trash2,
  Trophy,
  Users,
  Save,
  Settings2,
  CalendarDays,
  ChevronRight,
  UserCheck,
  UserX,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

type Pool = {
  id: number;
  name: string;
  slug: string;
  status: "active" | "finished" | "archived" | "deleted";
  accessType: "public" | "private_code" | "private_link";
  plan: "free" | "pro";
  logoUrl: string | null;
  createdAt: Date | string;
  ownerId: number;
  tournamentId: number | null;
  description: string | null;
  memberCount: number;
  planExpiresAt?: Date | string | null;
  stripeSubscriptionId?: string | null;
};

function PoolMembersList({ poolId }: { poolId: number }) {
  const { data: membersRaw, isLoading } = trpc.pools.getMembers.useQuery({ poolId });
  const members = Array.isArray(membersRaw) ? membersRaw : (membersRaw?.items ?? []);

  return (
    <div className="mb-4">
      <h3 className="text-sm font-semibold flex items-center gap-2 mb-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        Participantes
        {membersRaw && (
          <Badge variant="outline" className="text-xs h-4 px-1 ml-1">{members.length}</Badge>
        )}
      </h3>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        </div>
      ) : members && members.length > 0 ? (
        <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
          {members.map((m) => {
            const user = (m as any).user ?? m;
            const member = (m as any).member ?? m;
            const name = user.name ?? "Usuário";
            const avatarUrl = user.avatarUrl ?? user.avatar_url;
            const role = member.role ?? (m as any).role;
            const userId = member.userId ?? (m as any).userId ?? user.id;
            return (
              <div key={userId} className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-muted/20 transition-colors">
                <Avatar className="h-6 w-6 shrink-0">
                  <AvatarImage src={avatarUrl ?? undefined} />
                  <AvatarFallback className="text-xs">{name.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{name}</p>
                </div>
                {role === "organizer" ? (
                  <Badge variant="outline" className="text-xs h-4 px-1 border-yellow-400/30 text-yellow-400">
                    <Crown className="h-2.5 w-2.5 mr-0.5" />Org
                  </Badge>
                ) : (
                  <UserCheck className="h-3.5 w-3.5 text-muted-foreground/50" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">Nenhum participante encontrado.</p>
      )}
    </div>
  );
}

export default function AdminPools() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, navigate] = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedPool, setSelectedPool] = useState<Pool | null>(null);
  const [editForm, setEditForm] = useState<{
    name: string;
    status: "active" | "finished" | "deleted";
    accessType: "public" | "private_code" | "private_link";
    description: string;
  } | null>(null);

  const [form, setForm] = useState({
    name: "",
    tournamentId: "",
    accessType: "public" as "public" | "private_code" | "private_link",
    description: "",
  });

  const { data: pools, isLoading, refetch } = trpc.pools.adminList.useQuery({ limit: 200 });
  const { data: tournaments } = trpc.tournaments.list.useQuery();

  const deletePool = trpc.pools.delete.useMutation({
    onSuccess: () => {
      toast.success("Bolão excluído com sucesso.");
      setDeleteTarget(null);
      setSelectedPool(null);
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao excluir", { description: err.message });
      setDeleteTarget(null);
    },
  });

  const updatePool = trpc.pools.adminUpdatePool.useMutation({
    onSuccess: () => {
      toast.success("Bolão atualizado com sucesso!");
      refetch();
      if (selectedPool && editForm) {
        setSelectedPool({ ...selectedPool, ...editForm });
      }
    },
    onError: (err) => toast.error("Erro ao atualizar", { description: err.message }),
  });

  const [grantProDays, setGrantProDays] = useState("30");
  const grantPro = trpc.adminDashboard.grantPoolPro.useMutation({
    onSuccess: () => {
      toast.success("Plano Pro concedido com sucesso!");
      refetch();
      if (selectedPool) setSelectedPool({ ...selectedPool, plan: "pro" });
    },
    onError: (err: { message: string }) => toast.error("Erro ao conceder Pro", { description: err.message }),
  });
  const revokePro = trpc.adminDashboard.revokePoolPro.useMutation({
    onSuccess: () => {
      toast.success("Plano Pro revogado.");
      refetch();
      if (selectedPool) setSelectedPool({ ...selectedPool, plan: "free", planExpiresAt: null });
    },
    onError: (err: { message: string }) => toast.error("Erro ao revogar Pro", { description: err.message }),
  });
  const createPool = trpc.pools.adminCreate.useMutation({
    onSuccess: (data) => {
      toast.success("Bolão criado com sucesso!");
      setShowCreate(false);
      setForm({ name: "", tournamentId: "", accessType: "public", description: "" });
      refetch();
      navigate(`/pool/${data.slug}`);
    },
    onError: (err) => toast.error("Erro ao criar bolão", { description: err.message }),
  });

  const handleCreate = () => {
    if (!form.name || !form.tournamentId) return toast.error("Nome e campeonato são obrigatórios.");
    createPool.mutate({
      name: form.name,
      tournamentId: parseInt(form.tournamentId),
      accessType: form.accessType,
      description: form.description || undefined,
    });
  };

  const handleSavePool = () => {
    if (!selectedPool || !editForm) return;
    updatePool.mutate({
      poolId: selectedPool.id,
      name: editForm.name,
      status: editForm.status,
      accessType: editForm.accessType,
      description: editForm.description,
    });
  };

  const openPanel = (pool: Pool) => {
    setSelectedPool(pool);
    setEditForm({
      name: pool.name,
      status: pool.status === "archived" ? "finished" : pool.status as "active" | "finished" | "deleted",
      accessType: pool.accessType,
      description: pool.description ?? "",
    });
  };

  const filtered = (pools ?? []).filter((p) => {
    const matchSearch = !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    all: (pools ?? []).length,
    active: (pools ?? []).filter(p => p.status === "active").length,
    finished: (pools ?? []).filter(p => p.status === "finished").length,
    deleted: (pools ?? []).filter(p => p.status === "deleted").length,
  };

  const statusLabel = (s: string) => {
    if (s === "active") return "Ativo";
    if (s === "finished") return "Encerrado";
    if (s === "deleted") return "Excluído";
    return "Arquivado";
  };

  return (
    <AdminLayout activeSection="pools">
      <div className="space-y-6">
        {/* Header */}
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold font-display">Bolões</h1>
              <p className="text-muted-foreground text-sm mt-1">Visão geral de todos os bolões da plataforma</p>
            </div>
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="gap-2 bg-brand hover:bg-brand/90 shrink-0"
            >
              <Plus className="h-4 w-4" />
              Novo Bolão
            </Button>
          </div>
          <div className="flex gap-1 flex-wrap">
            {(["all", "active", "finished", "deleted"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={statusFilter === s ? "default" : "outline"}
                className={`text-xs h-7 ${statusFilter === s ? "bg-brand hover:bg-brand/90" : ""}`}
                onClick={() => setStatusFilter(s)}
              >
                {s === "all" ? "Todos" : s === "active" ? "Ativos" : s === "finished" ? "Encerrados" : "Excluídos"}
                <Badge variant="outline" className="ml-1.5 text-xs h-4 px-1">{counts[s]}</Badge>
              </Button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Card
                key={p.id}
                className="border-border/50 hover:border-brand/30 transition-colors cursor-pointer"
                onClick={() => openPanel(p)}
              >
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                    {p.logoUrl ? (
                      <img src={p.logoUrl} alt={p.name} className="w-7 h-7 object-contain rounded" />
                    ) : (
                      <Trophy className="h-4 w-4 text-brand" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{p.name}</p>
                      {p.plan === "pro" && (
                        <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">
                          <Crown className="h-2.5 w-2.5 mr-1" />Pro
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className={`text-xs ${
                          p.status === "active"
                            ? "border-green-400/30 text-green-400"
                            : p.status === "deleted"
                            ? "border-red-400/30 text-red-400"
                            : "border-muted text-muted-foreground"
                        }`}
                      >
                        {statusLabel(p.status)}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${
                        p.accessType === "public" ? "border-blue-400/30 text-blue-400" : "border-muted text-muted-foreground"
                      }`}>
                        {p.accessType === "public" ? <Globe className="h-2.5 w-2.5 mr-1 inline" /> : <Lock className="h-2.5 w-2.5 mr-1 inline" />}
                        {p.accessType === "public" ? "Público" : p.accessType === "private_code" ? "Código" : "Link"}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5">
                      <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {p.memberCount} participante{p.memberCount !== 1 ? "s" : ""}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block mr-2">
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-xs font-medium">
                      {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                {search ? "Nenhum bolão encontrado para esta busca." : "Nenhum bolão cadastrado."}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sheet: Painel Gerenciável */}
      <Sheet open={!!selectedPool} onOpenChange={(open) => !open && setSelectedPool(null)}>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          {selectedPool && editForm && (
            <>
              <SheetHeader className="pb-4">
                <SheetTitle className="flex items-center gap-2">
                  <Settings2 className="h-5 w-5 text-brand" />
                  Gerenciar Bolão
                </SheetTitle>
              </SheetHeader>

              {/* Info do bolão */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 mb-4">
                <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
                  {selectedPool.logoUrl ? (
                    <img src={selectedPool.logoUrl} alt={selectedPool.name} className="w-8 h-8 object-contain rounded" />
                  ) : (
                    <Trophy className="h-5 w-5 text-brand" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{selectedPool.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{selectedPool.slug}</p>
                </div>
              </div>

              {/* Stats rápidas */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="text-center p-2 rounded-lg bg-muted/20">
                  <p className="text-lg font-bold text-brand">{selectedPool.memberCount}</p>
                  <p className="text-xs text-muted-foreground">Participantes</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/20">
                  <p className="text-sm font-bold capitalize">{selectedPool.plan}</p>
                  <p className="text-xs text-muted-foreground">Plano</p>
                </div>
                <div className="text-center p-2 rounded-lg bg-muted/20">
                  <p className="text-xs font-bold">
                    {format(new Date(selectedPool.createdAt), "dd/MM/yy", { locale: ptBR })}
                  </p>
                  <p className="text-xs text-muted-foreground">Criado</p>
                </div>
              </div>

              {/* Lista de Participantes */}
              <PoolMembersList poolId={selectedPool.id} />

              {/* Botão Acessar o Bolão */}
              <Button
                variant="outline"
                className="w-full mb-4 gap-2"
                onClick={() => {
                  navigate(`/pool/${selectedPool.slug}`);
                  setSelectedPool(null);
                }}
              >
                <ExternalLink className="h-4 w-4" />
                Acessar o Bolão
              </Button>

              <Separator className="mb-4" />

              {/* Formulário de edição */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold flex items-center gap-2">
                  <Settings2 className="h-4 w-4 text-muted-foreground" />
                  Configurações
                </h3>

                <div className="space-y-1">
                  <Label className="text-xs">Nome do Bolão</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(f => f ? { ...f, name: e.target.value } : f)}
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Status</Label>
                  <Select
                    value={editForm.status}
                    onValueChange={(v) => setEditForm(f => f ? { ...f, status: v as typeof f.status } : f)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Ativo</SelectItem>
                      <SelectItem value="finished">Encerrado</SelectItem>
                      <SelectItem value="deleted">Excluído</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Tipo de Acesso</Label>
                  <Select
                    value={editForm.accessType}
                    onValueChange={(v) => setEditForm(f => f ? { ...f, accessType: v as typeof f.accessType } : f)}
                  >
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="public">Público</SelectItem>
                      <SelectItem value="private_link">Por Link</SelectItem>
                      <SelectItem value="private_code">Por Código</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Descrição</Label>
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(f => f ? { ...f, description: e.target.value } : f)}
                    className="resize-none h-20 text-sm"
                    placeholder="Descrição do bolão..."
                  />
                </div>

                {/* Datas */}
                {selectedPool.planExpiresAt && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded-lg bg-muted/20">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Plano Pro expira em {format(new Date(selectedPool.planExpiresAt), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                )}

                {/* Botão Salvar */}
                <Button
                  className="w-full bg-brand hover:bg-brand/90 gap-2"
                  onClick={handleSavePool}
                  disabled={updatePool.isPending}
                >
                  {updatePool.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin" />
                    : <Save className="h-4 w-4" />
                  }
                  Salvar Alterações
                </Button>

                <Separator />

                {/* Gestão de Plano */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Crown className="h-4 w-4 text-yellow-400" />
                    Gestão de Plano
                  </h3>
                  {selectedPool.plan === "free" ? (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select value={grantProDays} onValueChange={setGrantProDays}>
                          <SelectTrigger className="h-9 text-sm flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="7">7 dias</SelectItem>
                            <SelectItem value="30">30 dias</SelectItem>
                            <SelectItem value="90">90 dias</SelectItem>
                            <SelectItem value="365">1 ano</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          className="bg-yellow-500 hover:bg-yellow-600 text-white gap-1 h-9"
                          disabled={grantPro.isPending}
                          onClick={() => grantPro.mutate({ poolId: selectedPool.id, durationDays: parseInt(grantProDays) })}
                        >
                          {grantPro.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                          Conceder Pro
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">Concede acesso Pro gratuito por período determinado.</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-yellow-400/10 border border-yellow-400/20">
                        <Crown className="h-4 w-4 text-yellow-400" />
                        <span className="text-xs text-yellow-400 font-medium">Plano Pro ativo</span>
                        {selectedPool.planExpiresAt && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            até {format(new Date(selectedPool.planExpiresAt), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        className="w-full border-yellow-400/30 text-yellow-500 hover:bg-yellow-400/10 gap-2 h-9"
                        disabled={revokePro.isPending}
                        onClick={() => revokePro.mutate({ poolId: selectedPool.id })}
                      >
                        {revokePro.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Crown className="h-3.5 w-3.5" />}
                        Revogar Plano Pro
                      </Button>
                    </div>
                  )}
                </div>

                <Separator />

                {/* Zona de perigo */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-red-400 uppercase tracking-wide">Zona de Perigo</h3>
                  {selectedPool.status !== "deleted" && (
                    <Button
                      variant="outline"
                      className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 gap-2"
                      onClick={() => {
                        setDeleteTarget({ id: selectedPool.id, name: selectedPool.name });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Excluir Bolão
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Modal: Criar Bolão */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-brand" />
              Novo Bolão
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1">
              <Label>Nome do Bolão *</Label>
              <Input
                placeholder="Ex: Bolão da Copa 2026"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <Label>Campeonato *</Label>
              <Select
                value={form.tournamentId}
                onValueChange={(v) => setForm((f) => ({ ...f, tournamentId: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um campeonato" />
                </SelectTrigger>
                <SelectContent>
                  {(tournaments ?? []).map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name} {t.season ? `(${t.season})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Tipo de Acesso</Label>
              <div className="flex gap-2">
                {[
                  { value: "public", label: "Público", icon: <Globe className="h-3.5 w-3.5 mr-1" /> },
                  { value: "private_link", label: "Por Link", icon: <Lock className="h-3.5 w-3.5 mr-1" /> },
                  { value: "private_code", label: "Por Código", icon: <Lock className="h-3.5 w-3.5 mr-1" /> },
                ].map((opt) => (
                  <Button
                    key={opt.value}
                    type="button"
                    variant={form.accessType === opt.value ? "default" : "outline"}
                    size="sm"
                    className={`flex-1 text-xs ${form.accessType === opt.value ? "bg-brand hover:bg-brand/90" : ""}`}
                    onClick={() => setForm((f) => ({ ...f, accessType: opt.value as typeof f.accessType }))}
                  >
                    {opt.icon}{opt.label}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-1">
              <Label>Descrição <span className="text-muted-foreground text-xs">(opcional)</span></Label>
              <Textarea
                placeholder="Descreva o bolão..."
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="resize-none h-20"
              />
            </div>

            <Button
              className="w-full bg-brand hover:bg-brand/90"
              onClick={handleCreate}
              disabled={createPool.isPending || !form.name || !form.tournamentId}
            >
              {createPool.isPending
                ? <Loader2 className="h-4 w-4 animate-spin mr-2" />
                : <Plus className="h-4 w-4 mr-2" />
              }
              Criar Bolão
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Delete Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir bolão "{deleteTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é <strong>permanente e irreversível</strong>. Todos os participantes serão notificados e todos os palpites serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={() => deleteTarget && deletePool.mutate({ poolId: deleteTarget.id })}
              disabled={deletePool.isPending}
            >
              {deletePool.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Sim, excluir bolão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
