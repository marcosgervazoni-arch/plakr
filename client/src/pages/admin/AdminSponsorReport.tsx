/**
 * AdminSponsorReport — Relatório de Desempenho de Patrocínio
 *
 * Exibe métricas de impressões, cliques, CTR e evolução diária para
 * um bolão patrocinado. Permite exportar o relatório como PDF.
 *
 * Acesso: exclusivo Super Admin
 * Paleta: segue Visual Identity Plakr (#0B0F1A, #FFB800, #00FF88, #00C2FF)
 */
import AdminLayout from "@/components/AdminLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  BarChart2,
  Search,
  Loader2,
  Download,
  Eye,
  MousePointerClick,
  Users,
  TrendingUp,
  MessageSquare,
  Megaphone,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

function MetricCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  color: string;
}) {
  return (
    <Card className="bg-card border-border/40">
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-4.5 h-4.5" style={{ color }} />
          </div>
        </div>
        <p className="text-2xl font-bold font-display" style={{ color }}>
          {value}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
        {sub && <p className="text-xs font-medium mt-1" style={{ color }}>{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AdminSponsorReport() {
  const [poolIdInput, setPoolIdInput] = useState("");
  const [poolId, setPoolId] = useState<number | null>(null);

  const { data: report, isLoading, error } = trpc.pools.getSponsorReport.useQuery(
    { poolId: poolId! },
    { enabled: !!poolId }
  );

  const handleSearch = () => {
    const id = parseInt(poolIdInput.trim());
    if (!isNaN(id) && id > 0) setPoolId(id);
  };

  // Preparar dados do gráfico
  const chartData = (() => {
    if (!report?.dailyEvents?.length) return [];
    // Agrupar por data
    const byDate: Record<string, Record<string, number>> = {};
    for (const e of report.dailyEvents) {
      if (!byDate[e.date]) byDate[e.date] = {};
      byDate[e.date][e.eventType] = Number(e.total);
    }
    return Object.entries(byDate).map(([date, counts]) => ({
      date: formatDate(date),
      "Impressões Banner": counts.banner_impression ?? 0,
      "Cliques Banner": counts.banner_click ?? 0,
      "Impressões Popup": counts.popup_impression ?? 0,
      "Cliques Popup": counts.popup_click ?? 0,
    }));
  })();

  // Exportar PDF via print
  const handleExportPDF = () => {
    window.print();
  };

  return (
    <AdminLayout activeSection="sponsorship-report">
      <div className="p-6 max-w-5xl mx-auto space-y-6 print:p-4">

        {/* Header */}
        <div className="flex items-center justify-between gap-4 print:hidden">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#FFB800]/15 flex items-center justify-center">
              <BarChart2 className="w-5 h-5 text-[#FFB800]" />
            </div>
            <div>
              <h1 className="text-xl font-bold font-display">Relatório de Patrocínio</h1>
              <p className="text-xs text-muted-foreground">Métricas de desempenho por bolão</p>
            </div>
          </div>
          {report && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Exportar PDF
            </Button>
          )}
        </div>

        {/* Busca por ID do bolão */}
        <Card className="bg-card border-border/40 print:hidden">
          <CardContent className="p-4">
            <p className="text-sm text-muted-foreground mb-3">
              Informe o ID do bolão para carregar o relatório de patrocínio.
            </p>
            <div className="flex gap-2">
              <Input
                type="number"
                placeholder="ID do bolão (ex: 42)"
                value={poolIdInput}
                onChange={(e) => setPoolIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-xs"
              />
              <Button onClick={handleSearch} className="bg-[#FFB800] hover:bg-[#FF8A00] text-black gap-2">
                <Search className="w-4 h-4" />
                Buscar
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-[#FFB800]" />
          </div>
        )}

        {/* Sem patrocinador */}
        {poolId && !isLoading && !report && !error && (
          <Card className="bg-card border-border/40">
            <CardContent className="p-8 text-center">
              <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum patrocinador configurado para o bolão #{poolId}.</p>
            </CardContent>
          </Card>
        )}

        {/* Relatório */}
        {report && (
          <div className="space-y-6">

            {/* Cabeçalho do relatório */}
            <Card className="bg-card border-border/40">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    {report.sponsor.sponsorLogoUrl && (
                      <img
                        src={report.sponsor.sponsorLogoUrl}
                        alt={report.sponsor.sponsorName}
                        className="w-12 h-12 rounded-xl object-contain bg-white/5 p-1"
                      />
                    )}
                    <div>
                      <h2 className="font-bold text-lg font-display">{report.sponsor.sponsorName}</h2>
                      <p className="text-sm text-muted-foreground">{report.poolName}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge
                      variant={report.sponsor.isActive ? "default" : "secondary"}
                      className={report.sponsor.isActive ? "bg-[#00FF88]/20 text-[#00FF88] border-[#00FF88]/30" : ""}
                    >
                      {report.sponsor.isActive ? "Ativo" : "Inativo"}
                    </Badge>
                    <p className="text-xs text-muted-foreground mt-1">
                      Gerado em {new Date(report.generatedAt).toLocaleString("pt-BR")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* KPIs principais */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <MetricCard
                icon={Users}
                label="Membros ativos"
                value={report.memberCount}
                color="#00C2FF"
              />
              <MetricCard
                icon={Eye}
                label="Impressões banner"
                value={report.totals.banner_impression.toLocaleString("pt-BR")}
                color="#FFB800"
              />
              <MetricCard
                icon={MousePointerClick}
                label="Cliques banner"
                value={report.totals.banner_click.toLocaleString("pt-BR")}
                sub={`CTR ${report.bannerCtr}%`}
                color="#00FF88"
              />
              <MetricCard
                icon={Megaphone}
                label="Impressões popup"
                value={report.totals.popup_impression.toLocaleString("pt-BR")}
                color="#FFB800"
              />
              <MetricCard
                icon={TrendingUp}
                label="Cliques popup"
                value={report.totals.popup_click.toLocaleString("pt-BR")}
                sub={`CTR ${report.popupCtr}%`}
                color="#00FF88"
              />
            </div>

            {/* Boas-vindas */}
            {report.totals.welcome_impression > 0 && (
              <Card className="bg-card border-border/40">
                <CardContent className="p-4 flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-[#00C2FF] shrink-0" />
                  <div>
                    <p className="text-sm font-medium">
                      Mensagem de boas-vindas exibida para{" "}
                      <span className="text-[#00C2FF] font-bold">{report.totals.welcome_impression}</span>{" "}
                      {report.totals.welcome_impression === 1 ? "membro" : "membros"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {report.memberCount > 0
                        ? `${((report.totals.welcome_impression / report.memberCount) * 100).toFixed(0)}% dos membros viram a mensagem`
                        : ""}
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Gráfico de evolução diária */}
            {chartData.length > 0 ? (
              <Card className="bg-card border-border/40">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                    Evolução diária — últimos 30 dias
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 11, fill: "#888" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: "#888" }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#121826",
                          border: "1px solid #ffffff20",
                          borderRadius: "8px",
                          fontSize: "12px",
                        }}
                      />
                      <Legend
                        wrapperStyle={{ fontSize: "11px", paddingTop: "8px" }}
                      />
                      <Bar dataKey="Impressões Banner" fill="#FFB800" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Cliques Banner" fill="#00FF88" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Impressões Popup" fill="#00C2FF" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="Cliques Popup" fill="#FF8A00" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card border-border/40">
                <CardContent className="p-6 text-center">
                  <BarChart2 className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">
                    Ainda não há eventos registrados nos últimos 30 dias.
                    Os dados aparecerão aqui conforme os membros interagirem com o patrocínio.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Resumo para o patrocinador (print-friendly) */}
            <Card className="bg-card border-border/40 hidden print:block">
              <CardContent className="p-5">
                <h3 className="font-bold mb-3">Resumo do Patrocínio</h3>
                <table className="w-full text-sm">
                  <tbody>
                    <tr><td className="py-1 text-muted-foreground">Patrocinador</td><td className="font-medium">{report.sponsor.sponsorName}</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Bolão</td><td className="font-medium">{report.poolName}</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Membros ativos</td><td className="font-medium">{report.memberCount}</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Impressões banner</td><td className="font-medium">{report.totals.banner_impression}</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Cliques banner</td><td className="font-medium">{report.totals.banner_click} (CTR {report.bannerCtr}%)</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Impressões popup</td><td className="font-medium">{report.totals.popup_impression}</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Cliques popup</td><td className="font-medium">{report.totals.popup_click} (CTR {report.popupCtr}%)</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Boas-vindas exibidas</td><td className="font-medium">{report.totals.welcome_impression}</td></tr>
                    <tr><td className="py-1 text-muted-foreground">Gerado em</td><td className="font-medium">{new Date(report.generatedAt).toLocaleString("pt-BR")}</td></tr>
                  </tbody>
                </table>
                <p className="text-xs text-muted-foreground mt-4">Relatório gerado pela plataforma Plakr · plakr.io · contato@plakr.io</p>
              </CardContent>
            </Card>

          </div>
        )}
      </div>
    </AdminLayout>
  );
}
