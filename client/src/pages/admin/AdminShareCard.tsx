/**
 * AdminShareCard — Painel de personalização do card de compartilhamento
 * Permite editar emoji, título, copy, cor de fundo e cor do texto para cada estado emocional
 * Preview em tempo real do card gerado via Canvas 2D
 */
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { useEffect, useState, useCallback, useRef } from "react";
import { toast } from "sonner";
import { Loader2, Save, RotateCcw, Eye, Share2 } from "lucide-react";
import { DEFAULT_SHARE_CARD_CONFIG } from "../../../../drizzle/schema";
import type { ShareCardStateConfig, ShareCardStateItem } from "../../../../drizzle/schema";

// ─── Preview Canvas ───────────────────────────────────────────────────────────

const PREVIEW_MOCK_DATA = {
  teamAName: "Internacional",
  teamBName: "Atletico-PR",
  teamAFlag: "https://media.api-sports.io/football/teams/119.png",
  teamBFlag: "https://media.api-sports.io/football/teams/127.png",
  scoreA: 2,
  scoreB: 1,
  matchDate: new Date("2026-02-25T19:00:00"),
  status: "finished",
  roundName: "Rodada 4",
  tournamentName: "Série A",
  poolName: "Bolão do Escritório",
  predictedScoreA: 2,
  predictedScoreB: 1,
  pointsEarned: 10,
};

const STATE_LABELS: Record<keyof Omit<ShareCardStateConfig, "signatureText">, string> = {
  future: "Jogo Futuro",
  exactHit: "Acerto Exato",
  correctResult: "Resultado Correto",
  miss: "Errou",
  noBet: "Sem Palpite",
};

const STATE_DESCRIPTIONS: Record<keyof Omit<ShareCardStateConfig, "signatureText">, string> = {
  future: "Jogo ainda não aconteceu — incentiva outros a palpitarem",
  exactHit: "Acertou o placar exato — máximo impacto emocional",
  correctResult: "Acertou o resultado mas não o placar exato",
  miss: "Errou o palpite — humor e auto-ironia",
  noBet: "Não fez palpite — incentiva a não perder o próximo",
};

const STATE_EMOJIS: Record<keyof Omit<ShareCardStateConfig, "signatureText">, string> = {
  future: "⚡",
  exactHit: "✅",
  correctResult: "🎯",
  miss: "💀",
  noBet: "😤",
};

// ─── Componente de Preview ────────────────────────────────────────────────────

function CardPreview({
  config,
  activeState,
}: {
  config: ShareCardStateConfig;
  activeState: keyof Omit<ShareCardStateConfig, "signatureText">;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generatePreview = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsGenerating(true);
    try {
      // Importar dinamicamente para evitar dependência circular
      const { generateStoriesCanvas } = await import("@/components/ShareCard");
      const mockData = {
        ...PREVIEW_MOCK_DATA,
        status: activeState === "future" ? "scheduled" : "finished",
        predictedScoreA: activeState === "noBet" ? null : PREVIEW_MOCK_DATA.predictedScoreA,
        predictedScoreB: activeState === "noBet" ? null : PREVIEW_MOCK_DATA.predictedScoreB,
        scoreA: activeState === "future" ? null : PREVIEW_MOCK_DATA.scoreA,
        scoreB: activeState === "future" ? null : PREVIEW_MOCK_DATA.scoreB,
        pointsEarned: activeState === "exactHit" ? 10 : activeState === "correctResult" ? 5 : null,
        shareCardConfig: config,
      };
      const srcCanvas = await generateStoriesCanvas(mockData as any);
      const ctx = canvas.getContext("2d")!;
      canvas.width = srcCanvas.width;
      canvas.height = srcCanvas.height;
      ctx.drawImage(srcCanvas, 0, 0);
    } catch (err) {
      console.error("Erro ao gerar preview:", err);
    } finally {
      setIsGenerating(false);
    }
  }, [config, activeState]);

  useEffect(() => {
    const timer = setTimeout(generatePreview, 300);
    return () => clearTimeout(timer);
  }, [generatePreview]);

  return (
    <div className="relative">
      {isGenerating && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg z-10">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
        </div>
      )}
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: "auto", borderRadius: "12px", display: "block" }}
      />
    </div>
  );
}

