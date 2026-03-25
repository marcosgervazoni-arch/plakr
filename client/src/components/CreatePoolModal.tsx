import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { useAnalytics } from "@/hooks/useAnalytics";
import { Loader2, Trophy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface Props {
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePoolModal({ onClose, onCreated }: Props) {
  const analytics = useAnalytics();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [tournamentId, setTournamentId] = useState<string>("");
  const [accessType, setAccessType] = useState<"public" | "private_code" | "private_link">("private_link");
  const [invitePermission, setInvitePermission] = useState<"organizer_only" | "all_members">("organizer_only");

  const { data: tournaments, isLoading: tournamentsLoading } = trpc.tournaments.listGlobal.useQuery();

  const createPool = trpc.pools.create.useMutation({
    onSuccess: () => {
      analytics.trackPoolCreated({ pool_name: name.trim(), access_type: accessType });
      toast.success("Bolão criado com sucesso!", {
        description: `Compartilhe o link de convite com seus amigos.`,
      });
      onCreated();
    },
    onError: (err) => {
      toast.error("Erro ao criar bolão", { description: err.message });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return toast.error("Nome do bolão é obrigatório.");
    if (!tournamentId) return toast.error("Selecione um campeonato.");
    createPool.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
      tournamentId: Number(tournamentId),
      accessType,
      invitePermission: accessType === "public" ? "all_members" : invitePermission,
    });
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-brand-400" />
            Criar Novo Bolão
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Bolão *</Label>
            <Input
              id="name"
              placeholder="Ex: Copa do Mundo 2026 - Turma do Trabalho"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tournament">Campeonato *</Label>
            {tournamentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" /> Carregando campeonatos...
              </div>
            ) : (
              <Select value={tournamentId} onValueChange={setTournamentId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um campeonato" />
                </SelectTrigger>
                <SelectContent>
                  {tournaments?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                  {(!tournaments || tournaments.length === 0) && (
                    <SelectItem value="_none" disabled>
                      Nenhum campeonato disponível
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="access">Tipo de Acesso</Label>
            <Select value={accessType} onValueChange={(v) => setAccessType(v as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="private_link">Privado (link de convite)</SelectItem>
                <SelectItem value="private_code">Privado (código)</SelectItem>
                <SelectItem value="public">Público</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(accessType === "private_code" || accessType === "private_link") && (
            <div className="space-y-2">
              <Label>Quem pode convidar?</Label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "organizer_only" as const, label: "Só o organizador" },
                  { id: "all_members" as const, label: "Todos os membros" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setInvitePermission(opt.id)}
                    className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border text-sm transition-all ${
                      invitePermission === opt.id
                        ? "border-primary bg-primary/5 text-primary font-medium"
                        : "border-border/30 bg-card text-muted-foreground hover:border-primary/30"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="description">Descrição (opcional)</Label>
            <Textarea
              id="description"
              placeholder="Descreva as regras ou informações do bolão..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-brand-600 hover:bg-brand-700 text-white"
              disabled={createPool.isPending}
            >
              {createPool.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Criando...</>
              ) : (
                "Criar Bolão"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
