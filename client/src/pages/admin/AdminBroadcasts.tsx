import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronDown,
  Clock,
  ExternalLink,
  Image,
  Link2,
  Loader2,
  Mail,
  Megaphone,
  Send,
  Smartphone,
  Star,
  Trophy,
  Users,
  XCircle,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Categorias ───────────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    value: "game_reminder",
    label: "Lembrete de Jogo",
    description: "Aviso de que o jogo está prestes a iniciar",
    icon: Clock,
    color: "text-blue-400",
    bg: "bg-blue-400/10",
    border: "border-blue-400/30",
    emoji: "⚽",
    auto: true,
  },
  {
    value: "result_available",
    label: "Resultado Disponível",
    description: "Resultado do jogo foi apurado",
    icon: CheckCircle2,
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    emoji: "✅",
    auto: true,
  },
  {
    value: "ranking_update",
    label: "Atualização do Ranking",
    description: "Classificação do bolão foi atualizada",
    icon: Trophy,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    border: "border-yellow-400/30",
    emoji: "🏆",
    auto: true,
  },
  {
    value: "advertising",
    label: "Publicidade",
    description: "Mensagem publicitária ou promocional",
    icon: Star,
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    emoji: "🎯",
    auto: false,
  },
  {
    value: "communication",
    label: "Comunicação",
    description: "Comunicado geral da plataforma",
    icon: Megaphone,
    color: "text-brand",
    bg: "bg-brand/10",
    border: "border-brand/30",
    emoji: "📢",
    auto: false,
  },
] as const;

type Category = typeof CATEGORIES[number]["value"];

const PRIORITY_OPTIONS = [
  { value: "low", label: "Baixa", color: "text-muted-foreground", icon: "○" },
  { value: "normal", label: "Normal", color: "text-blue-400", icon: "●" },
  { value: "high", label: "Alta", color: "text-yellow-400", icon: "▲" },
  { value: "urgent", label: "Urgente", color: "text-red-400", icon: "⚡" },
] as const;

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

