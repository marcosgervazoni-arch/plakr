/**
 * OrganizerCommunication — Comunicação com membros do bolão (Pro)
 * Permite ao organizador enviar mensagens in-app para todos os participantes.
 */
import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import OrganizerLayout from "@/components/OrganizerLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Crown, Send, Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import { Link } from "wouter";

export default function OrganizerCommunication() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;
  const memberCount = poolData?.memberCount ?? 0;

  const isPro = pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.planExpiresAt && new Date(pool.planExpiresAt).getTime() < Date.now();

  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");

  const broadcastMutation = trpc.pools.broadcastToMembers.useMutation({
    onSuccess: (data) => {
      toast.success(`Mensagem enviada para ${data.sent} participante${data.sent !== 1 ? "s" : ""}.`);
      setTitle("");
      setMessage("");
    },
    onError: (err) => toast.error(err.message || "Erro ao enviar mensagem."),
  });

  const handleSend = () => {
    if (!pool?.id) return;
    if (!title.trim()) { toast.error("Informe um título para a mensagem."); return; }
    if (!message.trim()) { toast.error("Informe o conteúdo da mensagem."); return; }
    broadcastMutation.mutate({ poolId: pool.id, title: title.trim(), message: message.trim() });
  };

  if (poolLoading) {
    return (
      <OrganizerLayout slug={slug ?? ""} poolName="Carregando..." poolStatus="active" isPro={false} activeSection="communication">
        <div className="p-6 animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-48" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </OrganizerLayout>
    );
  }

  if (!isPro) {
    return (
      <OrganizerLayout slug={slug ?? ""} poolName={pool?.name ?? ""} poolStatus={(pool?.status as any) ?? "active"} isPro={false} isProExpired={false} activeSection="communication">
        <div className="flex flex-col items-center justify-center h-64 text-center gap-4 p-6">
          <Crown className="h-12 w-12 text-yellow-400" />
          <h2 className="text-xl font-bold font-display">Recurso Exclusivo Pro</h2>
          <p className="text-muted-foreground text-sm max-w-xs">
            A comunicação direta com os membros do bolão é exclusiva do Plano Pro.
          </p>
          <Link href={`/pool/${slug}/manage/plan`}>
            <Button className="bg-brand hover:bg-brand/90 gap-2">
              <Crown className="h-4 w-4" /> Fazer Upgrade para Pro
            </Button>
          </Link>
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="communication"
    >
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Comunicação com Membros
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envie uma notificação in-app para todos os participantes do bolão.
          </p>
        </div>

        {/* Info de audiência */}
        <div className="bg-card border border-border/30 rounded-xl px-4 py-3 flex items-center gap-3">
          <Users className="h-5 w-5 text-muted-foreground shrink-0" />
          <div>
            <p className="text-sm font-medium">
              {memberCount > 1 ? `${memberCount - 1} participante${memberCount - 1 !== 1 ? "s" : ""} receberão esta mensagem` : "Nenhum participante ainda"}
            </p>
            <p className="text-xs text-muted-foreground">Você (organizador) não receberá a notificação</p>
          </div>
        </div>

        {/* Formulário */}
        <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <MessageSquare className="h-4 w-4 text-brand" />
            <span className="text-sm font-semibold">Nova Mensagem</span>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-title" className="text-xs font-medium">Título <span className="text-muted-foreground">(máx. 100 caracteres)</span></Label>
            <Input
              id="msg-title"
              placeholder="Ex: Resultado do jogo de ontem"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="msg-body" className="text-xs font-medium">Mensagem <span className="text-muted-foreground">(máx. 2000 caracteres)</span></Label>
            <Textarea
              id="msg-body"
              placeholder="Escreva sua mensagem para os participantes..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={5}
              className="resize-none"
            />
            <p className="text-xs text-muted-foreground text-right">{message.length}/2000</p>
          </div>

          <Button
            className="w-full bg-brand hover:bg-brand/90 gap-2"
            onClick={handleSend}
            disabled={broadcastMutation.isPending || !title.trim() || !message.trim() || memberCount <= 1}
          >
            <Send className="h-4 w-4" />
            {broadcastMutation.isPending ? "Enviando..." : "Enviar para todos os participantes"}
          </Button>
        </div>

        {/* Aviso */}
        <p className="text-xs text-muted-foreground text-center">
          As mensagens aparecem no sino de notificações de cada participante. Use com moderação.
        </p>
      </div>
    </OrganizerLayout>
  );
}
