import AdminLayout from "@/components/AdminLayout";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Ban,
  Crown,
  Loader2,
  Mail,
  Search,
  Shield,
  User,
  UserCheck,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [blockTarget, setBlockTarget] = useState<{ id: number; name: string; blocked: boolean } | null>(null);

  const { data: users, isLoading, refetch } = trpc.users.list.useQuery({ limit: 50 });

  const blockMutation = trpc.users.blockUser.useMutation({
    onSuccess: () => {
      toast.success(blockTarget?.blocked ? "Usuário desbloqueado." : "Usuário bloqueado.");
      setBlockTarget(null);
      refetch();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const promoteAdminMutation = trpc.users.promoteToAdmin.useMutation({
    onSuccess: () => { toast.success("Papel atualizado."); refetch(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  return (
    <AdminLayout activeSection="users">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Usuários</h1>
            <p className="text-muted-foreground text-sm mt-1">Gerencie usuários da plataforma</p>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou e-mail..."
            value={search}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Lista */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-2">
            {(users ?? []).filter((u) => !search || u.name?.toLowerCase().includes(search.toLowerCase()) || u.email?.toLowerCase().includes(search.toLowerCase())).map((u) => (
              <Card key={u.id} className={`border-border/50 ${u.isBlocked ? "opacity-60" : ""}`}>
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-medium text-sm truncate">{u.name ?? "Sem nome"}</p>
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
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={() => promoteAdminMutation.mutate({ userId: u.id })}
                    >
                      <Crown className="h-3 w-3" />
                      {u.role === "admin" ? "Remover Admin" : "Tornar Admin"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className={`h-7 text-xs gap-1 ${u.isBlocked ? "border-green-400/30 text-green-400" : "border-red-400/30 text-red-400"}`}
                      onClick={() => setBlockTarget({ id: u.id, name: u.name ?? "Usuário", blocked: u.isBlocked ?? false })}
                    >
                      {u.isBlocked ? <UserCheck className="h-3 w-3" /> : <Ban className="h-3 w-3" />}
                      {u.isBlocked ? "Desbloquear" : "Bloquear"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {(users ?? []).length === 0 && (
              <div className="text-center py-12 text-muted-foreground text-sm">
                Nenhum usuário encontrado.
              </div>
            )}
          </div>
        )}
      </div>

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
    </AdminLayout>
  );
}