// ─── Preview de Notificação In-App ───────────────────────────────────────────
function InAppPreview({
  title, content, emoji, imageUrl, actionUrl, actionLabel, category, priority,
}: {
  title: string; content: string; emoji: string; imageUrl: string;
  actionUrl: string; actionLabel: string; category: Category; priority: string;
}) {
  const cat = CATEGORIES.find(c => c.value === category) ?? CATEGORIES[4];
  const CatIcon = cat.icon;
  const priorityOpt = PRIORITY_OPTIONS.find(p => p.value === priority) ?? PRIORITY_OPTIONS[1];
  const displayTitle = emoji ? `${emoji} ${title || "Título da notificação"}` : (title || "Título da notificação");

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card/60 shadow-lg">
      {imageUrl && (
        <div className="w-full h-32 overflow-hidden">
          <img src={imageUrl} alt="" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`w-10 h-10 rounded-full ${cat.bg} flex items-center justify-center shrink-0 border ${cat.border}`}>
            <CatIcon className={`h-5 w-5 ${cat.color}`} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold leading-tight">{displayTitle}</p>
              {priority !== "normal" && (
                <span className={`text-xs font-bold shrink-0 ${priorityOpt.color}`}>{priorityOpt.icon}</span>
              )}
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
              {content || "Conteúdo da mensagem aparecerá aqui..."}
            </p>
            {actionUrl && (
              <a
                href={actionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-brand hover:underline"
              >
                {actionLabel || "Ver mais"}
                <ExternalLink className="h-3 w-3" />
              </a>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className={`text-xs h-4 px-1.5 ${cat.color} border-current/30`}>
                {cat.label}
              </Badge>
              <span className="text-xs text-muted-foreground">Agora mesmo</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Preview Push ─────────────────────────────────────────────────────────────
function PushPreview({ title, content, emoji }: { title: string; content: string; emoji: string }) {
  const displayTitle = emoji ? `${emoji} ${title || "Título"}` : (title || "Título");
  return (
    <div className="border border-zinc-700 rounded-xl p-3 bg-zinc-900 shadow-xl">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-5 h-5 rounded bg-brand/30 flex items-center justify-center">
          <Bell className="h-3 w-3 text-brand" />
        </div>
        <p className="text-xs font-semibold text-white">ApostAI</p>
        <p className="text-xs text-zinc-400 ml-auto">agora</p>
      </div>
      <p className="text-xs font-semibold text-white pl-7">{displayTitle}</p>
      <p className="text-xs text-zinc-400 pl-7 mt-0.5 line-clamp-2">
        {content || "Conteúdo da mensagem..."}
      </p>
    </div>
  );
}

// ─── Preview Email ────────────────────────────────────────────────────────────
function EmailPreview({
  title, content, emoji, imageUrl, actionUrl, actionLabel,
}: {
  title: string; content: string; emoji: string; imageUrl: string; actionUrl: string; actionLabel: string;
}) {
  const displayTitle = emoji ? `${emoji} ${title || "Título"}` : (title || "Título");
  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-[#0f0f0f] text-sm">
      <div className="px-4 py-2 bg-[#1a1a1a] border-b border-border/30">
        <p className="text-xs text-muted-foreground">Assunto:</p>
        <p className="text-sm font-medium text-white">{displayTitle}</p>
      </div>
      {imageUrl && (
        <img src={imageUrl} alt="" className="w-full max-h-32 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
      )}
      <div className="p-4 space-y-3">
        {emoji && <div className="text-3xl">{emoji}</div>}
        <h3 className="font-bold text-white text-base">{title || "Título da mensagem"}</h3>
        <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
          {content || "Conteúdo do e-mail..."}
        </p>
        {actionUrl && (
          <div>
            <span className="inline-block bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-lg">
              {actionLabel || "Ver mais"}
            </span>
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-t border-border/30">
        <p className="text-xs text-zinc-600">ApostAI • Você recebeu esta mensagem pois é usuário da plataforma.</p>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function AdminBroadcasts() {
  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [emoji, setEmoji] = useState("");
  const [category, setCategory] = useState<Category>("communication");
  const [priority, setPriority] = useState<"low" | "normal" | "high" | "urgent">("normal");
  const [imageUrl, setImageUrl] = useState("");
  const [actionUrl, setActionUrl] = useState("");
  const [actionLabel, setActionLabel] = useState("");
  const [audience, setAudience] = useState<"all" | "pro" | "free">("all");
  const [channels, setChannels] = useState({ inApp: true, push: false, email: false });
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      setTitle(""); setContent(""); setEmoji(""); setImageUrl(""); setActionUrl(""); setActionLabel("");
      refetchQueue();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const handleSend = () => {
    if (!title.trim() || !content.trim()) return toast.error("Título e conteúdo são obrigatórios.");
    if (!channels.inApp && !channels.push && !channels.email)
      return toast.error("Selecione pelo menos um canal de envio.");
    broadcastMutation.mutate({
      title, content, emoji, category, priority,
      imageUrl: imageUrl || undefined,
      actionUrl: actionUrl || undefined,
      actionLabel: actionLabel || undefined,
      audience, channels,
    });
  };

  const audienceCount =
    audience === "all" ? stats?.totalUsers ?? 0
    : audience === "pro" ? stats?.proPlans ?? 0
    : (stats?.totalUsers ?? 0) - (stats?.proPlans ?? 0);

  const toggleChannel = (ch: keyof typeof channels) =>
    setChannels((prev) => ({ ...prev, [ch]: !prev[ch] }));

  const selectedCat = CATEGORIES.find(c => c.value === category) ?? CATEGORIES[4];
  const CatIcon = selectedCat.icon;

  return (
    <AdminLayout activeSection="broadcasts">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Broadcasts</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Envie notificações ricas para segmentos de usuários por múltiplos canais
          </p>
        </div>

        {/* Stats */}
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
              <p className="text-xs text-muted-foreground mt-0.5">{pushStats?.uniqueUsers ?? 0} usuários únicos</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Push ativo</p>
              <p className="text-sm font-semibold mt-1">
                {pushStats?.pushEnabled ? (
                  <span className="text-green-400 flex items-center gap-1"><CheckCircle2 className="h-4 w-4" /> Ativado</span>
                ) : (
                  <span className="text-muted-foreground flex items-center gap-1"><XCircle className="h-4 w-4" /> Desativado</span>
                )}
              </p>
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
              <Megaphone className="h-4 w-4 mr-2" />Compor
            </TabsTrigger>
            <TabsTrigger value="email-queue">
              <Mail className="h-4 w-4 mr-2" />Fila de E-mails
            </TabsTrigger>
          </TabsList>

          {/* ── Aba Compor ── */}
          <TabsContent value="compose" className="mt-4">
            <div className="space-y-4">
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">

                {/* ── Formulário ── */}
                <div className="space-y-4">

                  {/* Categoria */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Zap className="h-4 w-4 text-brand" />
                        Categoria da Notificação
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 gap-2">
                        {CATEGORIES.map((cat) => {
                          const Icon = cat.icon;
                          const isSelected = category === cat.value;
                          return (
                            <button
                              key={cat.value}
                              type="button"
                              onClick={() => {
                                setCategory(cat.value);
                                if (!emoji) setEmoji(cat.emoji);
                              }}
                              className={`flex items-center gap-3 p-3 rounded-lg border text-left transition-all ${
                                isSelected
                                  ? `${cat.bg} ${cat.border} border`
                                  : "border-border/40 hover:border-border/70 bg-transparent"
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg ${cat.bg} flex items-center justify-center shrink-0`}>
                                <Icon className={`h-4 w-4 ${cat.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className={`text-sm font-medium ${isSelected ? cat.color : ""}`}>{cat.label}</span>
                                  <Badge variant="outline" className="text-xs h-4 px-1">
                                    {cat.auto ? "automática" : "manual"}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{cat.description}</p>
                              </div>
                              {isSelected && <CheckCircle2 className={`h-4 w-4 shrink-0 ${cat.color}`} />}
                            </button>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Conteúdo */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Megaphone className="h-4 w-4 text-brand" />
                        Conteúdo
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Emoji + Título */}
                      <div className="space-y-1">
                        <Label>Emoji + Título *</Label>
                        <div className="flex gap-2">
                          <Input
                            placeholder="🎯"
                            value={emoji}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmoji(e.target.value)}
                            className="w-16 text-center text-lg"
                            maxLength={4}
                          />
                          <Input
                            placeholder="Título da notificação..."
                            value={title}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                            maxLength={100}
                            className="flex-1"
                          />
                        </div>
                        <p className="text-xs text-muted-foreground text-right">{title.length}/100</p>
                      </div>

                      {/* Mensagem */}
                      <div className="space-y-1">
                        <Label>Mensagem *</Label>
                        <Textarea
                          placeholder="Escreva o conteúdo completo da notificação. Você pode usar quebras de linha para organizar o texto."
                          value={content}
                          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setContent(e.target.value)}
                          className="resize-none h-32"
                          maxLength={2000}
                        />
                        <p className="text-xs text-muted-foreground text-right">{content.length}/2000</p>
                      </div>

                      {/* Prioridade */}
                      <div className="space-y-1">
                        <Label>Prioridade</Label>
                        <div className="grid grid-cols-4 gap-2">
                          {PRIORITY_OPTIONS.map((p) => (
                            <button
                              key={p.value}
                              type="button"
                              onClick={() => setPriority(p.value)}
                              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-xs font-medium transition-colors ${
                                priority === p.value
                                  ? `border-current ${p.color} bg-current/10`
                                  : "border-border/40 text-muted-foreground hover:border-border/70"
                              }`}
                            >
                              <span className="text-base">{p.icon}</span>
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Campos avançados */}
                      <div>
                        <button
                          type="button"
                          onClick={() => setShowAdvanced(!showAdvanced)}
                          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                        >
                          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showAdvanced ? "rotate-180" : ""}`} />
                          Campos avançados (imagem, botão de ação)
                        </button>
                        {showAdvanced && (
                          <div className="mt-3 space-y-3 pl-2 border-l-2 border-border/30">
                            <div className="space-y-1">
                              <Label className="flex items-center gap-1.5 text-xs">
                                <Image className="h-3.5 w-3.5" /> URL da Imagem
                              </Label>
                              <Input
                                placeholder="https://exemplo.com/imagem.jpg"
                                value={imageUrl}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setImageUrl(e.target.value)}
                                className="text-xs"
                              />
                              <p className="text-xs text-muted-foreground">Aparece no topo da notificação e no e-mail</p>
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                <Label className="flex items-center gap-1.5 text-xs">
                                  <Link2 className="h-3.5 w-3.5" /> URL do Botão
                                </Label>
                                <Input
                                  placeholder="/boloes ou https://..."
                                  value={actionUrl}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActionUrl(e.target.value)}
                                  className="text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-xs">Texto do Botão</Label>
                                <Input
                                  placeholder="Ver mais"
                                  value={actionLabel}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setActionLabel(e.target.value)}
                                  maxLength={50}
                                  className="text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Audiência e Canais */}
                  <Card className="border-border/50">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Users className="h-4 w-4 text-brand" />
                        Audiência e Canais
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

                      <div className="space-y-2">
                        <Label>Canais de envio</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { key: "inApp" as const, icon: Bell, label: "In-App", enabled: true },
                            { key: "push" as const, icon: Smartphone, label: "Push", enabled: !!pushStats?.pushEnabled && !!pushStats?.hasVapidKeys },
                            { key: "email" as const, icon: Mail, label: "E-mail", enabled: true },
                          ].map(({ key, icon: Icon, label, enabled }) => (
                            <button
                              key={key}
                              type="button"
                              onClick={() => toggleChannel(key)}
                              disabled={!enabled}
                              className={`flex flex-col items-center gap-1 p-3 rounded-lg border text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                                channels[key]
                                  ? "border-brand bg-brand/10 text-brand"
                                  : "border-border/50 text-muted-foreground hover:border-border"
                              }`}
                            >
                              <Icon className="h-4 w-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                        {!pushStats?.pushEnabled && (
                          <p className="text-xs text-muted-foreground">
                            Push desativado — configure as VAPID keys em{" "}
                            <span className="text-brand">Configurações → Push</span>
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* ── Preview em tempo real ── */}
                <div className="space-y-4">
                  <Card className="border-border/50 sticky top-4">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <div className={`w-5 h-5 rounded ${selectedCat.bg} flex items-center justify-center`}>
                          <CatIcon className={`h-3 w-3 ${selectedCat.color}`} />
                        </div>
                        Preview em Tempo Real
                        <Badge variant="outline" className={`ml-auto text-xs ${selectedCat.color} border-current/30`}>
                          {selectedCat.label}
                        </Badge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-5">
                      {/* In-App */}
                      {channels.inApp && (
                        <div>
                          <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                            <Bell className="h-3.5 w-3.5" /> Notificação In-App
                          </p>
                          <InAppPreview
                            title={title} content={content} emoji={emoji}
                            imageUrl={imageUrl} actionUrl={actionUrl} actionLabel={actionLabel}
                            category={category} priority={priority}
                          />
                        </div>
                      )}

                      {/* Push */}
                      {channels.push && (
                        <>
                          {channels.inApp && <Separator />}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                              <Smartphone className="h-3.5 w-3.5" /> Push (navegador)
                            </p>
                            <PushPreview title={title} content={content} emoji={emoji} />
                          </div>
                        </>
                      )}

                      {/* Email */}
                      {channels.email && (
                        <>
                          {(channels.inApp || channels.push) && <Separator />}
                          <div>
                            <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1.5 font-medium">
                              <Mail className="h-3.5 w-3.5" /> E-mail
                            </p>
                            <EmailPreview
                              title={title} content={content} emoji={emoji}
                              imageUrl={imageUrl} actionUrl={actionUrl} actionLabel={actionLabel}
                            />
                          </div>
                        </>
                      )}

                      {!channels.inApp && !channels.push && !channels.email && (
                        <p className="text-sm text-muted-foreground text-center py-6">
                          Selecione pelo menos um canal para ver o preview.
                        </p>
                      )}

                      <Separator />
                      <div className="p-3 rounded-lg bg-yellow-400/5 border border-yellow-400/20">
                        <p className="text-xs text-yellow-400 flex items-start gap-1.5">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          Esta ação é irreversível. Revise o conteúdo antes de enviar.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </div>

              {/* Botão Enviar */}
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
                Enviar Broadcast para ~{audienceCount.toLocaleString("pt-BR")} usuários
              </Button>
            </div>
          </TabsContent>

          {/* ── Aba Fila de E-mails ── */}
          <TabsContent value="email-queue" className="mt-4">
            <Card className="border-border/50">
              <CardHeader className="pb-3 flex flex-row items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Mail className="h-4 w-4 text-brand" />
                  Fila de E-mails
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Select value={emailFilter} onValueChange={(v) => setEmailFilter(v as typeof emailFilter)}>
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
                    {emailQueue.map((email) => (
                      <div key={email.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/30 text-sm">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium truncate">{email.subject}</p>
                          <p className="text-xs text-muted-foreground truncate">{email.toEmail}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          {email.attempts > 0 && (
                            <span className="text-xs text-muted-foreground">{email.attempts} tentativa(s)</span>
                          )}
                          <span className={`text-xs font-medium ${STATUS_COLORS[email.status] ?? "text-muted-foreground"}`}>
                            {STATUS_LABELS[email.status] ?? email.status}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(email.createdAt).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                          </span>
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
