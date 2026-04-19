import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquare, TrendingUp, TrendingDown, Minus, Star, Zap, Users, ChevronDown } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const CES_EMOJIS = ["😫", "😕", "😐", "🙂", "😄"];
const CSAT_EMOJIS = ["😠", "😞", "😐", "😊", "🤩"];
const CES_LABELS = ["Muito difícil", "Difícil", "Neutro", "Fácil", "Muito fácil"];
const CSAT_LABELS = ["Péssimo", "Ruim", "Regular", "Bom", "Incrível"];

const CONTEXT_LABELS: Record<string, string> = {
  create_pool: "Criar bolão",
  first_bet: "Primeiro palpite",
  accept_invite: "Aceitar convite",
  pool_ended: "Bolão encerrado",
  general: "Geral",
};

const SCORE_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#10b981"];

function ScoreCard({
  title,
  score,
  total,
  trend,
  type,
}: {
  title: string;
  score: number | null;
  total: number;
  trend?: number;
  type: "ces" | "csat";
}) {
  const emojis = type === "ces" ? CES_EMOJIS : CSAT_EMOJIS;
  const scoreIndex = score != null ? Math.round(score) - 1 : null;
  const emoji = scoreIndex != null && scoreIndex >= 0 ? emojis[scoreIndex] : "—";
  const scoreColor =
    score == null
      ? "text-muted-foreground"
      : score >= 4
      ? "text-emerald-400"
      : score >= 3
      ? "text-yellow-400"
      : "text-red-400";

  return (
    <Card className="bg-card border-border/50">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{title}</p>
            <div className="flex items-end gap-2 mt-1">
              <span className={`text-3xl font-bold font-display ${scoreColor}`}>
                {score != null ? score.toFixed(1) : "—"}
              </span>
              <span className="text-sm text-muted-foreground mb-0.5">/5</span>
              <span className="text-2xl mb-0.5">{emoji}</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">{total} respostas</p>
          </div>
          {trend != null && (
            <div
              className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full ${
                trend > 0
                  ? "bg-emerald-500/10 text-emerald-400"
                  : trend < 0
                  ? "bg-red-500/10 text-red-400"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {trend > 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : trend < 0 ? (
                <TrendingDown className="w-3 h-3" />
              ) : (
                <Minus className="w-3 h-3" />
              )}
              {Math.abs(trend).toFixed(1)}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function DistributionChart({ data, type }: { data: { score: number; count: number }[]; type: "ces" | "csat" }) {
  const emojis = type === "ces" ? CES_EMOJIS : CSAT_EMOJIS;
  const chartData = [1, 2, 3, 4, 5].map((score) => ({
    name: emojis[score - 1],
    count: data.find((d) => d.score === score)?.count ?? 0,
    fill: SCORE_COLORS[score - 1],
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis dataKey="name" tick={{ fontSize: 18 }} />
        <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} />
        <Tooltip
          contentStyle={{ background: "#1a1a2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }}
          labelStyle={{ color: "#e5e7eb" }}
          itemStyle={{ color: "#9ca3af" }}
        />
        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
          {chartData.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

function CommentCard({ item }: { item: any }) {
  const emojis = item.type === "ces" ? CES_EMOJIS : CSAT_EMOJIS;
  const emoji = emojis[item.score - 1] ?? "—";
  const scoreColor =
    item.score >= 4 ? "text-emerald-400" : item.score >= 3 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="flex gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
      <div className="shrink-0 text-xl">{emoji}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className={`text-sm font-bold ${scoreColor}`}>{item.score}/5</span>
          <Badge variant="outline" className="text-xs h-5 px-1.5">
            {CONTEXT_LABELS[item.context] ?? item.context}
          </Badge>
          <Badge variant="outline" className="text-xs h-5 px-1.5 uppercase">
            {item.type}
          </Badge>
          <span className="text-xs text-muted-foreground ml-auto">
            {format(new Date(item.createdAt), "dd MMM", { locale: ptBR })}
          </span>
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed">{item.comment}</p>
      </div>
    </div>
  );
}

export default function AdminFeedback() {
  const [activeTab, setActiveTab] = useState<"ces" | "csat">("ces");
  const [showAll, setShowAll] = useState(false);

  const { data: cesData, isLoading: cesLoading } = trpc.feedback.getStats.useQuery(
    { type: "ces", days: 30 },
    { staleTime: 2 * 60 * 1000 }
  );
  const { data: csatData, isLoading: csatLoading } = trpc.feedback.getStats.useQuery(
    { type: "csat", days: 30 },
    { staleTime: 2 * 60 * 1000 }
  );
  const { data: allData } = trpc.feedback.getStats.useQuery(
    { type: "all", days: 30 },
    { staleTime: 2 * 60 * 1000 }
  );

  const isLoading = cesLoading || csatLoading;

  const cesStats = cesData ? {
    avgScore: cesData.overall.avgScore,
    total: cesData.overall.total,
    distribution: cesData.distribution.map((d: any) => ({ score: d.score, count: Number(d.total) })),
    byContext: cesData.byContext.map((c: any) => ({ context: c.context, avgScore: Number(c.avgScore ?? 0), count: Number(c.total) })),
  } : null;

  const csatStats = csatData ? {
    avgScore: csatData.overall.avgScore,
    total: csatData.overall.total,
    distribution: csatData.distribution.map((d: any) => ({ score: d.score, count: Number(d.total) })),
    byContext: csatData.byContext.map((c: any) => ({ context: c.context, avgScore: Number(c.avgScore ?? 0), count: Number(c.total) })),
  } : null;

  const recentComments = allData?.comments ?? [];
  const visibleComments = showAll ? recentComments : recentComments.slice(0, 5);

  return (
    <AdminLayout activeSection="feedback">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display">Feedback dos Usuários</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              CES (esforço) e CSAT (satisfação) coletados nos momentos-chave da jornada
            </p>
          </div>
          <Badge variant="outline" className="gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" />
            {(cesStats?.total ?? 0) + (csatStats?.total ?? 0)} respostas totais
          </Badge>
        </div>

        {/* Score Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <ScoreCard
            title="CES Médio"
            score={cesStats?.avgScore ?? null}
            total={cesStats?.total ?? 0}
            type="ces"
          />
          <ScoreCard
            title="CSAT Médio"
            score={csatStats?.avgScore ?? null}
            total={csatStats?.total ?? 0}
            type="csat"
          />
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Comentários</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold font-display text-primary">
                  {recentComments.length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">com texto qualitativo</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border/50">
            <CardContent className="p-5">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Alertas</p>
              <div className="flex items-end gap-2 mt-1">
                <span className="text-3xl font-bold font-display text-red-400">
                  {recentComments.filter((c: any) => c.score <= 2).length}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">notas ≤ 2 (atenção)</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs CES / CSAT */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "ces" | "csat")}>
          <TabsList className="bg-muted/50">
            <TabsTrigger value="ces" className="gap-1.5">
              <Zap className="w-3.5 h-3.5" />
              CES — Esforço
            </TabsTrigger>
            <TabsTrigger value="csat" className="gap-1.5">
              <Star className="w-3.5 h-3.5" />
              CSAT — Satisfação
            </TabsTrigger>
          </TabsList>

          {(["ces", "csat"] as const).map((type) => {
            const s = type === "ces" ? cesStats : csatStats;
            const labels = type === "ces" ? CES_LABELS : CSAT_LABELS;
            const emojis = type === "ces" ? CES_EMOJIS : CSAT_EMOJIS;

            return (
              <TabsContent key={type} value={type} className="space-y-4 mt-4">
                {/* Distribuição geral */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Distribuição de Notas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                          Carregando...
                        </div>
                      ) : s?.distribution?.length ? (
                        <DistributionChart data={s.distribution} type={type} />
                      ) : (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                          Nenhuma resposta ainda
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Por contexto */}
                  <Card className="bg-card border-border/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">Por Momento da Jornada</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {isLoading ? (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                          Carregando...
                        </div>
                      ) : s?.byContext?.length ? (
                        <div className="space-y-2.5">
                          {s.byContext.map((ctx: any) => (
                            <div key={ctx.context} className="flex items-center gap-3">
                              <span className="text-xs text-muted-foreground w-32 shrink-0">
                                {CONTEXT_LABELS[ctx.context] ?? ctx.context}
                              </span>
                              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${(ctx.avgScore / 5) * 100}%`,
                                    background:
                                      ctx.avgScore >= 4
                                        ? "#10b981"
                                        : ctx.avgScore >= 3
                                        ? "#eab308"
                                        : "#ef4444",
                                  }}
                                />
                              </div>
                              <span className="text-xs font-medium w-8 text-right">
                                {ctx.avgScore.toFixed(1)}
                              </span>
                              <span className="text-xs text-muted-foreground w-16 text-right">
                                {ctx.count} resp.
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="h-40 flex items-center justify-center text-muted-foreground text-sm">
                          Nenhuma resposta ainda
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Legenda de emojis */}
                <div className="flex flex-wrap gap-3">
                  {emojis.map((emoji, i) => (
                    <div key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <span className="text-base">{emoji}</span>
                      <span>{i + 1} — {labels[i]}</span>
                    </div>
                  ))}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Comentários qualitativos */}
        {recentComments.length > 0 && (
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-primary" />
                  Comentários Qualitativos
                </CardTitle>
                <Badge variant="outline" className="text-xs">
                  {recentComments.filter((c: any) => c.score <= 2).length} alertas críticos
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {/* Alertas críticos primeiro */}
              {visibleComments
                .sort((a: any, b: any) => a.score - b.score)
                .map((item: any, i: number) => (
                  <CommentCard key={i} item={item} />
                ))}
              {recentComments.length > 5 && !showAll && (
                <button
                  onClick={() => setShowAll(true)}
                  className="w-full flex items-center justify-center gap-1.5 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                  Ver mais {recentComments.length - 5} comentários
                </button>
              )}
            </CardContent>
          </Card>
        )}

        {/* Estado vazio */}
        {!isLoading && (cesStats?.total ?? 0) === 0 && (csatStats?.total ?? 0) === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground font-medium">Nenhum feedback coletado ainda</p>
            <p className="text-sm text-muted-foreground/70 mt-1 max-w-sm">
              Os banners e modais de feedback aparecerão para os usuários após ações-chave como criar bolão e fazer palpites.
            </p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
