/**
 * O6 — Regras de Pontuação
 * Todos os 7 critérios configuráveis conforme SISTEMA-PONTUACAO-PLAKR.md
 * Inclui landslideMinDiff e zebraThreshold como campos personalizáveis.
 * Somente leitura para free / editável para Pro.
 * Bloqueado após início do bolão.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Crown,
  Lock,
  AlertTriangle,
  Info,
  Zap,
  Loader2,
  ChevronRight,
  Target,
  CheckCircle,
  TrendingUp,
  Minus,
  Crosshair,
  Flame,
  Shuffle,
  Clock,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

// ─── TIPOS ────────────────────────────────────────────────────────────────────

interface RuleSection {
  title: string;
  description: string;
  fields: RuleField[];
}

interface RuleField {
  key: string;
  label: string;
  description: string;
  defaultValue: number | boolean;
  type: "number" | "boolean";
  min?: number;
  max?: number;
  unit?: string;
  icon?: React.ReactNode;
  independent?: boolean; // critério independente do resultado
}

// ─── DEFINIÇÃO DOS CRITÉRIOS ──────────────────────────────────────────────────

const RULE_SECTIONS: RuleSection[] = [
  {
    title: "Critérios Dependentes do Resultado",
    description: "Pontos concedidos apenas quando o resultado (vitória/empate) é acertado.",
    fields: [
      {
        key: "exactScorePoints",
        label: "Placar exato",
        description: "Acertou o placar completo (ex: 2×1). Acumula com resultado correto.",
        defaultValue: 10,
        type: "number",
        min: 0, max: 50,
        icon: <Target className="w-4 h-4 text-yellow-400" />,
      },
      {
        key: "correctResultPoints",
        label: "Resultado correto",
        description: "Acertou vitória, empate ou derrota. Sempre somado quando o resultado é correto.",
        defaultValue: 5,
        type: "number",
        min: 0, max: 50,
        icon: <CheckCircle className="w-4 h-4 text-green-400" />,
      },
      {
        key: "totalGoalsPoints",
        label: "Bônus total de gols",
        description: "Acertou a soma total de gols da partida (ex: 3 gols). Requer resultado correto.",
        defaultValue: 3,
        type: "number",
        min: 0, max: 50,
        icon: <TrendingUp className="w-4 h-4 text-blue-400" />,
      },
      {
        key: "landslidePoints",
        label: "Bônus goleada",
        description: "Acertou o resultado de uma goleada (diff ≥ mínimo configurado). Requer resultado correto.",
        defaultValue: 5,
        type: "number",
        min: 0, max: 50,
        icon: <Flame className="w-4 h-4 text-primary" />,
      },
      {
        key: "zebraPoints",
        label: "Bônus zebra",
        description: "Acertou o resultado de uma zebra (favorito perdeu). Requer resultado correto.",
        defaultValue: 1,
        type: "number",
        min: 0, max: 50,
        icon: <Shuffle className="w-4 h-4 text-purple-400" />,
      },
    ],
  },
  {
    title: "Critérios Independentes do Resultado",
    description: "Pontos concedidos mesmo que o resultado (vitória/empate) não seja acertado.",
    fields: [
      {
        key: "goalDiffPoints",
        label: "Bônus diferença de gols",
        description: "Acertou a diferença de gols (ex: diff de 1). Independente do resultado.",
        defaultValue: 3,
        type: "number",
        min: 0, max: 50,
        icon: <Minus className="w-4 h-4 text-cyan-400" />,
        independent: true,
      },
      {
        key: "oneTeamGoalsPoints",
        label: "Bônus gols de um time",
        description: "Acertou os gols de pelo menos um dos times. Independente do resultado.",
        defaultValue: 2,
        type: "number",
        min: 0, max: 50,
        icon: <Crosshair className="w-4 h-4 text-pink-400" />,
        independent: true,
      },
    ],
  },
  {
    title: "Configurações de Goleada",
    description: "Define quando uma partida é considerada goleada para fins de pontuação.",
    fields: [
      {
        key: "landslideMinDiff",
        label: "Diferença mínima para goleada",
        description: "Diferença de gols necessária para ativar o bônus goleada (padrão: 4 gols).",
        defaultValue: 4,
        type: "number",
        min: 1, max: 10,
        unit: "gols",
        icon: <Flame className="w-4 h-4 text-primary" />,
      },
    ],
  },
  {
    title: "Configurações de Zebra",
    description: "Define quando uma partida é considerada zebra para fins de pontuação.",
    fields: [
      {
        key: "zebraThreshold",
        label: "Limiar de zebra (%)",
        description: "% mínimo de apostadores que apostou no favorito para o jogo ser considerado zebra (padrão: 75%).",
        defaultValue: 75,
        type: "number",
        min: 50, max: 100,
        unit: "%",
        icon: <Shuffle className="w-4 h-4 text-purple-400" />,
      },
      {
        key: "zebraEnabled",
        label: "Habilitar bônus zebra",
        description: "Ativa ou desativa o critério de zebra para este bolão.",
        defaultValue: true,
        type: "boolean",
        icon: <Shuffle className="w-4 h-4 text-purple-400" />,
      },
      {
        key: "zebraCountDraw",
        label: "Contar empate como zebra",
        description: "Se ativado, empates também podem ser considerados zebra.",
        defaultValue: false,
        type: "boolean",
        icon: <Shuffle className="w-4 h-4 text-purple-400" />,
      },
    ],
  },
];

// ─── SIMULADOR ────────────────────────────────────────────────────────────────

function simulateScore(
  form: Record<string, number | boolean>,
  predA: number,
  predB: number,
  realA: number,
  realB: number,
  isZebra: boolean
) {
  const breakdown: { label: string; pts: number; icon: string }[] = [];
  let total = 0;

  const exactMatch = predA === realA && predB === realB;
  const predResult = predA > predB ? "A" : predA < predB ? "B" : "D";
  const realResult = realA > realB ? "A" : realA < realB ? "B" : "D";
  const correctResult = predResult === realResult;

  // Critérios independentes (sempre avaliar)
  if (Math.abs(predA - predB) === Math.abs(realA - realB)) {
    const pts = Number(form.goalDiffPoints ?? 3);
    breakdown.push({ label: "Diferença de gols", pts, icon: "📐" });
    total += pts;
  }
  if (predA === realA || predB === realB) {
    const pts = Number(form.oneTeamGoalsPoints ?? 2);
    breakdown.push({ label: "Gols de um time", pts, icon: "🥅" });
    total += pts;
  }

  // Critérios dependentes do resultado
  if (correctResult) {
    // Resultado correto (sempre)
    const ptsCorrect = Number(form.correctResultPoints ?? 5);
    breakdown.push({ label: "Resultado correto", pts: ptsCorrect, icon: "✅" });
    total += ptsCorrect;

    // Placar exato (acumula)
    if (exactMatch) {
      const ptsExact = Number(form.exactScorePoints ?? 10);
      breakdown.push({ label: "Placar exato", pts: ptsExact, icon: "🎯" });
      total += ptsExact;
    }

    // Total de gols
    if (predA + predB === realA + realB) {
      const pts = Number(form.totalGoalsPoints ?? 3);
      breakdown.push({ label: "Total de gols", pts, icon: "⚽" });
      total += pts;
    }

    // Goleada
    const minDiff = Number(form.landslideMinDiff ?? 4);
    if (Math.abs(realA - realB) >= minDiff && Math.abs(predA - predB) >= minDiff) {
      const pts = Number(form.landslidePoints ?? 5);
      breakdown.push({ label: `Goleada (diff ≥ ${minDiff})`, pts, icon: "💥" });
      total += pts;
    }

    // Zebra
    if (form.zebraEnabled !== false && isZebra) {
      const isDrawResult = realResult === "D";
      if (!isDrawResult || form.zebraCountDraw) {
        const pts = Number(form.zebraPoints ?? 1);
        breakdown.push({ label: "Zebra", pts, icon: "🦓" });
        total += pts;
      }
    }
  }

  return { breakdown, total };
}

// ─── COMPONENTE PRINCIPAL ─────────────────────────────────────────────────────

export default function OrganizerRules() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;
  const rules = poolData?.rules;

  const isPro = pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.planExpiresAt && new Date(pool.planExpiresAt).getTime() < Date.now();

  // Verificar se o primeiro jogo já começou (bloquear regras)
  const firstGame = poolData?.games?.[0];
  const isLocked = firstGame
    ? new Date(firstGame.matchDate).getTime() - (rules?.bettingDeadlineMinutes ?? 60) * 60000 < Date.now()
    : false;

  const canEdit = isPro && !isProExpired && !isLocked;

  const [form, setForm] = useState<Record<string, number | boolean>>({});

  const [deadlineMinutes, setDeadlineMinutes] = useState<number>(60);

  useEffect(() => {
    if (rules) {
      setForm({
        exactScorePoints:    rules.exactScorePoints    ?? 10,
        correctResultPoints: rules.correctResultPoints ?? 5,
        totalGoalsPoints:    rules.totalGoalsPoints    ?? 3,
        goalDiffPoints:      rules.goalDiffPoints      ?? 3,
        oneTeamGoalsPoints:  rules.oneTeamGoalsPoints  ?? 2,
        landslidePoints:     rules.landslidePoints     ?? 5,
        landslideMinDiff:    (rules as any).landslideMinDiff ?? 4,
        zebraPoints:         rules.zebraPoints         ?? 1,
        zebraThreshold:      rules.zebraThreshold      ?? 75,
        zebraEnabled:        rules.zebraEnabled        ?? true,
        zebraCountDraw:      rules.zebraCountDraw      ?? false,
      });
      setDeadlineMinutes(rules.bettingDeadlineMinutes ?? 60);
    }
  }, [rules]);

  // Simulador
  const [simPredA, setSimPredA] = useState(2);
  const [simPredB, setSimPredB] = useState(1);
  const [simRealA, setSimRealA] = useState(2);
  const [simRealB, setSimRealB] = useState(1);
  const [simZebra, setSimZebra] = useState(false);
  const [simResult, setSimResult] = useState<ReturnType<typeof simulateScore> | null>(null);

  const updateRulesMutation = trpc.pools.updateScoringRules.useMutation({
    onSuccess: () => {
      toast.success("Regras de pontuação salvas!");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar regras."),
  });

  const handleSave = () => {
    if (!pool?.id) return;
    updateRulesMutation.mutate({
      poolId: pool.id,
      exactScorePoints:       Number(form.exactScorePoints),
      correctResultPoints:    Number(form.correctResultPoints),
      totalGoalsPoints:       Number(form.totalGoalsPoints),
      goalDiffPoints:         Number(form.goalDiffPoints),
      oneTeamGoalsPoints:     Number(form.oneTeamGoalsPoints),
      landslidePoints:        Number(form.landslidePoints),
      landslideMinDiff:       Number(form.landslideMinDiff),
      zebraPoints:            Number(form.zebraPoints),
      zebraThreshold:         Number(form.zebraThreshold),
      zebraEnabled:           Boolean(form.zebraEnabled),
      zebraCountDraw:         Boolean(form.zebraCountDraw),
      bettingDeadlineMinutes: deadlineMinutes,
    });
  };

  const handleSimulate = () => {
    setSimResult(simulateScore(form, simPredA, simPredB, simRealA, simRealB, simZebra));
  };

  const setNumber = (key: string, val: number) =>
    setForm((prev) => ({ ...prev, [key]: val }));
  const setBoolean = (key: string, val: boolean) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="rules"
    >
      <div className="p-6 space-y-6 max-w-3xl">
        <div>
          <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Regras de Pontuação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure como os pontos são calculados nos palpites. Todos os 7 critérios são acumuláveis.
          </p>
        </div>

        {/* Aviso pré-início */}
        {!isLocked && firstGame && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-400">Configure antes do início</p>
              <p className="text-muted-foreground mt-0.5">
                As regras serão bloqueadas quando o prazo do primeiro jogo expirar.
                Primeiro jogo: <strong>{new Date(firstGame.matchDate).toLocaleString("pt-BR")}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Bloqueado */}
        {isLocked && (
          <div className="bg-muted/30 border border-border/30 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              As regras de pontuação não podem ser alteradas após o início do bolão.
            </p>
          </div>
        )}

        {/* Seções de regras */}
        {RULE_SECTIONS.map((section) => (
          <div key={section.title} className="bg-card border border-border/30 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-border/20">
              <h3 className="font-semibold text-sm">{section.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
            </div>
            <div className="divide-y divide-border/20">
              {section.fields.map((field) => (
                <div key={field.key} className="px-4 py-3.5 flex items-center gap-4">
                  <div className="flex items-center gap-2 shrink-0">
                    {field.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium">{field.label}</span>
                      {!isPro && (
                        <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                          <Crown className="w-2.5 h-2.5 mr-1" /> Pro
                        </Badge>
                      )}
                      {field.independent && (
                        <Badge variant="outline" className="text-xs py-0 px-1.5 border-cyan-500/30 text-cyan-400">
                          Independente
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                  </div>

                  {/* Controle */}
                  {field.type === "boolean" ? (
                    canEdit ? (
                      <Switch
                        checked={Boolean(form[field.key] ?? field.defaultValue)}
                        onCheckedChange={(val) => setBoolean(field.key, val)}
                      />
                    ) : (
                      <span className="text-sm font-medium text-muted-foreground">
                        {Boolean((rules as any)?.[field.key] ?? field.defaultValue) ? "Sim" : "Não"}
                      </span>
                    )
                  ) : canEdit ? (
                    <div className="flex items-center gap-1.5">
                      <Input
                        type="number"
                        min={field.min ?? 0}
                        max={field.max ?? 50}
                        value={Number(form[field.key] ?? field.defaultValue)}
                        onChange={(e) => setNumber(field.key, Number(e.target.value))}
                        className="w-20 text-right font-mono bg-background border-border/50"
                      />
                      {field.unit && (
                        <span className="text-xs text-muted-foreground">{field.unit}</span>
                      )}
                    </div>
                  ) : (
                    <span
                      className="font-bold text-lg text-primary w-24 text-right"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      {(rules as any)?.[field.key] ?? field.defaultValue}
                      {field.unit ? ` ${field.unit}` : " pts"}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {canEdit && section === RULE_SECTIONS[RULE_SECTIONS.length - 1] && (
              <div className="px-4 py-3 border-t border-border/20 flex justify-end">
                <Button onClick={handleSave} disabled={updateRulesMutation.isPending}>
                  {updateRulesMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                  ) : (
                    "Salvar todas as regras"
                  )}
                </Button>
              </div>
            )}
          </div>
        ))}

        {/* Botão salvar (aparece após a última seção se canEdit) */}
        {canEdit && (
          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={updateRulesMutation.isPending} size="lg">
              {updateRulesMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
              ) : (
                "Salvar todas as regras"
              )}
            </Button>
          </div>
        )}

        {/* Prazo de encerramento de palpites (Pro) */}
        <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Prazo de Encerramento dos Palpites</h3>
            {!isPro && (
              <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20 ml-auto">
                <Crown className="w-2.5 h-2.5 mr-1" /> Pro
              </Badge>
            )}
          </div>
          <div className="p-4 space-y-4">
            <p className="text-xs text-muted-foreground">
              Define quantos minutos antes do início de cada jogo os palpites são encerrados automaticamente.
            </p>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <input
                  type="range"
                  min={0}
                  max={120}
                  step={5}
                  value={deadlineMinutes}
                  disabled={!canEdit}
                  onChange={(e) => setDeadlineMinutes(Number(e.target.value))}
                  className="w-full accent-primary disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>0 min (até o apito)</span>
                  <span>120 min (2h antes)</span>
                </div>
              </div>
              <div className="text-right shrink-0">
                <p
                  className="font-bold text-2xl text-primary"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {deadlineMinutes}
                </p>
                <p className="text-xs text-muted-foreground">minutos</p>
              </div>
            </div>
            {deadlineMinutes === 0 && (
              <p className="text-xs text-yellow-400 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Palpites aceitos até o apito inicial — sem prazo de corte.
              </p>
            )}
          </div>
        </div>

        {/* Upgrade para Pro */}
        {!isPro && (
          <div className="bg-card border border-border/30 rounded-xl px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">Personalize todas as regras com o Plano Pro</p>
            <Link href={`/pool/${slug}/manage/plan`}>
              <Button size="sm" variant="outline" className="text-xs gap-1.5">
                <Crown className="w-3.5 h-3.5" /> Ver Plano Pro
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}

        {/* Simulador */}
        <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Simulador de Pontuação</h3>
            <span className="text-xs text-muted-foreground ml-1">— teste as regras configuradas acima</span>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Seu palpite</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={20}
                    value={simPredA}
                    onChange={(e) => setSimPredA(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                  <span className="text-muted-foreground font-bold">×</span>
                  <Input
                    type="number" min={0} max={20}
                    value={simPredB}
                    onChange={(e) => setSimPredB(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Resultado real</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number" min={0} max={20}
                    value={simRealA}
                    onChange={(e) => setSimRealA(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                  <span className="text-muted-foreground font-bold">×</span>
                  <Input
                    type="number" min={0} max={20}
                    value={simRealB}
                    onChange={(e) => setSimRealB(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simZebra}
                  onChange={(e) => setSimZebra(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-muted-foreground">🦓 Resultado de zebra</span>
              </label>
              <Button onClick={handleSimulate} size="sm" className="ml-auto">
                <Zap className="w-3.5 h-3.5 mr-1.5" /> Simular
              </Button>
            </div>

            {simResult && (
              <div className="bg-background border border-border/30 rounded-lg p-4 space-y-3 animate-in fade-in duration-200">
                {simResult.breakdown.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center">Nenhum ponto marcado neste palpite.</p>
                ) : (
                  <>
                    <div className="space-y-2">
                      {simResult.breakdown.map((item, i) => (
                        <div key={i} className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            <span className="mr-1.5">{item.icon}</span>
                            {item.label}
                          </span>
                          <span className="font-mono font-semibold text-green-400">+{item.pts} pts</span>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-border/20 pt-3 flex items-center justify-between">
                      <span className="font-semibold text-sm">Total</span>
                      <span
                        className="font-bold text-2xl text-primary"
                        style={{ fontFamily: "'JetBrains Mono', monospace" }}
                      >
                        {simResult.total} pts
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </OrganizerLayout>
  );
}
