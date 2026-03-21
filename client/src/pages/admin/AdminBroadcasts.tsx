import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { Loader2, Megaphone, Send, Users } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function AdminBroadcasts() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"all" | "pro" | "free">("all");

  const { data: stats } = trpc.platform.getStats.useQuery();

  const broadcastMutation = trpc.notifications.broadcast.useMutation({
    onSuccess: (data) => {
      toast.success(`Broadcast enviado para ${data.sent} usuários.`);
      setTitle("");
      setContent("");
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return toast.error("Título e conteúdo são obrigatórios.");
    broadcastMutation.mutate({ title, content, audience });
  };

  const audienceCount = audience === "all"
    ? stats?.totalUsers ?? 0
    : audience === "pro"
    ? stats?.proPlans ?? 0
    : (stats?.totalUsers ?? 0) - (stats?.proPlans ?? 0);

  return (
    <AdminLayout activeSection="broadcasts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Broadcasts</h1>
          <p className="text-muted-foreground text-sm mt-1">Envie notificações para segmentos de usuários</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Megaphone className="h-4 w-4 text-brand" />
                Nova Mensagem
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label>Audiência</Label>
                <Select value={audience} onValueChange={(v) => setAudience(v as typeof audience)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os usuários</SelectItem>
                    <SelectItem value="pro">Somente Pro</SelectItem>
                    <SelectItem value="free">Somente Free</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <Users className="h-3 w-3" />
                  ~{audienceCount.toLocaleString("pt-BR")} destinatários
                </p>
              </div>
              <div className="space-y-1">
                <Label>Título *</Label>
                <Input
                  placeholder="Ex: Novidade na plataforma!"
                  value={title}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                  maxLength={100}
                />
                <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
              </div>
              <div className="space-y-1">
                <Label>Conteúdo *</Label>
                <Textarea
                  placeholder="Mensagem que será exibida para os usuários..."
                  value={content}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                  className="resize-none h-28"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{content.length}/500</p>
              </div>
              <Button
                className="w-full bg-brand hover:bg-brand/90 gap-2"
                onClick={handleSend}
                disabled={broadcastMutation.isPending || !title.trim() || !content.trim()}
              >
                {broadcastMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Enviar Broadcast
              </Button>
            </CardContent>
          </Card>

          {/* Preview */}
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Preview da Notificação</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border border-border/50 rounded-lg p-4 bg-card/50 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-brand/20 flex items-center justify-center shrink-0">
                    <Megaphone className="h-4 w-4 text-brand" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold">{title || "Título da notificação"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {content || "Conteúdo da mensagem aparecerá aqui..."}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">Agora mesmo</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                <p className="text-xs text-yellow-400">
                  ⚠️ Esta mensagem será enviada como notificação in-app para todos os usuários selecionados.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
