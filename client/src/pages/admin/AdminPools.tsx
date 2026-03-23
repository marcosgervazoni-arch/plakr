import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  Loader2,
  Search,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function AdminPools() {
  const [search, setSearch] = useState("");
  const [, navigate] = useLocation();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);

  const { data: pools, isLoading, refetch } = trpc.pools.adminList.useQuery({ limit: 100 });

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

  const filtered = (pools ?? []).filter(
    (p) =>
      !search ||
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.slug.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <AdminLayout activeSection="pools">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Bolões</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral de todos os bolões da plataforma</p>
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
                    </div>
                    <p className="text-xs text-muted-foreground font-mono mt-0.5">{p.slug}</p>
                  </div>
                  <div className="text-right shrink-0 hidden sm:block mr-2">
                    <p className="text-xs text-muted-foreground">Criado em</p>
                    <p className="text-xs font-medium">
                      {format(new Date(p.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {p.status !== "deleted" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget({ id: p.id, name: p.name });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
            {filtered.length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum bolão encontrado.
              </div>
            )}
          </div>
        )}
      </div>

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
