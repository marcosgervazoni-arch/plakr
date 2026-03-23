import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminPools() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [, navigate] = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
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
      refetch();
    },
    onError: (err) => {
      toast.error("Erro ao excluir", { description: err.message });
      setDeleteTarget(null);
    },
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

  return (
    <AdminLayout activeSection="pools">
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-display">Bolões</h1>
            <p className="text-muted-foreground text-sm mt-1">Visão geral de todos os bolões da plataforma</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex gap-1">
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
            <Button
              size="sm"
              onClick={() => setShowCreate(true)}
              className="gap-2 bg-brand hover:bg-brand/90 h-7"
            >
              <Plus className="h-3.5 w-3.5" />
              Novo Bolão
            </Button>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou slug..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((p) => (
              <Card key={p.id} className="border-border/50 hover:border-brand/30 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div
                    className="w-9 h-9 rounded-lg bg-brand/10 flex items-center justify-center shrink-0 cursor-pointer"
                    onClick={() => navigate(`/pool/${p.slug}`)}
                  >
                    {p.logoUrl ? (
                      <img src={p.logoUrl} alt={p.name} className="w-7 h-7 object-contain rounded" />
                    ) : (
                      <Trophy className="h-4 w-4 text-brand" />
                    )}
                  </div>
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/pool/${p.slug}`)}
                  >
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
                        {p.status === "active" ? "Ativo" : p.status === "finished" ? "Encerrado" : p.status === "deleted" ? "Excluído" : "Arquivado"}
                      </Badge>
                      <Badge variant="outline" className={`text-xs ${
                        p.accessType === "public" ? "border-blue-400/30 text-blue-400" : "border-muted text-muted-foreground"
                      }`}>
                        {p.accessType === "public" ? <Globe className="h-2.5 w-2.5 mr-1 inline" /> : <Lock className="h-2.5 w-2.5 mr-1 inline" />}
                        {p.accessType === "public" ? "Público" : p.accessType === "private_code" ? "Código" : "Link"}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.slug}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block mr-2">
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-xs font-medium">
                      {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      title="Ver bolão"
                      onClick={(e) => { e.stopPropagation(); navigate(`/pool/${p.slug}`); }}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    {p.status !== "deleted" && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget({ id: p.id, name: p.name });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
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
