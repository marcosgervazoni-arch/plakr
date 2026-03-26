/**
 * Regulamento do Bolão — /pool/:slug/rules
 * Exibe as regras de pontuação, critérios de desempate e configurações do bolão.
 */
import { trpc } from "@/lib/trpc";
import AppShell from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, Trophy, Target, TrendingUp, Star, Clock, Users, Shield, CheckCircle2 } from "lucide-react";
import { Link, useParams } from "wouter";

const tiebreakLabels: Record<string, string> = {
  points: "Total de pontos",
  exact: "Placares exatos",
  correct: "Resultados corretos",
  wrong: "Menor número de erros",
  registration_date: "Data de cadastro (mais antigo vence)",
};

export default function PoolRules() {
  const { slug } = useParams<{ slug: string }>();

  const { data: poolData, isLoading: poolLoading } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );

  const poolId = poolData?.pool?.id;

  const { data: rules, isLoading: rulesLoading } = trpc.pools.getScoringRulesPublic.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const isLoading = poolLoading || rulesLoading;

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </AppShell>
    );
  }

  const pool = poolData?.pool;
  const tiebreakOrder = (rules?.tiebreakOrder as string[] | null) ?? ["points", "exact", "correct", "wrong", "registration_date"];

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto px-4 py-6 lg:py-10 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <Link href={`/pool/${slug}`}>
            <Button variant="ghost" size="icon" className="w-8 h-8">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="font-bold text-2xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Regulamento
            </h1>
            {pool && <p className="text-sm text-muted-foreground">{pool.name}</p>}
          </div>
        </div>

        {!rules ? (
          <div className="bg-card border border-border/30 rounded-2xl p-12 text-center space-y-3">
            <Shield className="w-10 h-10 text-muted-foreground/20 mx-auto" />
            <p className="font-semibold text-muted-foreground">Regulamento não configurado</p>
            <p className="text-sm text-muted-foreground/70">
              O organizador ainda não definiu as regras de pontuação deste bolão.
            </p>
          </div>
        ) : (
          <>
            {/* Pontuação */}
            <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Pontuação por Palpite</h2>
              </div>
              <div className="divide-y divide-border/20">
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-green-500/10 flex items-center justify-center">
                      <Trophy className="w-3.5 h-3.5 text-green-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Placar exato</p>
                      <p className="text-xs text-muted-foreground">Acertou o placar completo</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-400 border-green-500/20 font-bold">
                    +{rules.exactScorePoints} pts
                  </Badge>
                </div>
                <div className="px-5 py-3.5 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Resultado correto</p>
                      <p className="text-xs text-muted-foreground">Acertou quem ganhou/empate</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-blue-400 border-blue-500/20 font-bold">
                    +{rules.correctResultPoints} pts
                  </Badge>
                </div>
                {rules.totalGoalsPoints > 0 && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-yellow-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Total de gols</p>
                        <p className="text-xs text-muted-foreground">Acertou a soma de gols</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-500/20 font-bold">
                      +{rules.totalGoalsPoints} pts
                    </Badge>
                  </div>
                )}
                {rules.goalDiffPoints > 0 && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Saldo de gols</p>
                        <p className="text-xs text-muted-foreground">Acertou a diferença de gols (independente do resultado)</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-primary border-primary/20 font-bold">
                      +{rules.goalDiffPoints} pts
                    </Badge>
                  </div>
                )}
                {(rules as any).oneTeamGoalsPoints > 0 && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                        <Target className="w-3.5 h-3.5 text-cyan-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Gols de um time</p>
                        <p className="text-xs text-muted-foreground">Acertou os gols de pelo menos um time (independente do resultado)</p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-cyan-400 border-cyan-500/20 font-bold">
                      +{(rules as any).oneTeamGoalsPoints} pts
                    </Badge>
                  </div>
                )}
                {(rules as any).landslidePoints > 0 && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-red-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Goleada</p>
                        <p className="text-xs text-muted-foreground">
                          Previu e ocorreu goleada (≥{(rules as any).landslideMinDiff ?? 4} gols de diferença)
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-400 border-red-500/20 font-bold">
                      +{(rules as any).landslidePoints} pts
                    </Badge>
                  </div>
                )}
                {rules.zebraEnabled && (
                  <div className="px-5 py-3.5 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <Star className="w-3.5 h-3.5 text-purple-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Bônus zebra</p>
                        <p className="text-xs text-muted-foreground">
                          Acertou resultado de zebra (azarão com {rules.zebraThreshold}%+ de chance de perder)
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-purple-400 border-purple-500/20 font-bold">
                      +{rules.zebraPoints} pts
                    </Badge>
                  </div>
                )}
              </div>
            </div>

            {/* Prazo de palpites */}
            <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <Clock className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Prazo para Palpites</h2>
              </div>
              <div className="px-5 py-4">
                <p className="text-sm text-muted-foreground">
                  Os palpites devem ser registrados até{" "}
                  <span className="font-semibold text-foreground">
                    {rules.bettingDeadlineMinutes >= 60
                      ? `${rules.bettingDeadlineMinutes / 60}h`
                      : `${rules.bettingDeadlineMinutes} minutos`}
                  </span>{" "}
                  antes do início de cada jogo. Após esse prazo, não é possível alterar ou criar palpites.
                </p>
              </div>
            </div>

            {/* Critérios de desempate */}
            <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" />
                <h2 className="font-semibold text-sm">Critérios de Desempate</h2>
              </div>
              <div className="px-5 py-4 space-y-2">
                <p className="text-xs text-muted-foreground mb-3">
                  Em caso de empate na pontuação, os critérios abaixo são aplicados em ordem:
                </p>
                {tiebreakOrder.map((key, idx) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="text-sm">{tiebreakLabels[key] ?? key}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Grupos de comunicação */}
            {rules.groupLinksEnabled && (rules.whatsappGroupLink || rules.telegramGroupLink) && (
              <div className="bg-card border border-border/30 rounded-2xl overflow-hidden">
                <div className="px-5 py-4 border-b border-border/30 flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  <h2 className="font-semibold text-sm">
                    {rules.groupLinksText ?? "Grupos de Comunicação"}
                  </h2>
                </div>
                <div className="px-5 py-4 flex flex-wrap gap-3">
                  {rules.whatsappGroupLink && (
                    <a href={rules.whatsappGroupLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2">
                        <span className="text-green-400">●</span> WhatsApp
                      </Button>
                    </a>
                  )}
                  {rules.telegramGroupLink && (
                    <a href={rules.telegramGroupLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm" className="gap-2">
                        <span className="text-blue-400">●</span> Telegram
                      </Button>
                    </a>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
