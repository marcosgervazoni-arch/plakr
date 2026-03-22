import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import {
  BarChart3,
  CreditCard,
  DollarSign,
  ExternalLink,
  Loader2,
  TrendingUp,
  Users,
  Wallet,
  Zap,
} from "lucide-react";

export default function AdminMonetization() {
  const { data: stats, isLoading } = trpc.platform.getStats.useQuery();

  const proConversion = stats
    ? stats.totalPools > 0
      ? Math.round((stats.proPlans / stats.totalPools) * 100)
      : 0
    : 0;

  const monthlyRevenue = stats ? stats.proPlans * 2990 : 0;

  return (
    <AdminLayout activeSection="monetization">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-brand/10">
            <Wallet className="h-5 w-5 text-brand" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display">Financeiro</h1>
            <p className="text-muted-foreground text-sm mt-0.5">Visão geral de receita e estratégias de monetização</p>
          </div>
        </div>

        {/* Métricas */}
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CreditCard className="h-4 w-4 text-brand" />
                  <span className="text-xs text-muted-foreground">Bolões Pro</span>
                </div>
                <p className="text-2xl font-bold font-display">{stats?.proPlans ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">assinaturas ativas</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-green-400" />
                  <span className="text-xs text-muted-foreground">Conversão</span>
                </div>
                <p className="text-2xl font-bold font-display">{proConversion}%</p>
                <p className="text-xs text-muted-foreground mt-1">bolões → Pro</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <DollarSign className="h-4 w-4 text-yellow-400" />
                  <span className="text-xs text-muted-foreground">Receita Est.</span>
                </div>
                <p className="text-2xl font-bold font-display">
                  R${(monthlyRevenue / 100).toFixed(0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">por mês</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span className="text-xs text-muted-foreground">Usuários</span>
                </div>
                <p className="text-2xl font-bold font-display">{stats?.totalUsers ?? 0}</p>
                <p className="text-xs text-muted-foreground mt-1">cadastrados</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Estratégias de monetização */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-brand" />
                <CardTitle className="text-base">Plano Pro por Bolão</CardTitle>
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">Ativo</Badge>
              </div>
              <CardDescription className="text-sm">
                Organizadores pagam para desbloquear recursos avançados no bolão deles.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <span>Participantes ilimitados (vs. limite do plano gratuito)</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <span>Importação automática de resultados via Google Sheets</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <span>Regras de pontuação personalizadas</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-brand mt-1.5 shrink-0" />
                  <span>Identidade visual do bolão (logo, cores)</span>
                </div>
              </div>
              <div className="rounded-lg bg-brand/5 border border-brand/20 p-3">
                <p className="text-xs text-brand font-medium">Configure o preço em Admin → Configurações → Stripe</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <CardTitle className="text-base">Publicidade</CardTitle>
                <Badge variant="outline" className="text-xs border-purple-400/30 text-purple-400">Disponível</Badge>
              </div>
              <CardDescription className="text-sm">
                Exiba banners e anúncios para usuários do plano gratuito.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Banners no dashboard e páginas de bolão</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Controle de posição (topo, rodapé, lateral)</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Rastreamento de cliques por dia</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-purple-400 mt-1.5 shrink-0" />
                  <span>Exportação de relatório CSV</span>
                </div>
              </div>
              <div className="rounded-lg bg-purple-400/5 border border-purple-400/20 p-3">
                <p className="text-xs text-purple-400 font-medium">Gerencie em Admin → Comunicação → Publicidade</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-4 w-4 text-yellow-400" />
                <CardTitle className="text-base">Patrocínio de Bolão</CardTitle>
                <Badge variant="outline" className="text-xs border-yellow-400/30 text-yellow-400">Roadmap</Badge>
              </div>
              <CardDescription className="text-sm">
                Marcas patrocinam bolões específicos em troca de visibilidade.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p>Permite que empresas apareçam como patrocinadores de bolões populares, com logo e link na página do bolão.</p>
              <p className="text-xs italic">Funcionalidade planejada para versão futura.</p>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-400" />
                <CardTitle className="text-base">Dicas de Conversão</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="space-y-2">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  <span>Envie broadcasts para bolões gratuitos com muitos participantes — eles são candidatos naturais ao upgrade</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  <span>Use o limite de participantes do plano gratuito como gatilho de conversão</span>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 shrink-0" />
                  <span>Ofereça período de teste Pro para organizadores de bolões com mais de 20 participantes</span>
                </div>
              </div>
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                Acessar Stripe Dashboard
              </a>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
