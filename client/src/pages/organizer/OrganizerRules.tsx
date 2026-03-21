/**
 * O6 — Regras de Pontuação
 * Especificação: tabela de regras (somente leitura para free / editável para Pro),
 * critérios de desempate, simulador integrado, bloqueio após início do bolão.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Crown,
  Lock,
  AlertTriangle,
  Info,
  Zap,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { Link, useParams } from "wouter";
import { useState, useEffect } from "react";
import { toast } from "sonner";

interface RuleField {
  key: string;
  label: string;
  description: string;
  defaultValue: number;
}

const RULE_FIELDS: RuleField[] = [
  { key: "exactScorePoints", label: "Placar exato", description: "Acertou o placar completo", defaultValue: 10 },
  { key: "correctResultPoints", label: "Resultado correto", description: "Acertou vitória/empate/derrota", defaultValue: 5 },
  { key: "totalGoalsPoints", label: "Bônus total de gols", description: "Acertou o total de gols (requer resultado correto)", defaultValue: 2 },
  { key: "goalDiffPoints", label: "Bônus diferença de gols", description: "Acertou a diferença de gols (requer resultado correto)", defaultValue: 2 },
  { key: "zebraPoints", label: "Bônus zebra", description: "Acertou resultado de zebra (favorito perdeu)", defaultValue: 3 },
];

function simulateScore(
  rules: Record<string, number>,
  predA: number,
  predB: number,
  realA: number,
  realB: number,
  isZebra: boolean
) {
  const breakdown: { label: string; pts: number }[] = [];
  let total = 0;

  const exactMatch = predA === realA && predB === realB;
  const predResult = predA > predB ? "A" : predA < predB ? "B" : "D";
  const realResult = realA > realB ? "A" : realA < realB ? "B" : "D";
  const correctResult = predResult === realResult;

  if (exactMatch) {
    const pts = rules.exactScorePoints ?? 10;
    breakdown.push({ label: "Placar exato", pts });
    total += pts;
  } else if (correctResult) {
    const pts = rules.correctResultPoints ?? 5;
    breakdown.push({ label: "Resultado correto", pts });
    total += pts;

    if (predA + predB === realA + realB) {
      const pts2 = rules.totalGoalsPoints ?? 2;
      breakdown.push({ label: "Bônus total de gols", pts: pts2 });
      total += pts2;
    }
    if (Math.abs(predA - predB) === Math.abs(realA - realB)) {
      const pts3 = rules.goalDiffPoints ?? 2;
      breakdown.push({ label: "Bônus diferença de gols", pts: pts3 });
      total += pts3;
    }
  }

  if (isZebra && correctResult) {
    const pts = rules.zebraPoints ?? 3;
    breakdown.push({ label: "Bônus zebra", pts });
    total += pts;
  }

  return { breakdown, total };
}

export default function OrganizerRules() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;
  const rules = poolData?.rules;

  const isPro = pool?.plan === "pro";
  const isProExpired = false; // TODO: check expiry

  // Check if first game has started (lock rules)
  const firstGame = poolData?.games?.[0];
  const isLocked = firstGame
    ? new Date(firstGame.matchDate).getTime() - (rules?.bettingDeadlineMinutes ?? 60) * 60000 < Date.now()
    : false;

  const canEdit = isPro && !isProExpired && !isLocked;

  const [form, setForm] = useState<Record<string, number>>({});

  useEffect(() => {
    if (rules) {
      setForm({
        exactScorePoints: rules.exactScorePoints,
        correctResultPoints: rules.correctResultPoints,
        totalGoalsPoints: rules.totalGoalsPoints,
        goalDiffPoints: rules.goalDiffPoints,
        zebraPoints: rules.zebraPoints,
      });
    }
  }, [rules]);

  // Simulator state
  const [simPredA, setSimPredA] = useState(2);
  const [simPredB, setSimPredB] = useState(1);
  const [simRealA, setSimRealA] = useState(2);
  const [simRealB, setSimRealB] = useState(1);
  const [simZebra, setSimZebra] = useState(false);
  const [simResult, setSimResult] = useState<{ breakdown: { label: string; pts: number }[]; total: number } | null>(null);

  const updateRulesMutation = trpc.pools.updateScoringRules.useMutation({
    onSuccess: () => {
      toast.success("Regras de pontuação salvas!");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao salvar regras."),
  });

  const handleSave = () => {
    if (!pool?.id) return;
    updateRulesMutation.mutate({ poolId: pool.id, ...form });
  };

  const handleSimulate = () => {
    setSimResult(simulateScore(form, simPredA, simPredB, simRealA, simRealB, simZebra));
  };

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
            Configure como os pontos são calculados nos palpites.
          </p>
        </div>

        {/* Pre-start warning banner */}
        {!isLocked && firstGame && (
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-blue-400">Configure antes do início</p>
              <p className="text-muted-foreground mt-0.5">
                As regras serão bloqueadas automaticamente quando o prazo do primeiro jogo expirar.
                Primeiro jogo: <strong>{new Date(firstGame.matchDate).toLocaleString("pt-BR")}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Locked banner */}
        {isLocked && (
          <div className="bg-muted/30 border border-border/30 rounded-xl p-4 flex items-start gap-3">
            <Lock className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
            <p className="text-sm text-muted-foreground">
              As regras de pontuação não podem ser alteradas após o início do bolão.
            </p>
          </div>
        )}

        {/* Rules table */}
        <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/20">
            <h3 className="font-semibold text-sm">Critérios de Pontuação</h3>
          </div>
          <div className="divide-y divide-border/20">
            {RULE_FIELDS.map((field) => (
              <div key={field.key} className="px-4 py-3.5 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium">{field.label}</span>
                    {!isPro && (
                      <Badge className="text-xs py-0 px-1.5 bg-primary/10 text-primary border-primary/20">
                        <Crown className="w-2.5 h-2.5 mr-1" /> Plano Pro
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{field.description}</p>
                </div>
                {canEdit ? (
                  <Input
                    type="number"
                    min={0}
                    max={50}
                    value={form[field.key] ?? field.defaultValue}
                    onChange={(e) => setForm((prev) => ({ ...prev, [field.key]: Number(e.target.value) }))}
                    className="w-20 text-right font-mono bg-background border-border/50"
                  />
                ) : (
                  <span
                    className="font-bold text-lg text-primary w-20 text-right"
                    style={{ fontFamily: "'JetBrains Mono', monospace" }}
                  >
                    {(rules as any)?.[field.key] ?? field.defaultValue} pts
                  </span>
                )}
              </div>
            ))}
          </div>
          {canEdit && (
            <div className="px-4 py-3 border-t border-border/20 flex justify-end">
              <Button onClick={handleSave} disabled={updateRulesMutation.isPending}>
                {updateRulesMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  "Salvar regras"
                )}
              </Button>
            </div>
          )}
          {!isPro && (
            <div className="px-4 py-3 border-t border-border/20 flex items-center justify-between">
              <p className="text-xs text-muted-foreground">Personalize as regras com o Plano Pro</p>
              <Link href={`/pool/${slug}/manage/plan`}>
                <Button size="sm" variant="outline" className="text-xs gap-1.5">
                  <Crown className="w-3.5 h-3.5" /> Ver Plano Pro
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Simulator */}
        <div className="bg-card border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border/20 flex items-center gap-2">
            <Zap className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm">Simulador de Pontuação</h3>
          </div>
          <div className="p-4 space-y-4">
            <div className="grid grid-cols-2 gap-6">
              {/* Prediction */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Seu palpite</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={simPredA}
                    onChange={(e) => setSimPredA(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                  <span className="text-muted-foreground font-bold">×</span>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={simPredB}
                    onChange={(e) => setSimPredB(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                </div>
              </div>
              {/* Real result */}
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Resultado real</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={simRealA}
                    onChange={(e) => setSimRealA(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                  <span className="text-muted-foreground font-bold">×</span>
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={simRealB}
                    onChange={(e) => setSimRealB(Number(e.target.value))}
                    className="w-16 text-center font-mono text-lg bg-background"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={simZebra}
                  onChange={(e) => setSimZebra(e.target.checked)}
                  className="w-4 h-4 rounded accent-primary"
                />
                <span className="text-sm text-muted-foreground">Resultado de zebra</span>
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
                          <span className="text-muted-foreground">{item.label}</span>
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