// ─── Componente de edição de um estado ───────────────────────────────────────

function StateEditor({
  stateKey,
  value,
  onChange,
}: {
  stateKey: keyof Omit<ShareCardStateConfig, "signatureText">;
  value: ShareCardStateItem;
  onChange: (v: ShareCardStateItem) => void;
}) {
  const label = STATE_LABELS[stateKey];
  const description = STATE_DESCRIPTIONS[stateKey];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Emoji</Label>
          <Input
            value={value.emoji}
            onChange={(e) => onChange({ ...value, emoji: e.target.value })}
            placeholder="⚡"
            className="text-2xl"
            maxLength={4}
          />
        </div>
        <div className="space-y-2">
          <Label>Título</Label>
          <Input
            value={value.title}
            onChange={(e) => onChange({ ...value, title: e.target.value.toUpperCase() })}
            placeholder="MEU PALPITE"
            maxLength={30}
          />
        </div>
      </div>
      <div className="space-y-2">
        <Label>Copy (texto motivacional)</Label>
        <Textarea
          value={value.copy}
          onChange={(e) => onChange({ ...value, copy: e.target.value })}
          placeholder="Você faria o mesmo palpite? Entre e dispute comigo! 🏆"
          rows={2}
          maxLength={120}
          className="resize-none"
        />
        <p className="text-xs text-muted-foreground">{value.copy.length}/120 caracteres</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Cor de fundo do banner</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={value.bgColor}
              onChange={(e) => onChange({ ...value, bgColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <Input
              value={value.bgColor}
              onChange={(e) => onChange({ ...value, bgColor: e.target.value })}
              placeholder="#FFB800"
              className="font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Cor do texto do banner</Label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={value.textColor}
              onChange={(e) => onChange({ ...value, textColor: e.target.value })}
              className="w-10 h-10 rounded cursor-pointer border border-border"
            />
            <Input
              value={value.textColor}
              onChange={(e) => onChange({ ...value, textColor: e.target.value })}
              placeholder="#0B0F1A"
              className="font-mono text-sm"
              maxLength={7}
            />
          </div>
        </div>
      </div>
      {/* Preview do banner */}
      <div
        className="rounded-xl p-4 flex items-center gap-3"
        style={{ backgroundColor: value.bgColor }}
      >
        <span className="text-3xl">{value.emoji}</span>
        <div>
          <p className="font-bold text-sm" style={{ color: value.textColor }}>{value.title || "TÍTULO"}</p>
          <p className="text-xs opacity-80" style={{ color: value.textColor }}>{value.copy || "Copy aqui..."}</p>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminShareCard() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const utils = trpc.useUtils();
  const updateSettings = trpc.platform.updateSettings.useMutation({
    onSuccess: () => {
      toast.success("Configurações do card salvas com sucesso!");
      utils.platform.getSettings.invalidate();
    },
    onError: (err) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });

  const [config, setConfig] = useState<ShareCardStateConfig>(DEFAULT_SHARE_CARD_CONFIG);
  const [activeState, setActiveState] = useState<keyof Omit<ShareCardStateConfig, "signatureText">>("future");
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (settings?.shareCardConfig) {
      setConfig(settings.shareCardConfig as ShareCardStateConfig);
    }
  }, [settings]);

  const handleStateChange = (
    stateKey: keyof Omit<ShareCardStateConfig, "signatureText">,
    value: ShareCardStateItem
  ) => {
    setConfig((prev) => ({ ...prev, [stateKey]: value }));
    setIsDirty(true);
  };

  const handleSignatureChange = (text: string) => {
    setConfig((prev) => ({ ...prev, signatureText: text }));
    setIsDirty(true);
  };

  const handleSave = () => {
    updateSettings.mutate({ shareCardConfig: config });
    setIsDirty(false);
  };

  const handleReset = () => {
    setConfig(DEFAULT_SHARE_CARD_CONFIG);
    setIsDirty(true);
  };

  if (isLoading) {
    return (
      <AdminLayout activeSection="share-card">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-400" />
        </div>
      </AdminLayout>
    );
  }

  const stateKeys = Object.keys(STATE_LABELS) as Array<keyof Omit<ShareCardStateConfig, "signatureText">>;

  return (
    <AdminLayout activeSection="share-card">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Share2 className="w-6 h-6 text-yellow-400" />
              Card de Compartilhamento
            </h1>
            <p className="text-muted-foreground mt-1">
              Personalize o card Stories gerado para cada estado emocional do palpite
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset} disabled={updateSettings.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Restaurar padrões
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateSettings.isPending || !isDirty}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold"
            >
              {updateSettings.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              Salvar alterações
            </Button>
          </div>
        </div>

        {isDirty && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-4 py-2 text-sm text-yellow-400">
            Você tem alterações não salvas. Clique em "Salvar alterações" para aplicar.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna esquerda: Editor */}
          <div className="space-y-4">
            {/* Seletor de estado */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Estado emocional</CardTitle>
                <CardDescription>Selecione o estado para editar</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {stateKeys.map((key) => (
                    <button
                      key={key}
                      onClick={() => setActiveState(key)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                        activeState === key
                          ? "border-yellow-400 bg-yellow-400/10 text-yellow-400"
                          : "border-border bg-card text-muted-foreground hover:border-yellow-400/50"
                      }`}
                    >
                      <span>{STATE_EMOJIS[key]}</span>
                      {STATE_LABELS[key]}
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Editor do estado ativo */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <span className="text-2xl">{STATE_EMOJIS[activeState]}</span>
                  {STATE_LABELS[activeState]}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <StateEditor
                  stateKey={activeState}
                  value={config[activeState]}
                  onChange={(v) => handleStateChange(activeState, v)}
                />
              </CardContent>
            </Card>

            {/* Assinatura */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assinatura do rodapé</CardTitle>
                <CardDescription>Texto exibido na faixa dourada no final do card</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Input
                    value={config.signatureText}
                    onChange={(e) => handleSignatureChange(e.target.value)}
                    placeholder="Jogue no Plakr! · plakr.io"
                    maxLength={60}
                  />
                  <p className="text-xs text-muted-foreground">{config.signatureText.length}/60 caracteres</p>
                </div>
                {/* Preview da assinatura */}
                <div className="mt-3 rounded-lg p-3 flex items-center gap-2" style={{ background: "linear-gradient(90deg, #FFB800, #FFD700)" }}>
                  <div className="w-8 h-8 rounded-md bg-[#0B0F1A] flex items-center justify-center text-yellow-400 font-black text-xs">P!</div>
                  <span className="font-bold text-sm text-[#0B0F1A]">{config.signatureText || "Jogue no Plakr! · plakr.io"}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Coluna direita: Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Eye className="w-4 h-4 text-yellow-400" />
                  Preview — Stories 9:16
                </CardTitle>
                <CardDescription>
                  Visualização do card gerado para o estado "{STATE_LABELS[activeState]}"
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-w-[280px] mx-auto">
                  <CardPreview config={config} activeState={activeState} />
                </div>
                <p className="text-xs text-center text-muted-foreground mt-3">
                  Formato 1080×1920px · PNG · Otimizado para Stories
                </p>
              </CardContent>
            </Card>

            {/* Tabela de estados */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Resumo dos estados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {stateKeys.map((key) => (
                    <div
                      key={key}
                      className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => setActiveState(key)}
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-lg flex-shrink-0"
                        style={{ backgroundColor: config[key].bgColor }}
                      >
                        {config[key].emoji}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{config[key].title}</p>
                        <p className="text-xs text-muted-foreground truncate">{config[key].copy}</p>
                      </div>
                      {activeState === key && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-xs">
                          Editando
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
