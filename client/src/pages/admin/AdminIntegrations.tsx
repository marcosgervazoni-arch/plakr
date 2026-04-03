import AdminLayout from "@/components/AdminLayout";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Save,
  XCircle,
  Code2,
  Zap,
  RefreshCw,
  AlertTriangle,
  Activity,
  Eye,
  EyeOff,
  Play,
  RotateCcw,
  BarChart2,
  Clock,
  CheckCircle,
  XOctagon,
  PackagePlus,
  ListChecks,
  Sparkles,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function AdminIntegrations() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const [gaMeasurementId, setGaMeasurementId] = useState("");
  const [fbPixelId, setFbPixelId] = useState("");
  const [saved, setSaved] = useState(false);

  // Adsterra: código HTML completo por posição (copiado do painel Adsterra → GET CODE)
  const [adTopDesktop, setAdTopDesktop] = useState("");
  const [adTopMobile, setAdTopMobile] = useState("");
  const [adSidebar, setAdSidebar] = useState("");
  const [adBetweenDesktop, setAdBetweenDesktop] = useState("");
  const [adBetweenMobile, setAdBetweenMobile] = useState("");
  const [adBottomDesktop, setAdBottomDesktop] = useState("");
  const [adBottomMobile, setAdBottomMobile] = useState("");
  const [adPopup, setAdPopup] = useState("");
  const [adPopupFrequency, setAdPopupFrequency] = useState<"session" | "daily" | "always">("session");
  const [adNative, setAdNative] = useState("");

  useEffect(() => {
    if (settings) {
      setGaMeasurementId(settings.gaMeasurementId ?? "");
      setFbPixelId(settings.fbPixelId ?? "");
      const scripts = (settings.adNetworkScripts as Record<string, unknown> | null) ?? {};
      const str = (v: unknown): string => (typeof v === "string" ? v : "");
      setAdTopDesktop(str(scripts["top_desktop"]));
      setAdTopMobile(str(scripts["top_mobile"]));
      setAdSidebar(str(scripts["sidebar"]));
      setAdBetweenDesktop(str(scripts["between_desktop"]));
      setAdBetweenMobile(str(scripts["between_mobile"]));
      setAdBottomDesktop(str(scripts["bottom_desktop"]));
      setAdBottomMobile(str(scripts["bottom_mobile"]));
      setAdPopup(str(scripts["popup"]));
      setAdNative(str(scripts["native"]));
      const freq = scripts["popup_frequency"];
      if (freq === "daily" || freq === "always" || freq === "session") {
        setAdPopupFrequency(freq);
      }
    }
  }, [settings]);

  const updateMutation = trpc.platform.updateSettings.useMutation({
    onSuccess: () => {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const gaConfigured = gaMeasurementId.startsWith("G-");
  const fbConfigured = fbPixelId.length > 5;
  const adsterraConfigured = !!(adTopDesktop || adTopMobile || adSidebar || adBetweenDesktop || adPopup);

  // Conta quantos campos Adsterra estão preenchidos
  const adsterraCount = [adTopDesktop, adTopMobile, adSidebar, adBetweenDesktop, adBetweenMobile, adBottomDesktop, adBottomMobile, adPopup, adNative].filter(Boolean).length;

  // ─── API-Football ─────────────────────────────────────────────────────────
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [activeTab, setActiveTab] = useState<"analytics" | "ads" | "apifootball">("analytics");

  const { data: integrationSettings, refetch: refetchIntegration } =
    trpc.integrations.getSettings.useQuery();
  const { data: syncLogs, refetch: refetchLogs } = trpc.integrations.getSyncLogs.useQuery({ limit: 20 });
  const { data: quotaHistory } = trpc.integrations.getQuotaHistory.useQuery();

  const saveIntegrationMutation = trpc.integrations.saveSettings.useMutation({
    onSuccess: () => { toast.success("Configurações salvas!"); refetchIntegration(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const testConnectionMutation = trpc.integrations.testConnection.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        toast.success(`Conexão OK! Plano: ${data.plan} · ${data.requestsRemaining} req restantes`);
      } else {
        toast.error(`Falha: ${data.error}`);
      }
      refetchIntegration();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const manualSyncFixturesMutation = trpc.integrations.manualSyncFixtures.useMutation({
    onSuccess: (data) => {
      toast.success(`Fixtures: ${data.gamesCreated} criados, ${data.gamesUpdated} atualizados`);
      refetchLogs();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const manualSyncResultsMutation = trpc.integrations.manualSyncResults.useMutation({
    onSuccess: (data) => {
      toast.success(`Resultados: ${data.resultsApplied} aplicados`);
      refetchLogs();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const resetCircuitMutation = trpc.integrations.resetCircuitBreaker.useMutation({
    onSuccess: () => { toast.success("Circuit breaker resetado!"); refetchIntegration(); },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const { data: backfillStatus, refetch: refetchBackfill } = trpc.integrations.getBackfillStatus.useQuery();
  const backfillMutation = trpc.integrations.backfillGameData.useMutation({
    onSuccess: (data) => {
      toast.success(`Backfill concluído: ${data.succeeded} processados, ${data.failed} falhas (${data.requestsUsed} req usadas)`);
      refetchBackfill();
      refetchLogs();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ─── Recalculo de Formatos ────────────────────────────────────────────────
  const recalcularFormatosMutation = trpc.integrations.recalcularFormatos.useMutation({
    onSuccess: (data) => {
      if (data.changed > 0) {
        toast.success(`${data.changed} torneio${data.changed !== 1 ? 's' : ''} corrigido${data.changed !== 1 ? 's' : ''} de ${data.total} analisados`);
      } else {
        toast.success(`Todos os ${data.total} torneios já estão com formato correto`);
      }
      refetchTournaments();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ─── Backfill de Análises Pré-Jogo ────────────────────────────────────────────
  const { data: aiBackfillProgress, refetch: refetchAiProgress } = trpc.integrations.getAiBackfillProgress.useQuery(
    {},
    { refetchInterval: (query) => (query.state.data?.status === "running" ? 2000 : false) }
  );
  const backfillAiMutation = trpc.integrations.backfillAiPredictions.useMutation({
    onSuccess: (data) => {
      if (data.started) {
        toast.success(data.message);
        refetchAiProgress();
      } else {
        toast.info(data.message);
      }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // ─── Curadoria de Campeonatos ───────────────────────────────────────────────
  const { data: managedTournaments, refetch: refetchTournaments } = trpc.integrations.listTournaments.useQuery();
  const [apiLeagues, setApiLeagues] = useState<Array<{leagueId: number; name: string; country: string; logoUrl: string; season: number}>>([]);
  const [leagueSearch, setLeagueSearch] = useState("");

  // Seleção de fases antes de importar
  type PhaseOption = { phaseKey: string; phaseName: string; roundCount: number; rounds: string[]; estimatedGames: number };
  const [phaseSelectionLeague, setPhaseSelectionLeague] = useState<{leagueId: number; name: string; country: string; logoUrl: string; season: number} | null>(null);
  const [availablePhases, setAvailablePhases] = useState<PhaseOption[]>([]);
  const [selectedPhases, setSelectedPhases] = useState<Set<string>>(new Set());

  const getLeaguePhasesMutation = trpc.integrations.getLeaguePhases.useMutation({
    onSuccess: (data) => {
      const phases = data as PhaseOption[];
      setAvailablePhases(phases);
      // Pré-selecionar todas as fases
      setSelectedPhases(new Set(phases.map(p => p.phaseKey)));
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const toggleAvailabilityMutation = trpc.integrations.toggleTournamentAvailability.useMutation({
    onSuccess: (_data, vars) => {
      toast.success((vars as {isAvailable: boolean}).isAvailable ? "Campeonato ativado para os usuários!" : "Campeonato desativado.");
      refetchTournaments();
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const fetchLeaguesMutation = trpc.integrations.fetchLeaguesFromApi.useMutation({
    onSuccess: (data) => {
      const leagues = data as Array<{leagueId: number; name: string; country: string; logoUrl: string; season: number}>;
      setApiLeagues(leagues);
      toast.success(`${leagues.length} ligas encontradas na API-Football`);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });
  const importLeagueMutation = trpc.integrations.importLeagueFromApi.useMutation({
    onSuccess: (data) => {
      toast.success((data as {message: string}).message);
      refetchTournaments();
      setApiLeagues([]);
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  // Seleção múltipla para importação em lote
  const [batchSelected, setBatchSelected] = useState<Set<number>>(new Set());
  const [batchResults, setBatchResults] = useState<Array<{leagueId: number; name: string; status: string; message: string}> | null>(null);

  const importBatchMutation = trpc.integrations.importLeaguesBatch.useMutation({
    onSuccess: (data) => {
      const d = data as { results: Array<{leagueId: number; name: string; status: string; message: string}>; imported: number; alreadyExists: number; errors: number };
      setBatchResults(d.results);
      setBatchSelected(new Set());
      refetchTournaments();
      if (d.errors === 0) {
        toast.success(`${d.imported} campeonato${d.imported !== 1 ? "s" : ""} importado${d.imported !== 1 ? "s" : ""} com sucesso!${d.alreadyExists > 0 ? ` (${d.alreadyExists} já existiam)` : ""}`);
      } else {
        toast.warning(`${d.imported} importados, ${d.errors} com erro. Verifique os detalhes.`);
      }
    },
    onError: (e: { message: string }) => toast.error(e.message),
  });

  const [syncingTournamentId, setSyncingTournamentId] = useState<number | null>(null);
  const manualSyncTournamentMutation = trpc.integrations.manualSyncTournament.useMutation({
    onSuccess: (data) => {
      const d = data as { teamsCreated: number; teamsUpdated: number; gamesCreated: number; gamesUpdated: number; requestsUsed: number; teamsError?: string; fixturesError?: string };
      if (d.teamsError || d.fixturesError) {
        toast.warning(`Sync parcial — Times: ${d.teamsCreated} criados | Jogos: ${d.gamesCreated} criados. Erro: ${d.teamsError ?? d.fixturesError}`);
      } else {
        toast.success(`Sync concluído — ${d.teamsCreated} times, ${d.gamesCreated} jogos criados (${d.requestsUsed} req usadas)`);
      }
      setSyncingTournamentId(null);
      refetchTournaments();
    },
    onError: (e: { message: string }) => {
      toast.error(e.message);
      setSyncingTournamentId(null);
    },
  });

  return (
    <AdminLayout activeSection="integrations">
      <div className="space-y-6">
        {/* Header com botão único de salvar */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-brand/10 shrink-0">
              <Globe className="h-5 w-5 text-brand" />
            </div>
            <div>
              <h1 className="text-2xl font-bold font-display">Integrações</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Analytics, rastreamento e rede de anúncios</p>
            </div>
          </div>
          <Button
            className={`gap-2 shrink-0 transition-all duration-300 ${
              saved ? "bg-green-600 hover:bg-green-700" : "bg-brand hover:bg-brand/90"
            }`}
            onClick={() => updateMutation.mutate({
              gaMeasurementId,
              fbPixelId,
              adNetworkScripts: {
                top_desktop: adTopDesktop,
                top_mobile: adTopMobile,
                sidebar: adSidebar,
                between_desktop: adBetweenDesktop,
                between_mobile: adBetweenMobile,
                bottom_desktop: adBottomDesktop,
                bottom_mobile: adBottomMobile,
                popup: adPopup,
                native: adNative,
                popup_frequency: adPopupFrequency,
              },
            })}
            disabled={updateMutation.isPending || isLoading}
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : saved ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">{saved ? "Salvo!" : "Salvar Integrações"}</span>
            <span className="sm:hidden">{saved ? "✓" : "Salvar"}</span>
          </Button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Accordion type="multiple" defaultValue={["analytics", "api-football", "campeonatos"]} className="space-y-2">

            {/* ══ GRUPO 1 — ANALYTICS E PUBLICIDADE ══ */}
            <AccordionItem value="analytics" className="border border-border/50 rounded-xl overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">Analytics e Publicidade</p>
                    <p className="text-xs text-muted-foreground font-normal">Google Analytics 4, Facebook Pixel e Adsterra</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Google Analytics 4 */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-primary/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-primary">G</span>
                    </div>
                    <CardTitle className="text-base">Google Analytics 4</CardTitle>
                  </div>
                  {gaConfigured ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-border text-xs gap-1">
                      <XCircle className="h-3 w-3" /> Inativo
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Rastreie pageviews, eventos e conversões de usuários da plataforma.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Measurement ID</Label>
                  <Input
                    value={gaMeasurementId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGaMeasurementId(e.target.value)}
                    placeholder="G-XXXXXXXXXX"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Formato: <code className="bg-muted px-1 rounded">G-</code> seguido de 10 caracteres</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como obter</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>
                      Acesse{" "}
                      <a href="https://analytics.google.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
                        analytics.google.com <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Crie uma propriedade GA4 para sua plataforma</li>
                    <li>Em <strong>Administrador → Fluxos de dados</strong>, copie o Measurement ID</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Facebook Pixel */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-blue-500/20 flex items-center justify-center">
                      <span className="text-xs font-bold text-blue-400">f</span>
                    </div>
                    <CardTitle className="text-base">Facebook Pixel</CardTitle>
                  </div>
                  {fbConfigured ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Ativo
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-border text-xs gap-1">
                      <XCircle className="h-3 w-3" /> Inativo
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Rastreie conversões e otimize campanhas de anúncios no Meta (Facebook/Instagram).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-1.5">
                  <Label>Pixel ID</Label>
                  <Input
                    value={fbPixelId}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFbPixelId(e.target.value)}
                    placeholder="000000000000000"
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">Número de 15 dígitos do seu Pixel</p>
                </div>
                <div className="rounded-lg border border-border/50 bg-muted/20 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Como obter</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>
                      Acesse{" "}
                      <a href="https://business.facebook.com/events_manager" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
                        Events Manager <ExternalLink className="h-3 w-3" />
                      </a>
                    </li>
                    <li>Crie ou selecione um Pixel existente</li>
                    <li>Copie o <strong>Pixel ID</strong> (número de 15 dígitos)</li>
                  </ol>
                </div>
              </CardContent>
            </Card>

            {/* Adsterra */}
            <Card className="border-border/50 md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded bg-orange-500/20 flex items-center justify-center">
                      <Code2 className="h-3.5 w-3.5 text-orange-400" />
                    </div>
                    <CardTitle className="text-base">Adsterra — Rede de Anúncios</CardTitle>
                  </div>
                  {adsterraConfigured ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> {adsterraCount} zona{adsterraCount !== 1 ? "s" : ""} ativa{adsterraCount !== 1 ? "s" : ""}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-border text-xs gap-1">
                      <XCircle className="h-3 w-3" /> Não configurado
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Cole o código gerado pelo Adsterra em cada posição. Quando não há banner próprio cadastrado, o Adsterra preenche o espaço automaticamente. Usuários Pro nunca veem anúncios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">

                {/* Instruções */}
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-4 space-y-2">
                  <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Como configurar — passo a passo</p>
                  <ol className="text-xs text-muted-foreground space-y-1.5 list-decimal list-inside">
                    <li>
                      Acesse{" "}
                      <a href="https://adsterra.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">
                        adsterra.com <ExternalLink className="h-3 w-3" />
                      </a>{" "}
                      e faça login como Publisher
                    </li>
                    <li>Na lista de unidades de anúncio, clique em <strong>&lt;&gt; GET CODE</strong> ao lado da zona desejada</li>
                    <li>Copie <strong>todo o código</strong> que aparecer (começa com <code className="bg-muted px-1 rounded">&lt;script</code>)</li>
                    <li>Cole no campo correspondente abaixo, de acordo com o tamanho da zona</li>
                    <li>Clique em <strong>Salvar Integrações</strong> — os anúncios aparecem automaticamente nos espaços vazios</li>
                  </ol>
                  <div className="mt-2 p-2 rounded bg-muted/40 border border-border/40">
                    <p className="text-xs text-muted-foreground">
                      <strong className="text-foreground">Dica:</strong> use as zonas criadas com os tamanhos corretos para cada posição.
                      O tamanho esperado está indicado ao lado de cada campo abaixo.
                    </p>
                  </div>
                </div>

                {/* Desktop */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desktop</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdsterraCodeField
                      label="Topo"
                      size="728×90px — Leaderboard"
                      value={adTopDesktop}
                      onChange={setAdTopDesktop}
                    />
                    <AdsterraCodeField
                      label="Sidebar"
                      size="160×600px — Wide Skyscraper"
                      value={adSidebar}
                      onChange={setAdSidebar}
                    />
                    <AdsterraCodeField
                      label="Entre Seções"
                      size="728×90px — Leaderboard"
                      value={adBetweenDesktop}
                      onChange={setAdBetweenDesktop}
                    />
                    <AdsterraCodeField
                      label="Rodapé"
                      size="728×90px — Leaderboard"
                      value={adBottomDesktop}
                      onChange={setAdBottomDesktop}
                    />
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdsterraCodeField
                      label="Topo"
                      size="320×50px — Mobile Banner"
                      value={adTopMobile}
                      onChange={setAdTopMobile}
                    />
                    <AdsterraCodeField
                      label="Entre Seções"
                      size="320×50px — Mobile Banner"
                      value={adBetweenMobile}
                      onChange={setAdBetweenMobile}
                    />
                    <AdsterraCodeField
                      label="Rodapé"
                      size="320×50px — Mobile Banner"
                      value={adBottomMobile}
                      onChange={setAdBottomMobile}
                    />
                  </div>
                </div>

                {/* Native Banner */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Native Banner</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <AdsterraCodeField
                      label="Native Banner"
                      size="Formato nativo — adapta ao layout"
                      value={adNative}
                      onChange={setAdNative}
                      hint="O Native Banner se integra visualmente ao conteúdo da página. Cole o código &lt;script async&gt; gerado pelo Adsterra."
                    />
                  </div>
                </div>

                {/* Popup */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popup / Interstitial</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <AdsterraCodeField
                      label="Popup"
                      size="400×300px — Interstitial"
                      value={adPopup}
                      onChange={setAdPopup}
                      hint="Disparado por navegação (a cada 3 trocas de rota). Frequência configurável abaixo."
                    />
                    <div className="space-y-2">
                      <Label className="text-xs font-medium text-muted-foreground">Frequência do Popup</Label>
                      <Select value={adPopupFrequency} onValueChange={(v) => setAdPopupFrequency(v as "session" | "daily" | "always")}>
                        <SelectTrigger className="h-9 bg-card border-border/50 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="session">1× por sessão (recomendado)</SelectItem>
                          <SelectItem value="daily">1× por dia</SelectItem>
                          <SelectItem value="always">Sempre (toda navegação)</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Controla com que frequência o popup aparece para cada usuário free.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nota sobre implementação */}
            <Card className="border-border/50 md:col-span-2">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Globe className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium">Sobre a implementação dos scripts</p>
                    <p className="text-sm text-muted-foreground">
                      Os códigos salvos aqui são injetados automaticamente nos espaços de anúncio da plataforma.
                      O Google Analytics 4 e o Facebook Pixel são carregados de forma assíncrona para não impactar a performance.
                      Os anúncios Adsterra só aparecem quando não há banner próprio cadastrado na posição correspondente.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Eventos rastreados automaticamente: pageview, login, cadastro, criação de bolão, upgrade para Pro, palpite registrado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ══ GRUPO 2 — API-FOOTBALL ══ */}
            <AccordionItem value="api-football" className="border border-green-500/20 rounded-xl overflow-hidden bg-green-500/5">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-green-500/10 [&[data-state=open]]:bg-green-500/10">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Zap className="h-4 w-4 text-green-400 shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">API-Football</p>
                    <p className="text-xs text-muted-foreground font-normal">Sincronização automática de jogos e resultados</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
<div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
                <Zap className="h-5 w-5 text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold font-display">API-Football — Resultados Automáticos</h2>
                <p className="text-muted-foreground text-sm">Sincronização automática de jogos e resultados. Plano gratuito: 100 req/dia.</p>
              </div>
              {integrationSettings?.apiFootballEnabled ? (
                <Badge className="ml-auto bg-green-500/20 text-green-400 border-green-500/30">Ativo</Badge>
              ) : integrationSettings?.apiFootballKeyConfigured ? (
                <Badge className="ml-auto bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Desativado</Badge>
              ) : (
                <Badge className="ml-auto bg-muted text-muted-foreground">Não configurado</Badge>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* Card: Configuração da Chave */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Activity className="h-4 w-4 text-green-400" />
                    Configuração da Chave
                  </CardTitle>
                  <CardDescription className="text-sm">
                    Insira a chave obtida em{" "}
                    <a href="https://dashboard.api-football.com" target="_blank" rel="noreferrer" className="text-brand underline">
                      dashboard.api-football.com
                    </a>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {integrationSettings?.apiFootballKeyConfigured && (
                    <div className="flex items-center gap-2 p-2 rounded-md bg-green-500/10 border border-green-500/20">
                      <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />
                      <span className="text-xs text-green-400 font-mono">{integrationSettings.apiFootballKeyMasked}</span>
                    </div>
                  )}
                  <div className="space-y-1.5">
                    <Label className="text-xs">Nova chave de API</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Input
                          type={showApiKey ? "text" : "password"}
                          value={apiKeyInput}
                          onChange={(e) => setApiKeyInput(e.target.value)}
                          placeholder="Cole sua chave aqui..."
                          className="font-mono text-xs pr-8"
                        />
                        <button
                          type="button"
                          onClick={() => setShowApiKey(!showApiKey)}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showApiKey ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                      <Button
                        size="sm"
                        disabled={!apiKeyInput || saveIntegrationMutation.isPending}
                        onClick={() => saveIntegrationMutation.mutate({ apiFootballKey: apiKeyInput })}
                      >
                        {saveIntegrationMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Integração ativa</p>
                        <p className="text-xs text-muted-foreground">Liga/desliga toda a sincronização automática</p>
                      </div>
                      <Switch
                        checked={integrationSettings?.apiFootballEnabled ?? false}
                        onCheckedChange={(v) => saveIntegrationMutation.mutate({ apiFootballEnabled: v })}
                        disabled={!integrationSettings?.apiFootballKeyConfigured}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Sincronizar fixtures</p>
                        <p className="text-xs text-muted-foreground">Busca jogos agendados 2x por dia (06h e 18h UTC)</p>
                      </div>
                      <Switch
                        checked={integrationSettings?.apiFootballSyncFixtures ?? false}
                        onCheckedChange={(v) => saveIntegrationMutation.mutate({ apiFootballSyncFixtures: v })}
                        disabled={!integrationSettings?.apiFootballEnabled}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Sincronizar resultados</p>
                        <p className="text-xs text-muted-foreground">Aplica resultado final a cada 2h (apenas dias com jogos)</p>
                      </div>
                      <Switch
                        checked={integrationSettings?.apiFootballSyncResults ?? false}
                        onCheckedChange={(v) => saveIntegrationMutation.mutate({ apiFootballSyncResults: v })}
                        disabled={!integrationSettings?.apiFootballEnabled}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1.5">
                      <Label className="text-xs">ID do Campeonato</Label>
                      <Input
                        type="number"
                        defaultValue={integrationSettings?.apiFootballLeagueId ?? 1}
                        onBlur={(e) => saveIntegrationMutation.mutate({ apiFootballLeagueId: Number(e.target.value) })}
                        className="text-xs"
                        placeholder="1 = Copa do Mundo"
                      />
                      <p className="text-[10px] text-muted-foreground">Copa do Mundo 2022 = ID 1 · Copa do Mundo 2026 requer plano pago</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Temporada</Label>
                      <Input
                        type="number"
                        defaultValue={integrationSettings?.apiFootballSeason ?? 2022}
                        onBlur={(e) => saveIntegrationMutation.mutate({ apiFootballSeason: Number(e.target.value) })}
                        className="text-xs"
                        placeholder="2022"
                      />
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-2"
                    disabled={!integrationSettings?.apiFootballKeyConfigured || testConnectionMutation.isPending}
                    onClick={() => testConnectionMutation.mutate()}
                  >
                    {testConnectionMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    Testar Conexão (consome 1 req)
                  </Button>
                </CardContent>
              </Card>

              {/* Card: Quota e Status */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-brand" />
                    Quota e Status
                  </CardTitle>
                  <CardDescription className="text-sm">Consumo diário de requisições (limite: 100/dia)</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Hoje</span>
                      <span className="font-mono font-medium">
                        {integrationSettings?.quotaUsedToday ?? 0} / {integrationSettings?.quotaLimit ?? 100} req
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${Math.min(100, ((integrationSettings?.quotaUsedToday ?? 0) / (integrationSettings?.quotaLimit ?? 100)) * 100)}%`,
                          backgroundColor:
                            (integrationSettings?.quotaUsedToday ?? 0) > 80
                              ? "#ef4444"
                              : (integrationSettings?.quotaUsedToday ?? 0) > 60
                              ? "#f59e0b"
                              : "#22c55e",
                        }}
                      />
                    </div>
                  </div>

                  {integrationSettings?.apiFootballCircuitOpen && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-red-500/10 border border-red-500/20">
                      <XOctagon className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-red-400">Circuit Breaker Aberto</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Sincronização pausada após erros consecutivos.</p>
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-2 h-7 text-xs gap-1.5 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => resetCircuitMutation.mutate()}
                          disabled={resetCircuitMutation.isPending}
                        >
                          <RotateCcw className="h-3 w-3" />
                          Resetar Circuit Breaker
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      Última sync:{" "}
                      {integrationSettings?.apiFootballLastSync
                        ? new Date(integrationSettings.apiFootballLastSync).toLocaleString("pt-BR")
                        : "Nunca"}
                    </span>
                  </div>

                  {quotaHistory && quotaHistory.length > 0 && (
                    <div className="space-y-1.5">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Histórico (7 dias)</p>
                      <div className="space-y-1">
                        {quotaHistory.slice(0, 7).map((q) => (
                          <div key={q.date} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-20 shrink-0">{q.date}</span>
                            <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full rounded-full bg-brand"
                                style={{ width: `${Math.min(100, (q.requestsUsed / (integrationSettings?.quotaLimit ?? 100)) * 100)}%` }}
                              />
                            </div>
                            <span className="text-xs font-mono w-8 text-right shrink-0">{q.requestsUsed}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 pt-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Sincronização Manual</p>
                    <div className="grid grid-cols-2 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={!integrationSettings?.apiFootballEnabled || manualSyncFixturesMutation.isPending}
                        onClick={() => manualSyncFixturesMutation.mutate()}
                      >
                        {manualSyncFixturesMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        Fixtures
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1.5 text-xs"
                        disabled={!integrationSettings?.apiFootballEnabled || manualSyncResultsMutation.isPending}
                        onClick={() => manualSyncResultsMutation.mutate()}
                      >
                        {manualSyncResultsMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <Play className="h-3 w-3" />}
                        Resultados
                      </Button>
                    </div>
                  </div>

                  {/* Backfill de Estatísticas */}
                  <div className="space-y-2 pt-1 border-t border-border/40 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Reprocessamento</p>
                      {backfillStatus && backfillStatus.pendingCount > 0 && (
                        <span className="text-xs bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full px-2 py-0.5 font-medium">
                          {backfillStatus.pendingCount} pendentes
                        </span>
                      )}
                      {backfillStatus && backfillStatus.pendingCount === 0 && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full px-2 py-0.5 font-medium">
                          Em dia
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Reprocessa jogos finalizados sem estatísticas ou análises de IA.
                      {backfillStatus && backfillStatus.pendingCount > 0
                        ? ` ${backfillStatus.pendingCount} jogo${backfillStatus.pendingCount !== 1 ? "s" : ""} aguardando.`
                        : " Todos os jogos estão atualizados."}
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={!integrationSettings?.apiFootballEnabled || backfillMutation.isPending || (backfillStatus?.pendingCount ?? 0) === 0}
                      onClick={() => backfillMutation.mutate({ batchSize: 50 })}
                    >
                      {backfillMutation.isPending ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Reprocessando...</>
                      ) : (
                        <><BarChart2 className="h-3 w-3" /> Reprocessar jogos finalizados</>
                      )}
                    </Button>
                    {backfillMutation.data && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-0.5">
                        <p>✅ {backfillMutation.data.succeeded} processados com sucesso</p>
                        {backfillMutation.data.failed > 0 && <p>⚠️ {backfillMutation.data.failed} falhas</p>}
                        <p className="text-muted-foreground/70">{backfillMutation.data.requestsUsed} requisições usadas</p>
                      </div>
                    )}
                  </div>

                  {/* Backfill de Análises Pré-Jogo */}
                  <div className="space-y-2 pt-1 border-t border-border/40 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Análises Pré-Jogo (IA)</p>
                      {aiBackfillProgress?.status === "running" && (
                        <span className="text-xs bg-primary/10 text-primary border border-primary/20 rounded-full px-2 py-0.5 font-medium animate-pulse">
                          Em andamento
                        </span>
                      )}
                      {aiBackfillProgress?.status === "done" && aiBackfillProgress.total > 0 && (
                        <span className="text-xs bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 rounded-full px-2 py-0.5 font-medium">
                          Concluído
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Gera análise pré-jogo com probabilidades e recomendação da IA para todos os jogos futuros que ainda não têm análise. O processamento ocorre em segundo plano.
                    </p>

                    {/* Barra de progresso */}
                    {aiBackfillProgress && aiBackfillProgress.status !== "idle" && aiBackfillProgress.total > 0 && (
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">{aiBackfillProgress.message}</span>
                          <span className="font-mono font-medium">
                            {aiBackfillProgress.processed}/{aiBackfillProgress.total}
                          </span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full bg-primary transition-all duration-500"
                            style={{ width: `${Math.round((aiBackfillProgress.processed / aiBackfillProgress.total) * 100)}%` }}
                          />
                        </div>
                        {aiBackfillProgress.errors > 0 && (
                          <p className="text-xs text-amber-500">⚠️ {aiBackfillProgress.errors} erros</p>
                        )}
                      </div>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={backfillAiMutation.isPending || aiBackfillProgress?.status === "running"}
                      onClick={() => backfillAiMutation.mutate({})}
                    >
                      {backfillAiMutation.isPending || aiBackfillProgress?.status === "running" ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Processando em segundo plano...</>
                      ) : (
                        <><Sparkles className="h-3 w-3" /> Gerar todas as análises pré-jogo</>
                      )}
                    </Button>
                  </div>

                  {/* Recalculo de Formatos */}
                  <div className="space-y-2 pt-1 border-t border-border/40 mt-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Formatos de Torneio</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Recalcula o formato (liga/copa/grupos+mata-mata) de todos os torneios importados.
                      Corrige automaticamente torneios com formato errado usando a lista de IDs conhecidos e rounds da API.
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-1.5 text-xs"
                      disabled={recalcularFormatosMutation.isPending}
                      onClick={() => recalcularFormatosMutation.mutate()}
                    >
                      {recalcularFormatosMutation.isPending ? (
                        <><Loader2 className="h-3 w-3 animate-spin" /> Recalculando...</>
                      ) : (
                        <><RefreshCw className="h-3 w-3" /> Recalcular formatos dos torneios</>
                      )}
                    </Button>
                    {recalcularFormatosMutation.data && (
                      <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 space-y-0.5">
                        {recalcularFormatosMutation.data.results
                          .filter(r => r.changed)
                          .map(r => (
                            <p key={r.id}>✅ {r.name}: <span className="line-through">{r.oldFormat}</span> → <strong>{r.newFormat}</strong> <span className="text-muted-foreground/60">({r.source})</span></p>
                          ))}
                        {recalcularFormatosMutation.data.changed === 0 && (
                          <p>✅ Todos os torneios já estão com formato correto</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Card: Log de Sincronizações */}
              <Card className="border-border/50 md:col-span-2">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Activity className="h-4 w-4 text-muted-foreground" />
                      Log de Sincronizações
                    </CardTitle>
                    <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => refetchLogs()}>
                      <RefreshCw className="h-3 w-3" />
                      Atualizar
                    </Button>
                  </div>
                  <CardDescription className="text-sm">Histórico das últimas 20 sincronizações automáticas e manuais</CardDescription>
                </CardHeader>
                <CardContent>
                  {!syncLogs || syncLogs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                      <Activity className="h-8 w-8 mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma sincronização registrada ainda.</p>
                      <p className="text-xs mt-1">Os logs aparecerão aqui após a primeira sincronização.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      {syncLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-3 p-2.5 rounded-md hover:bg-muted/30 transition-colors"
                        >
                          <div className="shrink-0 mt-0.5">
                            {log.status === "success" ? (
                              <CheckCircle className="h-4 w-4 text-green-400" />
                            ) : log.status === "partial" ? (
                              <AlertTriangle className="h-4 w-4 text-yellow-400" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-400" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium">
                                {log.syncType === "fixtures" ? "Fixtures" : "Resultados"}
                              </span>
                              <Badge
                                variant="outline"
                                className={`text-[10px] px-1.5 py-0 ${
                                  log.triggeredBy === "manual"
                                    ? "border-brand/40 text-brand"
                                    : "border-muted-foreground/30 text-muted-foreground"
                                }`}
                              >
                                {log.triggeredBy === "manual" ? "Manual" : "Automático"}
                              </Badge>
                              <span className="text-xs text-muted-foreground ml-auto">
                                {new Date(log.createdAt!).toLocaleString("pt-BR")}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              {log.syncType === "fixtures"
                                ? `${log.gamesCreated ?? 0} criados · ${log.gamesUpdated ?? 0} atualizados · ${log.requestsUsed ?? 0} req`
                                : `${log.resultsApplied ?? 0} resultados aplicados · ${log.requestsUsed ?? 0} req · ${log.durationMs ?? 0}ms`}
                            </p>
                            {log.errorMessage && (
                              <p className="text-xs text-red-400 mt-0.5 truncate">{log.errorMessage}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

            </div>
                </div>
              </AccordionContent>
            </AccordionItem>

            {/* ══ GRUPO 3 — CAMPEONATOS ══ */}
            <AccordionItem value="campeonatos" className="border border-border/50 rounded-xl overflow-hidden">
              <AccordionTrigger className="px-5 py-4 hover:no-underline hover:bg-muted/30 [&[data-state=open]]:bg-muted/20">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <Globe className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="text-left min-w-0">
                    <p className="text-sm font-semibold">Campeonatos Disponíveis</p>
                    <p className="text-xs text-muted-foreground font-normal">Controle quais campeonatos os usuários podem vincular aos seus bolões</p>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 pt-2">
                <div className="space-y-4">
<div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-green-500/10 shrink-0">
              <Globe className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold font-display">Campeonatos Disponíveis</h2>
              <p className="text-sm text-muted-foreground">Controle quais campeonatos os usuários podem vincular aos seus bolões.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card: Campeonatos Cadastrados */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart2 className="h-4 w-4 text-muted-foreground" />
                    Campeonatos Cadastrados
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs" onClick={() => refetchTournaments()}>
                    <RefreshCw className="h-3 w-3" /> Atualizar
                  </Button>
                </div>
                <CardDescription className="text-sm">Ative ou desative a visibilidade para os usuários.</CardDescription>
              </CardHeader>
              <CardContent>
                {!managedTournaments || managedTournaments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                    <Globe className="h-8 w-8 mb-2 opacity-30" />
                    <p className="text-sm">Nenhum campeonato global cadastrado.</p>
                    <p className="text-xs mt-1">Importe da API-Football ou crie manualmente em Campeonatos.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {managedTournaments.map((t) => (
                      <div key={t.id} className="flex items-center justify-between p-2.5 rounded-md border border-border/40 hover:bg-muted/20 transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          {t.logoUrl ? (
                            <img src={t.logoUrl} alt={t.name} className="w-6 h-6 object-contain shrink-0" />
                          ) : (
                            <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                              <Globe className="h-3 w-3 text-muted-foreground" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">{t.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {(t as {country?: string}).country ?? "Global"}
                              {(t as {apiFootballLeagueId?: number}).apiFootballLeagueId ? (
                                <span className="ml-1.5 text-[10px] bg-brand/10 text-brand px-1 rounded">API ID {(t as {apiFootballLeagueId?: number}).apiFootballLeagueId}</span>
                              ) : (
                                <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1 rounded">Manual</span>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {(t as {apiFootballLeagueId?: number}).apiFootballLeagueId && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-brand"
                              title="Re-sincronizar times e jogos da API-Football"
                              disabled={syncingTournamentId === t.id || manualSyncTournamentMutation.isPending}
                              onClick={() => {
                                setSyncingTournamentId(t.id);
                                manualSyncTournamentMutation.mutate({ tournamentId: t.id });
                              }}
                            >
                              {syncingTournamentId === t.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <RefreshCw className="h-3 w-3" />
                              )}
                            </Button>
                          )}
                          <Switch
                            checked={(t as {isAvailable?: boolean}).isAvailable ?? false}
                            onCheckedChange={(v) => toggleAvailabilityMutation.mutate({ tournamentId: t.id, isAvailable: v })}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card: Importar da API-Football */}
            <Card className="border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="h-4 w-4 text-brand" />
                  Importar da API-Football
                </CardTitle>
                <CardDescription className="text-sm">Busque ligas disponíveis e importe para o Plakr com 1 clique. Consome 1 req da quota.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!integrationSettings?.apiFootballEnabled ? (
                  <div className="flex items-center gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                    <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                    <p className="text-xs text-yellow-300">Ative a integração API-Football acima para importar ligas.</p>
                  </div>
                ) : (
                  <>
                    {/* Aviso de limitação do plano free */}
                    <div className="flex items-start gap-2 p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                      <AlertTriangle className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="text-xs text-blue-300 font-medium">Plano Free — Temporadas 2022 a 2024</p>
                        <p className="text-[10px] text-blue-300/70">O plano gratuito da API-Football não acessa a temporada 2026. Use a temporada 2022 para testes (Copa do Mundo 2022 disponível). Para acessar 2026, faça upgrade em dashboard.api-football.com.</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full gap-2"
                      onClick={() => fetchLeaguesMutation.mutate({ season: integrationSettings?.apiFootballSeason ?? 2022 })}
                      disabled={fetchLeaguesMutation.isPending}
                    >
                      {fetchLeaguesMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                      Buscar Ligas da API-Football
                    </Button>
                    {apiLeagues.length > 0 && (
                      <>
                        {/* Barra de filtro + ações em lote */}
                        <div className="flex gap-2">
                          <Input
                            placeholder="Filtrar por nome ou país..."
                            value={leagueSearch}
                            onChange={(e) => { setLeagueSearch(e.target.value); setBatchResults(null); }}
                            className="h-8 text-sm flex-1"
                          />
                          {batchSelected.size > 0 && (
                            <Button
                              size="sm"
                              className="h-8 gap-1.5 text-xs bg-brand hover:bg-brand/90 shrink-0"
                              disabled={importBatchMutation.isPending}
                              onClick={() => {
                                setBatchResults(null);
                                const leaguesToImport = apiLeagues.filter(l => batchSelected.has(l.leagueId));
                                importBatchMutation.mutate({
                                  leagues: leaguesToImport.map(l => ({
                                    leagueId: l.leagueId,
                                    name: l.name,
                                    country: l.country,
                                    logoUrl: l.logoUrl,
                                    season: l.season ?? integrationSettings?.apiFootballSeason ?? 2026,
                                  })),
                                  makeAvailable: true,
                                });
                              }}
                            >
                              {importBatchMutation.isPending
                                ? <><Loader2 className="h-3 w-3 animate-spin" />Importando...</>
                                : <><PackagePlus className="h-3 w-3" />Importar {batchSelected.size}</>}
                            </Button>
                          )}
                        </div>

                        {/* Selecionar todos / desmarcar todos */}
                        {(() => {
                          const INTL_IDS = [1, 2, 3, 11, 13, 15, 16, 39, 61, 78, 135, 140, 253, 262];
                          const filtered = apiLeagues.filter((l) =>
                            leagueSearch === "" ||
                            l.name.toLowerCase().includes(leagueSearch.toLowerCase()) ||
                            l.country.toLowerCase().includes(leagueSearch.toLowerCase())
                          );
                          const notImported = filtered.filter(l =>
                            !managedTournaments?.some((t) => (t as {apiFootballLeagueId?: number}).apiFootballLeagueId === l.leagueId)
                          );
                          const allSelected = notImported.length > 0 && notImported.every(l => batchSelected.has(l.leagueId));
                          const intl = filtered.filter(l => INTL_IDS.includes(l.leagueId));
                          const brazil = filtered.filter(l => !INTL_IDS.includes(l.leagueId));

                          const renderLeague = (league: typeof apiLeagues[0]) => {
                            const alreadyImported = managedTournaments?.some((t) => (t as {apiFootballLeagueId?: number}).apiFootballLeagueId === league.leagueId);
                            const isChecked = batchSelected.has(league.leagueId);
                            return (
                              <div
                                key={league.leagueId}
                                className={`flex items-center gap-2 p-2 rounded border transition-colors cursor-pointer ${
                                  alreadyImported ? "opacity-50 cursor-default border-border/20" :
                                  isChecked ? "border-brand/50 bg-brand/5" : "border-border/30 hover:bg-muted/20"
                                }`}
                                onClick={() => {
                                  if (alreadyImported) return;
                                  const next = new Set(batchSelected);
                                  if (isChecked) next.delete(league.leagueId);
                                  else next.add(league.leagueId);
                                  setBatchSelected(next);
                                  setPhaseSelectionLeague(null);
                                }}
                              >
                                {!alreadyImported ? (
                                  <Checkbox
                                    checked={isChecked}
                                    onCheckedChange={(v) => {
                                      const next = new Set(batchSelected);
                                      if (v) next.add(league.leagueId);
                                      else next.delete(league.leagueId);
                                      setBatchSelected(next);
                                      setPhaseSelectionLeague(null);
                                    }}
                                    className="shrink-0"
                                    onClick={(e) => e.stopPropagation()}
                                  />
                                ) : (
                                  <div className="w-4 h-4 shrink-0" />
                                )}
                                {league.logoUrl && <img src={league.logoUrl} alt={league.name} className="w-5 h-5 object-contain shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium truncate">{league.name}</p>
                                  <p className="text-[10px] text-muted-foreground">{league.country}</p>
                                </div>
                                {alreadyImported ? (
                                  <Badge variant="outline" className="text-[10px] border-green-500/40 text-green-400 shrink-0">Importado</Badge>
                                ) : (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 text-[10px] px-2 shrink-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setPhaseSelectionLeague(league);
                                      setAvailablePhases([]);
                                      setSelectedPhases(new Set());
                                      setBatchSelected(new Set());
                                      getLeaguePhasesMutation.mutate({
                                        leagueId: league.leagueId,
                                        season: league.season ?? integrationSettings?.apiFootballSeason ?? 2026,
                                      });
                                    }}
                                    disabled={getLeaguePhasesMutation.isPending && phaseSelectionLeague?.leagueId === league.leagueId}
                                  >
                                    {getLeaguePhasesMutation.isPending && phaseSelectionLeague?.leagueId === league.leagueId
                                      ? <Loader2 className="h-3 w-3 animate-spin" />
                                      : "Fases"}
                                  </Button>
                                )}
                              </div>
                            );
                          };

                          return (
                            <>
                              {/* Linha selecionar todos */}
                              {notImported.length > 0 && (
                                <div
                                  className="flex items-center gap-2 px-1 py-0.5 cursor-pointer"
                                  onClick={() => {
                                    if (allSelected) {
                                      setBatchSelected(new Set());
                                    } else {
                                      setBatchSelected(new Set(notImported.map(l => l.leagueId)));
                                    }
                                  }}
                                >
                                  <Checkbox
                                    checked={allSelected}
                                    onCheckedChange={(v) => {
                                      if (v) setBatchSelected(new Set(notImported.map(l => l.leagueId)));
                                      else setBatchSelected(new Set());
                                    }}
                                    className="shrink-0"
                                  />
                                  <span className="text-[10px] text-muted-foreground">
                                    {allSelected ? "Desmarcar todos" : `Selecionar todos (${notImported.length} disponíveis)`}
                                  </span>
                                </div>
                              )}

                              <div className="space-y-1 max-h-72 overflow-y-auto pr-1">
                                {intl.length > 0 && (
                                  <>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-1">Internacionais</p>
                                    {intl.map(renderLeague)}
                                  </>
                                )}
                                {brazil.length > 0 && (
                                  <>
                                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide px-1 pt-2">Brasil</p>
                                    {brazil.map(renderLeague)}
                                  </>
                                )}
                                {filtered.length === 0 && (
                                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma liga encontrada para "{leagueSearch}"</p>
                                )}
                              </div>
                            </>
                          );
                        })()}

                        {/* Resultado do batch */}
                        {batchResults && (
                          <div className="rounded-lg border border-border/40 bg-muted/20 p-3 space-y-1.5">
                            <p className="text-xs font-semibold flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5" />Resultado da importação</p>
                            {batchResults.map(r => (
                              <div key={r.leagueId} className="flex items-center gap-2">
                                {r.status === "imported" && <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />}
                                {r.status === "already_exists" && <CheckCircle2 className="h-3 w-3 text-blue-400 shrink-0" />}
                                {r.status === "error" && <XCircle className="h-3 w-3 text-red-400 shrink-0" />}
                                <span className="text-[10px] truncate">{r.name}</span>
                                <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{r.message}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}

                    {/* Painel de seleção de fases (importação individual) */}
                    {phaseSelectionLeague && (
                      <div className="mt-3 p-3 rounded-lg border border-brand/30 bg-brand/5 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {phaseSelectionLeague.logoUrl && <img src={phaseSelectionLeague.logoUrl} alt="" className="w-4 h-4 object-contain" />}
                            <p className="text-xs font-semibold">{phaseSelectionLeague.name} <span className="text-muted-foreground font-normal">(seleção de fases)</span></p>
                          </div>
                          <button onClick={() => setPhaseSelectionLeague(null)} className="text-muted-foreground hover:text-foreground text-xs">×</button>
                        </div>

                        {getLeaguePhasesMutation.isPending ? (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            Buscando fases disponíveis...
                          </div>
                        ) : availablePhases.length === 0 ? (
                          <p className="text-xs text-muted-foreground">Nenhuma fase encontrada.</p>
                        ) : (
                          <>
                            <p className="text-[10px] text-muted-foreground">Selecione as fases que deseja importar. Todas as fases selecionadas serão importadas para <strong className="text-foreground">um único campeonato</strong>.</p>
                            <div className="space-y-1.5">
                              {availablePhases.map((phase) => (
                                <label key={phase.phaseKey} className="flex items-center gap-2 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={selectedPhases.has(phase.phaseKey)}
                                    onChange={(e) => {
                                      const next = new Set(selectedPhases);
                                      if (e.target.checked) next.add(phase.phaseKey);
                                      else next.delete(phase.phaseKey);
                                      setSelectedPhases(next);
                                    }}
                                    className="rounded border-border"
                                  />
                                  <div className="flex-1 min-w-0">
                                    <span className="text-xs font-medium">{phase.phaseName}</span>
                                    <span className="text-[10px] text-muted-foreground ml-1.5">{phase.roundCount} rodadas · ~{phase.estimatedGames} jogos</span>
                                  </div>
                                </label>
                              ))}
                            </div>
                            <Button
                              size="sm"
                              className="w-full h-7 text-xs bg-brand hover:bg-brand/90"
                              disabled={selectedPhases.size === 0 || importLeagueMutation.isPending}
                              onClick={() => {
                                const phasesToImport = availablePhases.filter(p => selectedPhases.has(p.phaseKey));
                                importLeagueMutation.mutate({
                                  leagueId: phaseSelectionLeague!.leagueId,
                                  name: phaseSelectionLeague!.name,
                                  country: phaseSelectionLeague!.country,
                                  logoUrl: phaseSelectionLeague!.logoUrl,
                                  season: phaseSelectionLeague!.season ?? integrationSettings?.apiFootballSeason ?? 2026,
                                  makeAvailable: true,
                                  selectedPhases: phasesToImport.map(p => ({
                                    phaseKey: p.phaseKey,
                                    rounds: p.rounds,
                                  })),
                                }, {
                                  onSuccess: () => {
                                    setPhaseSelectionLeague(null);
                                    setAvailablePhases([]);
                                    setApiLeagues([]);
                                  },
                                });
                              }}
                            >
                              {importLeagueMutation.isPending
                                ? <><Loader2 className="h-3 w-3 animate-spin mr-1" />Importando...</>
                                : selectedPhases.size === availablePhases.length
                                  ? `Importar campeonato completo (${selectedPhases.size} fases)`
                                  : `Importar campeonato com ${selectedPhases.size} fase${selectedPhases.size > 1 ? "s" : ""} selecionada${selectedPhases.size > 1 ? "s" : ""}`
                              }
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

          </div>
                </div>
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        )}
      </div>
    </AdminLayout>
  );
}

// ─── Campo de código Adsterra ─────────────────────────────────────────────────
interface AdsterraCodeFieldProps {
  label: string;
  size: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
}

function AdsterraCodeField({ label, size, value, onChange, hint }: AdsterraCodeFieldProps) {
  const isConfigured = value.trim().length > 0;
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <Label className="text-xs">
          {label}{" "}
          <span className="text-muted-foreground font-normal">({size})</span>
        </Label>
        {isConfigured && (
          <span className="text-[10px] text-green-400 flex items-center gap-0.5">
            <CheckCircle2 className="h-2.5 w-2.5" /> Configurado
          </span>
        )}
      </div>
      <Textarea
        value={value}
        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => onChange(e.target.value)}
        placeholder={`Cole aqui o código copiado do Adsterra (GET CODE)\nEx: <script async...></script>`}
        className="font-mono text-xs resize-none h-20 leading-relaxed"
        spellCheck={false}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}
