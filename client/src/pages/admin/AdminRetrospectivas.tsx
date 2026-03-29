/**
 * AdminRetrospectivas — Painel de Configuração de Templates
 * Permite upload de fundos personalizados para os 5 slides e cards de compartilhamento.
 * Inclui toggles para ativar/desativar Slides PNG e Vídeo MP4, e botão de teste de vídeo.
 */
import { useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import AdminLayout from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  ImageIcon,
  Loader2,
  Info,
  Layers,
  Film,
  Trash2,
  Save,
  Upload,
  Video,
  PlayCircle,
  ExternalLink,
  Clapperboard,
} from "lucide-react";

// ─── Tipos ───────────────────────────────────────────────────────────────────

type SlotKey = "slide1" | "slide2" | "slide3" | "slide4" | "slide5" | "cardPodium" | "cardParticipant";

interface SlotConfig {
  key: SlotKey;
  label: string;
  description: string;
  ratio: string;
  isFallback?: boolean;
}

const SLIDE_SLOTS: SlotConfig[] = [
  { key: "slide1", label: "Slide 1 — Capa", description: "Tela de abertura. Usado como fallback para slides sem template.", ratio: "9:16", isFallback: true },
  { key: "slide2", label: "Slide 2 — Números", description: "Estatísticas do participante: palpites, acertos, pontuação.", ratio: "9:16" },
  { key: "slide3", label: "Slide 3 — Momento", description: "Destaque do melhor palpite ou movimento de ranking.", ratio: "9:16" },
  { key: "slide4", label: "Slide 4 — Posição", description: "Posição no ranking e card de compartilhamento.", ratio: "9:16" },
  { key: "slide5", label: "Slide 5 — CTA", description: "Chamada para novos usuários e próxima temporada.", ratio: "9:16" },
];

const CARD_SLOTS: SlotConfig[] = [
  { key: "cardPodium", label: "Card Pódio", description: "Background para 1º, 2º e 3º lugar.", ratio: "4:5" },
  { key: "cardParticipant", label: "Card Participante", description: "Background para demais participantes.", ratio: "4:5" },
];

// ─── Mock data para prévia ────────────────────────────────────────────────────

const MOCK = {
  poolName: "Bolão da Copa 2026",
  userName: "João Silva",
  position: 3,
  totalMembers: 24,
  exactScores: 7,
  totalBets: 38,
  points: 142,
  bestMoment: "Acertou placar: Brasil 2 × 1 Argentina",
};

// ─── Componente de zona de upload ─────────────────────────────────────────────

function UploadZone({
  slot,
  currentUrl,
  onUploaded,
  onRemove,
}: {
  slot: SlotConfig;
  currentUrl?: string | null;
  onUploaded: () => void;
  onRemove: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const upload = trpc.pools.uploadRetrospectiveTemplate.useMutation({
    onSuccess: () => {
      toast.success(`Template "${slot.label}" enviado.`);
      onUploaded();
      setUploading(false);
    },
    onError: (err) => {
      toast.error(err.message || "Erro ao enviar template.");
      setUploading(false);
    },
  });

  const handleFile = (file: File) => {
    if (!file.type.match(/^image\/(png|jpeg)$/)) {
      toast.error("Apenas PNG ou JPG são aceitos.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Arquivo muito grande. Máximo 5 MB.");
      return;
    }
    setUploading(true);
    const reader = new FileReader();
    reader.onload = (e) => {
      const base64 = (e.target?.result as string).split(",")[1];
      upload.mutate({
        slot: slot.key,
        fileBase64: base64,
        mimeType: file.type as "image/png" | "image/jpeg",
      });
    };
    reader.readAsDataURL(file);
  };

  const aspectStyle = slot.ratio === "9:16" ? { aspectRatio: "9/16" } : { aspectRatio: "4/5" };

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-xs font-semibold">{slot.label}</p>
            {slot.isFallback && (
              <Badge variant="outline" className="text-xs border-brand/30 text-brand px-1 h-4">Fallback</Badge>
            )}
            <Badge variant="outline" className="text-xs text-muted-foreground px-1 h-4">{slot.ratio}</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 leading-tight">{slot.description}</p>
        </div>
        {currentUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"
            onClick={onRemove}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Zona de upload */}
      <div
        className={`relative border-2 border-dashed rounded-lg transition-colors cursor-pointer group overflow-hidden ${
          currentUrl
            ? "border-brand/30 bg-brand/5"
            : "border-border hover:border-brand/40 hover:bg-muted/30"
        }`}
        style={{ ...aspectStyle, maxHeight: "180px" }}
        onClick={() => !uploading && fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file) handleFile(file);
        }}
      >
        {currentUrl ? (
          <>
            <img
              src={currentUrl}
              alt={slot.label}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <div className="text-white text-center">
                <Upload className="h-4 w-4 mx-auto mb-1" />
                <p className="text-xs">Substituir</p>
              </div>
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <ImageIcon className="h-5 w-5 opacity-40" />
                <p className="text-xs text-center px-2 opacity-70">PNG/JPG</p>
              </>
            )}
          </div>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Prévia */}
      <div>
        <p className="text-xs text-muted-foreground text-center mb-1 opacity-60">Prévia</p>
        <SlidePreview slot={slot} backgroundUrl={currentUrl} />
      </div>
    </div>
  );
}

