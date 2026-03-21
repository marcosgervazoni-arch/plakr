/**
 * O3 — Gestão de Membros
 * Especificação: tabela com busca, filtros, ações por linha (remover, bloquear, transferir).
 * AlertDialogs destrutivos com texto explicativo completo sobre consequências.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Search,
  MoreHorizontal,
  UserMinus,
  ShieldOff,
  ArrowRightLeft,
  ExternalLink,
  Loader2,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useParams } from "wouter";
import { useState, useMemo } from "react";
import { toast } from "sonner";

type FilterType = "all" | "inactive" | "top" | "bottom";

export default function OrganizerMembers() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<FilterType>("all");
  const [removeTarget, setRemoveTarget] = useState<{ id: number; name: string } | null>(null);
  const [transferTarget, setTransferTarget] = useState<{ id: number; name: string } | null>(null);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);

  const { data: poolData } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;

  const { data: members = [], refetch } = trpc.pools.getMembers.useQuery(
    { poolId: pool?.id ?? 0 },
    { enabled: !!pool?.id }
  );

  const removeMutation = trpc.pools.removeMember.useMutation({
    onSuccess: () => {
      toast.success("Participante removido do bolão.");
      setRemoveTarget(null);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao remover participante."),
  });

  const transferMutation = trpc.pools.transferOwnership.useMutation({
    onSuccess: () => {
      toast.success("Cargo de organizador transferido com sucesso.");
      setTransferTarget(null);
      setTransferDialogOpen(false);
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao transferir cargo."),
  });

  const filtered = useMemo(() => {
    let list = members.filter((m: any) => {
      const name = (m.user?.name ?? "").toLowerCase();
      return name.includes(search.toLowerCase());
    });
    if (filter === "top") list = [...list].sort((a: any, b: any) => (b.member?.totalPoints ?? 0) - (a.member?.totalPoints ?? 0));
    if (filter === "bottom") list = [...list].sort((a: any, b: any) => (a.member?.totalPoints ?? 0) - (b.member?.totalPoints ?? 0));
    return list;
  }, [members, search, filter]);

  const isPro = pool?.plan === "pro";

  const filterButtons: { id: FilterType; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "inactive", label: "Inativos" },
    { id: "top", label: "Maior pontuação" },
    { id: "bottom", label: "Menor pontuação" },
  ];

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      activeSection="members"
    >
      <div className="p-6 space-y-5 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Gestão de Membros
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              <span className="font-mono font-semibold text-foreground">{members.length}</span> participantes no bolão
            </p>
          </div>
        </div>

        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome..."
              className="pl-9 bg-card border-border/50"
            />
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filterButtons.map((btn) => (
              <button
                key={btn.id}
                onClick={() => setFilter(btn.id)}
                className={`shrink-0 text-xs px-3 py-1.5 rounded-full border transition-all ${
                  filter === btn.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border/50 text-muted-foreground hover:border-primary/40"
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>

        {/* Members table */}
        <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
          {filtered.length === 0 ? (
            <div className="p-10 text-center space-y-2">
              <Users className="w-10 h-10 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">Nenhum participante encontrado.</p>
            </div>
          ) : (
            <>
              {/* Desktop table header */}
              <div className="hidden md:grid grid-cols-[1fr_120px_100px_80px_80px_48px] gap-4 px-4 py-2.5 border-b border-border/20 text-xs text-muted-foreground font-medium uppercase tracking-wider">
                <span>Participante</span>
                <span>Ingresso</span>
                <span>Pontos</span>
                <span>Posição</span>
                <span>Último palpite</span>
                <span></span>
              </div>

              <div className="divide-y divide-border/20">
                {filtered.map((m: any, idx: number) => {
                  const member = m.member ?? m;
                  const memberUser = m.user ?? m;
                  const isMe = memberUser.id === user?.id;
                  const isOrg = member.role === "organizer";

                  return (
                    <div
                      key={member.id ?? idx}
                      className="grid grid-cols-1 md:grid-cols-[1fr_120px_100px_80px_80px_48px] gap-2 md:gap-4 px-4 py-3.5 items-center hover:bg-muted/20 transition-colors"
                    >
                      {/* Name + role */}
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                          {memberUser.name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm truncate">{memberUser.name ?? "Usuário"}</span>
                            {isOrg && (
                              <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                                Organizador
                              </Badge>
                            )}
                            {isMe && (
                              <Badge variant="outline" className="text-xs py-0 px-1.5 text-muted-foreground">
                                Você
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{memberUser.email ?? ""}</p>
                        </div>
                      </div>

                      {/* Join date */}
                      <span className="text-xs text-muted-foreground md:block hidden">
                        {member.joinedAt ? new Date(member.joinedAt).toLocaleDateString("pt-BR") : "—"}
                      </span>

                      {/* Points */}
                      <span
                        className="font-bold text-sm text-primary md:block hidden"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {member.totalPoints ?? 0} pts
                      </span>

                      {/* Rank */}
                      <span className="text-sm text-muted-foreground md:block hidden font-mono">
                        #{idx + 1}
                      </span>

                      {/* Last bet */}
                      <span className="text-xs text-muted-foreground md:block hidden">—</span>

                      {/* Actions */}
                      {!isMe && !isOrg && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8 shrink-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem className="gap-2 text-sm">
                              <ExternalLink className="w-3.5 h-3.5" /> Ver perfil
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="gap-2 text-sm text-yellow-400 focus:text-yellow-400"
                              onClick={() => {
                                setTransferTarget({ id: memberUser.id, name: memberUser.name ?? "Usuário" });
                                setTransferDialogOpen(true);
                              }}
                            >
                              <ArrowRightLeft className="w-3.5 h-3.5" /> Transferir cargo
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="gap-2 text-sm text-red-400 focus:text-red-400"
                              onClick={() => setRemoveTarget({ id: memberUser.id, name: memberUser.name ?? "Usuário" })}
                            >
                              <UserMinus className="w-3.5 h-3.5" /> Remover do bolão
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Remove AlertDialog */}
      <AlertDialog open={!!removeTarget} onOpenChange={(o) => !o && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-400" />
              Remover participante
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-sm leading-relaxed">
              <p>Você está prestes a remover <strong>{removeTarget?.name}</strong> do bolão.</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>O participante perderá acesso ao bolão imediatamente.</li>
                <li>Seus palpites e posições no ranking serão mantidos com o nome anonimizado como <code className="text-xs bg-muted px-1 rounded">Usuário_Removido_[ID]</code>.</li>
                <li>A conta global do participante não é afetada.</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => {
                if (removeTarget && pool?.id) {
                  removeMutation.mutate({ poolId: pool.id, userId: removeTarget.id });
                }
              }}
            >
              {removeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Remover participante"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Transfer Ownership Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="w-5 h-5 text-yellow-400" />
              Transferir cargo de organizador
            </DialogTitle>
            <DialogDescription className="space-y-2 text-sm leading-relaxed">
              <p>Você está transferindo o cargo de organizador para <strong>{transferTarget?.name}</strong>.</p>
              <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                <li>O participante selecionado se tornará o novo organizador do bolão.</li>
                <li>Você será rebaixado a participante.</li>
                <li>O novo organizador receberá uma notificação automática.</li>
                <li>Esta ação é irreversível sem a colaboração do novo organizador.</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>Cancelar</Button>
            <Button
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              onClick={() => {
                if (transferTarget && pool?.id) {
                  transferMutation.mutate({ poolId: pool.id, newOwnerId: transferTarget.id });
                }
              }}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar transferência"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </OrganizerLayout>
  );
}
