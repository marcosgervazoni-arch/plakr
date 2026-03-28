import AdminLayout from "@/components/AdminLayout";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/lib/trpc";
import {
  CheckCircle2,
  ExternalLink,
  Globe,
  Loader2,
  Save,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function AdminIntegrations() {
  const { data: settings, isLoading } = trpc.platform.getSettings.useQuery();
  const [gaMeasurementId, setGaMeasurementId] = useState("");
  const [fbPixelId, setFbPixelId] = useState("");
  const [saved, setSaved] = useState(false);

  // Adsterra zone IDs por posição
  const [adTopDesktop, setAdTopDesktop] = useState("");
  const [adTopMobile, setAdTopMobile] = useState("");
  const [adSidebar, setAdSidebar] = useState("");
  const [adBetweenDesktop, setAdBetweenDesktop] = useState("");
  const [adBetweenMobile, setAdBetweenMobile] = useState("");
  const [adBottomDesktop, setAdBottomDesktop] = useState("");
  const [adBottomMobile, setAdBottomMobile] = useState("");
  const [adPopup, setAdPopup] = useState("");

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
              <p className="text-muted-foreground text-sm mt-0.5">Analytics e rastreamento de marketing</p>
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
                      <span className="text-xs font-bold text-orange-400">A</span>
                    </div>
                    <CardTitle className="text-base">Adsterra — Rede de Anúncios</CardTitle>
                  </div>
                  {(adTopDesktop || adTopMobile || adSidebar || adBetweenDesktop || adPopup) ? (
                    <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Configurado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-muted-foreground border-border text-xs gap-1">
                      <XCircle className="h-3 w-3" /> Não configurado
                    </Badge>
                  )}
                </div>
                <CardDescription className="text-sm">
                  Preencha os IDs de zona do Adsterra para cada posição. Quando não há banner próprio cadastrado, o Adsterra preenche o espaço automaticamente. Usuários Pro nunca veem anúncios.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {/* Como obter */}
                <div className="rounded-lg border border-orange-500/20 bg-orange-500/5 p-3 space-y-1.5">
                  <p className="text-xs font-semibold text-orange-400 uppercase tracking-wider">Como configurar</p>
                  <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                    <li>Acesse <a href="https://adsterra.com" target="_blank" rel="noopener noreferrer" className="text-brand hover:underline inline-flex items-center gap-1">adsterra.com <ExternalLink className="h-3 w-3" /></a> e crie uma conta como Publisher</li>
                    <li>Para cada posição abaixo, crie uma zona com o tamanho indicado</li>
                    <li>Copie o ID numérico da zona (ex: <code className="bg-muted px-1 rounded">1234567</code>) e cole no campo correspondente</li>
                    <li>Clique em "Salvar Integrações" — os anúncios começam a aparecer imediatamente</li>
                  </ol>
                </div>

                {/* Desktop */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Desktop</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Topo <span className="text-muted-foreground font-normal">(728×90px — Leaderboard)</span></Label>
                      <Input value={adTopDesktop} onChange={e => setAdTopDesktop(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Sidebar <span className="text-muted-foreground font-normal">(300×250px — Medium Rectangle)</span></Label>
                      <Input value={adSidebar} onChange={e => setAdSidebar(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Entre Seções <span className="text-muted-foreground font-normal">(728×90px — Leaderboard)</span></Label>
                      <Input value={adBetweenDesktop} onChange={e => setAdBetweenDesktop(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Rodapé <span className="text-muted-foreground font-normal">(728×90px — Leaderboard)</span></Label>
                      <Input value={adBottomDesktop} onChange={e => setAdBottomDesktop(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                  </div>
                </div>

                {/* Mobile */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Topo <span className="text-muted-foreground font-normal">(320×50px — Mobile Banner)</span></Label>
                      <Input value={adTopMobile} onChange={e => setAdTopMobile(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Entre Seções <span className="text-muted-foreground font-normal">(320×100px — Large Mobile Banner)</span></Label>
                      <Input value={adBetweenMobile} onChange={e => setAdBetweenMobile(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Rodapé <span className="text-muted-foreground font-normal">(320×50px — Mobile Banner)</span></Label>
                      <Input value={adBottomMobile} onChange={e => setAdBottomMobile(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                    </div>
                  </div>
                </div>

                {/* Popup */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Popup / Interstitial</p>
                    <Separator className="flex-1" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Popup <span className="text-muted-foreground font-normal">(400×300px — Interstitial)</span></Label>
                      <Input value={adPopup} onChange={e => setAdPopup(e.target.value)} placeholder="ID da zona (ex: 1234567)" className="font-mono text-sm" />
                      <p className="text-xs text-muted-foreground">Aparece após 2 segundos na primeira visita da sessão</p>
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
                      Os IDs salvos aqui são usados para injetar automaticamente os scripts de rastreamento no frontend da plataforma.
                      O Google Analytics 4 é carregado via gtag.js e o Facebook Pixel via fbevents.js.
                      Ambos são carregados de forma assíncrona para não impactar a performance.
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Eventos rastreados automaticamente: pageview, login, cadastro, criação de bolão, upgrade para Pro, palpite registrado.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