// ─── Prévia de slide com mock data ────────────────────────────────────────────

function SlidePreview({ slot, backgroundUrl }: { slot: SlotConfig; backgroundUrl?: string | null }) {
  const aspectStyle = slot.ratio === "9:16" ? { aspectRatio: "9/16" } : { aspectRatio: "4/5" };

  const renderContent = () => {
    switch (slot.key) {
      case "slide1":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-white text-center">
            <div className="text-2xl">🏆</div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Retrospectiva</p>
            <p className="text-xs font-bold leading-tight">{MOCK.poolName}</p>
            <p className="text-xs opacity-60">{MOCK.userName}</p>
          </div>
        );
      case "slide2":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-white text-center">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Seus Números</p>
            <div className="grid grid-cols-2 gap-1 w-full mt-1">
              <div className="bg-white/10 rounded p-1">
                <p className="text-base font-bold">{MOCK.points}</p>
                <p className="text-xs opacity-70">pts</p>
              </div>
              <div className="bg-white/10 rounded p-1">
                <p className="text-base font-bold">{MOCK.exactScores}</p>
                <p className="text-xs opacity-70">exatos</p>
              </div>
            </div>
          </div>
        );
      case "slide3":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-white text-center">
            <div className="text-xl">⭐</div>
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Melhor Momento</p>
            <p className="text-xs font-semibold leading-tight">{MOCK.bestMoment}</p>
          </div>
        );
      case "slide4":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-white text-center">
            <p className="text-xs font-bold uppercase tracking-widest opacity-70">Posição Final</p>
            <p className="text-4xl font-bold">#{MOCK.position}</p>
            <p className="text-xs opacity-70">de {MOCK.totalMembers}</p>
          </div>
        );
      case "slide5":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-3 text-white text-center">
            <div className="text-xl">🎯</div>
            <p className="text-xs font-bold leading-tight">Crie seu bolão no Plakr!</p>
            <p className="text-xs opacity-60">plakr.com</p>
          </div>
        );
      case "cardPodium":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-white text-center">
            <div className="text-xl">🥇</div>
            <p className="text-xs font-bold">{MOCK.userName}</p>
            <p className="text-xs opacity-70">{MOCK.points} pts</p>
          </div>
        );
      case "cardParticipant":
        return (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 p-2 text-white text-center">
            <p className="text-xs font-bold">{MOCK.userName}</p>
            <p className="text-xs opacity-70">#{MOCK.position} · {MOCK.points} pts</p>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="relative rounded-lg overflow-hidden bg-zinc-900 border border-border/50"
      style={{ ...aspectStyle, maxHeight: "180px" }}
    >
      {backgroundUrl ? (
        <img src={backgroundUrl} alt="bg" className="absolute inset-0 w-full h-full object-cover" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-800 to-zinc-900" />
      )}
      <div className="absolute inset-0 bg-black/30" />
      {renderContent()}
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminRetrospectivas() {
  const { data: config, isLoading, refetch } = trpc.pools.getRetrospectiveConfig.useQuery();
  const updateConfig = trpc.pools.updateRetrospectiveConfig.useMutation({
    onSuccess: () => {
      toast.success("Configurações salvas.");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar configurações."),
  });

  const [ctaText, setCtaText] = useState("");
  const [ctaUrl, setCtaUrl] = useState("");
  const [autoCloseDays, setAutoCloseDays] = useState("3");
  const [enableSlides, setEnableSlides] = useState(true);
  const [enableVideo, setEnableVideo] = useState(false);
  const [videoQuality, setVideoQuality] = useState<"low" | "medium" | "high">("medium");
  const [configLoaded, setConfigLoaded] = useState(false);

  if (config && !configLoaded) {
    setCtaText(config.closingCtaText ?? "Crie seu bolão no Plakr! →");
    setCtaUrl(config.closingCtaUrl ?? "");
    setAutoCloseDays(String(config.autoCloseDays ?? 3));
    setEnableSlides((config as any).enableSlides !== false);
    setEnableVideo(!!(config as any).enableVideo);
    setVideoQuality((config as any).videoQuality ?? "medium");
    setConfigLoaded(true);
  }

  const generateTestVideo = trpc.pools.generateTestVideo.useMutation({
    onSuccess: () => {
      toast.success("🎬 Gerando vídeo em background! Você receberá uma notificação quando estiver pronto (2-5 minutos).", { duration: 7000 });
    },
    onError: (err: { message?: string }) => toast.error(err.message || "Erro ao iniciar geração do vídeo."),
  });

  const getUrl = (slot: SlotKey): string | null | undefined => {
    if (!config) return undefined;
    const map: Record<SlotKey, string | null | undefined> = {
      slide1: config.slide1Url,
      slide2: config.slide2Url,
      slide3: config.slide3Url,
      slide4: config.slide4Url,
      slide5: config.slide5Url,
      cardPodium: config.cardPodiumUrl,
      cardParticipant: config.cardParticipantUrl,
    };
    return map[slot];
  };

  const handleRemove = (slot: SlotKey) => {
    const urlField = `${slot}Url`;
    const keyField = `${slot}Key`;
    updateConfig.mutate({ [urlField]: null, [keyField]: null } as any);
  };

  const handleSaveBehavior = () => {
    updateConfig.mutate({
      closingCtaText: ctaText,
      closingCtaUrl: ctaUrl || null,
      autoCloseDays: parseInt(autoCloseDays) || 3,
      enableSlides,
      enableVideo,
      videoQuality,
    });
  };

  return (
    <AdminLayout activeSection="retrospectivas">
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold font-display flex items-center gap-2">
            <Film className="h-6 w-6 text-brand" />
            Retrospectivas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Personalize os fundos dos slides e cards de compartilhamento gerados ao concluir um bolão.
          </p>
        </div>

        {/* Info box */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-brand/5 border border-brand/20">
          <Info className="h-4 w-4 text-brand mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Os templates são imagens de <strong>fundo</strong> (PNG ou JPG). O conteúdo dinâmico (nome, pontos, posição) é sobreposto automaticamente.</p>
            <p>Se um slide não tiver template, o <strong>Slide 1</strong> é usado como fallback. Slides sem nenhum template usam fundo escuro padrão.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* ── Formatos de Geração ── */}
            <Card className="border-brand/30 bg-brand/5">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Clapperboard className="h-4 w-4 text-brand" />
                  Formatos de Geração
                </CardTitle>
                <CardDescription>
                  Escolha quais formatos serão gerados automaticamente ao encerrar um bolão. Você pode ativar ambos simultaneamente.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Slides PNG */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border/50 bg-background">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-brand/10">
                      <Layers className="h-5 w-5 text-brand" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">Slides PNG</p>
                        <Badge variant="outline" className="text-xs border-green-500/30 text-green-400 px-1.5 h-4">Recomendado</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        5 slides em formato Stories (9:16) gerados como imagens. Leves, rápidos e ideais para compartilhar no WhatsApp e Instagram.
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={enableSlides}
                    onCheckedChange={setEnableSlides}
                    className="shrink-0 mt-1"
                  />
                </div>

                {/* Vídeo MP4 */}
                <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-border/50 bg-background">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-purple-500/10">
                      <Video className="h-5 w-5 text-purple-400" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">Vídeo MP4</p>
                        <Badge variant="outline" className="text-xs border-purple-500/30 text-purple-400 px-1.5 h-4">Novo</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        Vídeo animado de ~22 segundos com identidade visual do Plakr. Gerado em background após o bolão encerrar. Ideal para Reels e TikTok.
                      </p>
                      {enableVideo && (
                        <div className="mt-3 space-y-2">
                          <Label className="text-xs">Qualidade do vídeo</Label>
                          <div className="flex gap-2">
                            {(["low", "medium", "high"] as const).map((q) => (
                              <button
                                key={q}
                                onClick={() => setVideoQuality(q)}
                                className={`px-3 py-1 rounded text-xs font-medium border transition-colors ${
                                  videoQuality === q
                                    ? "bg-purple-500 border-purple-500 text-white"
                                    : "border-border text-muted-foreground hover:border-purple-500/50"
                                }`}
                              >
                                {q === "low" ? "Baixa" : q === "medium" ? "Média" : "Alta"}
                              </button>
                            ))}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {videoQuality === "low" && "Geração rápida (~1 min). Menor arquivo, ideal para testes."}
                            {videoQuality === "medium" && "Geração em ~2 min. Equilíbrio entre qualidade e velocidade."}
                            {videoQuality === "high" && "Geração em ~3-5 min. Máxima qualidade para compartilhamento."}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Switch
                    checked={enableVideo}
                    onCheckedChange={setEnableVideo}
                    className="shrink-0 mt-1"
                  />
                </div>

                {/* Botão Gerar vídeo teste */}
                <div className="space-y-3 pt-2 border-t border-border/50">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium">Testar geração de vídeo</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Gera um vídeo com dados fictícios para validar o funcionamento antes de ativar em produção.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {(config as any)?.testVideoUrl && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5 text-xs border-green-500/40 text-green-400 hover:bg-green-500/10"
                          onClick={() => window.open((config as any).testVideoUrl, "_blank")}
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          Assistir
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 border-purple-500/40 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300"
                        onClick={() => generateTestVideo.mutate()}
                        disabled={generateTestVideo.isPending}
                      >
                        {generateTestVideo.isPending ? (
                          <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Gerando...</>
                        ) : (
                          <><PlayCircle className="h-3.5 w-3.5" /> Gerar vídeo teste</>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Player embutido do vídeo teste */}
                  {(config as any)?.testVideoUrl && (
                    <div className="rounded-lg overflow-hidden border border-green-500/20 bg-black">
                      <div className="flex items-center justify-between px-3 py-2 bg-green-500/10 border-b border-green-500/20">
                        <div className="flex items-center gap-2">
                          <Video className="h-3.5 w-3.5 text-green-400" />
                          <span className="text-xs text-green-400 font-medium">Último vídeo teste gerado</span>
                        </div>
                        <a
                          href={(config as any).testVideoUrl}
                          download="plakr-retrospectiva-teste.mp4"
                          className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Baixar MP4
                        </a>
                      </div>
                      <video
                        src={(config as any).testVideoUrl}
                        controls
                        playsInline
                        className="w-full max-h-[400px] object-contain"
                        style={{ maxWidth: "100%" }}
                      />
                    </div>
                  )}
                </div>

                {/* Salvar formatos */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveBehavior}
                    disabled={updateConfig.isPending}
                    className="bg-brand hover:bg-brand/90 gap-2"
                  >
                    {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Slides */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Layers className="h-4 w-4 text-brand" />
                  Templates de Slides
                </CardTitle>
                <CardDescription>
                  Proporção 9:16 (stories). Máximo 5 MB cada. Clique ou arraste para enviar.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
                  {SLIDE_SLOTS.map((slot) => (
                    <UploadZone
                      key={slot.key}
                      slot={slot}
                      currentUrl={getUrl(slot.key)}
                      onUploaded={refetch}
                      onRemove={() => handleRemove(slot.key)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Cards */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-brand" />
                  Templates de Cards de Compartilhamento
                </CardTitle>
                <CardDescription>
                  Proporção 4:5. Máximo 5 MB cada.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {CARD_SLOTS.map((slot) => (
                    <UploadZone
                      key={slot.key}
                      slot={slot}
                      currentUrl={getUrl(slot.key)}
                      onUploaded={refetch}
                      onRemove={() => handleRemove(slot.key)}
                    />
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Configurações de comportamento */}
            <Card className="border-border/50">
              <CardHeader className="pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Film className="h-4 w-4 text-brand" />
                  Configurações de Comportamento
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <Label>Dias para auto-conclusão</Label>
                    <Input
                      type="number"
                      min="1"
                      max="30"
                      value={autoCloseDays}
                      onChange={(e) => setAutoCloseDays(e.target.value)}
                      className="h-9"
                    />
                    <p className="text-xs text-muted-foreground">
                      Após todos os jogos finalizados, o bolão é concluído automaticamente se o organizador não confirmar.
                    </p>
                  </div>
                  <div className="space-y-3 sm:col-span-2">
                    <div className="space-y-1.5">
                      <Label>Texto do CTA (Slide 5)</Label>
                      <Input
                        value={ctaText}
                        onChange={(e) => setCtaText(e.target.value)}
                        maxLength={128}
                        placeholder="Crie seu bolão no Plakr! →"
                        className="h-9"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>URL do CTA</Label>
                      <Input
                        value={ctaUrl}
                        onChange={(e) => setCtaUrl(e.target.value)}
                        placeholder="https://plakr.com"
                        className="h-9"
                      />
                    </div>
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleSaveBehavior}
                    disabled={updateConfig.isPending}
                    className="bg-brand hover:bg-brand/90 gap-2"
                  >
                    {updateConfig.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Salvar Configurações
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </AdminLayout>
  );
}
