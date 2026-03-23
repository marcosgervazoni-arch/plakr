import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  Bell,
  CheckCircle2,
  Clock,
  Loader2,
  Mail,
  Megaphone,
  Send,
  Smartphone,
  Users,
  XCircle,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  sent: "Enviado",
  failed: "Falhou",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400",
  sent: "text-green-400",
  failed: "text-red-400",
};

export default function AdminBroadcasts() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [audience, setAudience] = useState<"all" | "pro" | "free">("all");
  const [channels, setChannels] = useState({
    inApp: true,
    push: false,
    email: false,
  });
  const [emailFilter, setEmailFilter] = useState<"all" | "pending" | "sent" | "failed">("all");

  const { data: stats } = trpc.platform.getStats.useQuery();
  const { data: pushStats } = trpc.notifications.pushStats.useQuery();
  const { data: emailQueue, refetch: refetchQueue } = trpc.notifications.emailQueue.useQuery({
    limit: 50,
    status: emailFilter,
  });

  const broadcastMutation = trpc.notifications.broadcast.useMutation({
    onSuccess: (data) => {
      const parts: string[] = [];
      if (data.inAppSent > 0) parts.push(`${data.inAppSent} in-app`);
      if (data.pushSent > 0) parts.push(`${data.pushSent} push`);
      if (data.emailSent > 0) parts.push(`${data.emailSent} e-mail`);
      toast.success(`Broadcast enviado: ${parts.join(", ") || "0 mensagens"} (total: ${data.total} usuários)`);
      setTitle("");
      setContent("");
      refetchQueue();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return toast.error("Título e conteúdo são obrigatórios.");
    if (!channels.inApp && !channels.push && !channels.email)
      return toast.error("Selecione pelo menos um canal de envio.");
    broadcastMutation.mutate({ title, content, audience, channels });
  };

  const audienceCount =
    audience === "all"
      ? stats?.totalUsers ?? 0
      : audience === "pro"
      ? stats?.proPlans ?? 0
      : (stats?.totalUsers ?? 0) - (stats?.proPlans ?? 0);

  const toggleChannel = (ch: keyof typeof channels) => {
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));
  };

  return (
    <AdminLayout activeSection="broadcasts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Broadcasts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envie notificações para segmentos de usuários por múltiplos canais
          </p>
        </div>

        {/* Cards de estatísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Usuários totais</p>
              <p className="text-2xl font-bold">{stats?.totalUsers?.toLocaleString("pt-BR") ?? "—"}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Assinaturas Push</p>
              <p className="text-2xl font-bold">{pushStats?.totalSubscriptions?.toLocaleString("pt-BR") ?? "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {pushStats?.uniqueUsers ?? 0} usuários únicos
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Push ativo</p>
              <p className="text-sm font-semibold mt-1">
                {pushStats?.pushEnabled ? (
                  <span className="text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4" /> Ativado
                  </span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1">
                    <XCircle className="h-4 w-4" /> Desativado
                  </span>
                )}
              </p>
              {!pushStats?.hasVapidKeys && (
                <p className="text-xs text-yellow-400 mt-1">Configure as VAPID keys em Configurações → Push</p>
              )}
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">E-mails na fila</p>
              <p className="text-2xl font-bold">{emailQueue?.length ?? "—"}</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="compose">
          <TabsList>
            <TabsTrigger value="compose">
              <Megaphone className="h-4 w-4 mr-2" />
              Compor
            </TabsTrigger>
            <TabsTrigger value="email-queue">
              <Mail className="h-4 w-4 mr-2" />
              Fila de E-mails
            </TabsTrigger>
          </TabsList>

          {/* Aba Compor */}
          <TabsContent value="compose" className="mt-4">
            <div className="space-y-4">
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
                  {/* Audiência */}
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

                  {/* Canais */}
                  <div className="space-y-2">
                    <Label>Canais de envio</Label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => toggleChannel("inApp")}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                          channels.inApp
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <Bell className="h-4 w-4" />
                        In-App
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleChannel("push")}
                        disabled={!pushStats?.pushEnabled || !pushStats?.hasVapidKeys}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                          channels.push
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <Smartphone className="h-4 w-4" />
                        Push
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleChannel("email")}
                        className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors ${
                          channels.email
                            ? "border-brand bg-brand/10 text-brand"
                            : "border-border/50 text-muted-foreground hover:border-border"
                        }`}
                      >
                        <Mail className="h-4 w-4" />
                        E-mail
                      </button>
                    </div>
                    {!pushStats?.pushEnabled && (
                      <p className="text-xs text-muted-foreground">
                        Push desativado — configure as VAPID keys em{" "}
                        <span className="text-brand">Configurações → Push</span>
                      </p>
                    )}
                  </div>

                  {/* Título */}
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

                  {/* Conteúdo */}
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

                </CardContent>
              </Card>

              {/* Preview */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Preview da Notificação</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* In-App preview */}
                  {channels.inApp && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Bell className="h-3 w-3" /> In-App
                      </p>
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
                    </div>
                  )}

                  {/* Push preview */}
                  {channels.push && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Smartphone className="h-3 w-3" /> Push (navegador)
                      </p>
                      <div className="border border-border/50 rounded-lg p-3 bg-zinc-900/80 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className="w-5 h-5 rounded bg-brand/30 flex items-center justify-center">
                            <Bell className="h-3 w-3 text-brand" />
                          </div>
                          <p className="text-xs font-semibold text-white">ApostAI</p>
                          <p className="text-xs text-zinc-400 ml-auto">agora</p>
                        </div>
                        <p className="text-xs font-medium text-white pl-7">{title || "Título"}</p>
                        <p className="text-xs text-zinc-400 pl-7 line-clamp-2">
                          {content || "Conteúdo da mensagem..."}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Email preview */}
                  {channels.email && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                        <Mail className="h-3 w-3" /> E-mail
                      </p>
                      <div className="border border-border/50 rounded-lg p-3 bg-card/50">
                        <p className="text-xs text-muted-foreground">Assunto:</p>
                        <p className="text-sm font-medium">{title || "Título"}</p>
                        <div className="mt-2 pt-2 border-t border-border/30">
                          <p className="text-xs text-muted-foreground">{content || "Conteúdo do e-mail..."}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!channels.inApp && !channels.push && !channels.email && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Selecione pelo menos um canal para ver o preview.
                    </p>
                  )}

                  <div className="p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                    <p className="text-xs text-yellow-400">
                      ⚠️ Esta ação é irreversível. Revise o conteúdo antes de enviar.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Botão Enviar — sempre visível abaixo dos cards */}
            <Button
              className="w-full bg-brand hover:bg-brand/90 gap-2 h-12 text-base"
              onClick={handleSend}
              disabled={
                broadcastMutation.isPending ||
                !title.trim() ||
                !content.trim() ||
                (!channels.inApp && !channels.push && !channels.email)
              }
            >
              {broadcastMutation.isPending ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              Enviar Broadcast
            </Button>
            </div>
          </TabsContent>

          {/* Aba Fila de E-mails */}
          <TabsContent value="email-queue" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand" />
                  Fila de E-mails
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select
                    value={emailFilter}
                    onValueChange={(v) => setEmailFilter(v as typeof emailFilter)}
                  >
                    <SelectTrigger className="w-36 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos</SelectItem>
                      <SelectItem value="pending">Pendentes</SelectItem>
                      <SelectItem value="sent">Enviados</SelectItem>
                      <SelectItem value="failed">Falhos</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={() => refetchQueue()}>
                    Atualizar
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {!emailQueue || emailQueue.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    Nenhum e-mail na fila.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {emailQueue.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start gap-3 p-3 rounded-lg border border-border/40 bg-card/30"
                      >
                        <div className="shrink-0 mt-0.5">
                          {item.status === "sent" ? (
                            <CheckCircle2 className="h-4 w-4 text-green-400" />
                          ) : item.status === "failed" ? (
                            <XCircle className="h-4 w-4 text-red-400" />
                          ) : (
                            <Clock className="h-4 w-4 text-yellow-400" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium truncate">{item.subject}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs shrink-0 ${STATUS_COLORS[item.status]}`}
                            >
                              {STATUS_LABELS[item.status] ?? item.status}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">
                            Para: {item.toEmail}
                          </p>
                          {item.errorMessage && (
                            <p className="text-xs text-red-400 mt-0.5 truncate">{item.errorMessage}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(item.createdAt).toLocaleString("pt-BR")}
                            {item.attempts > 0 && ` · ${item.attempts} tentativa(s)`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
