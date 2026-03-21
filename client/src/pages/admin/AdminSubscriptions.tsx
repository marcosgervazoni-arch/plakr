import AdminLayout from "@/components/AdminLayout";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Crown, Loader2, TrendingUp, Wallet } from "lucide-react";

export default function AdminSubscriptions() {
  const { data: pools, isLoading } = trpc.pools.adminList.useQuery({ limit: 200 });

  const proPools = (pools ?? []).filter((p) => p.plan === "pro");
  const freePools = (pools ?? []).filter((p) => p.plan === "free");

  return (
    <AdminLayout activeSection="subscriptions">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-display">Assinaturas</h1>
          <p className="text-muted-foreground text-sm mt-1">Visão geral das assinaturas Pro da plataforma</p>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Bolões Pro</p>
              <p className="text-2xl font-bold font-mono text-yellow-400 mt-1">{proPools.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Bolões Free</p>
              <p className="text-2xl font-bold font-mono text-muted-foreground mt-1">{freePools.length}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Taxa de Conversão</p>
              <p className="text-2xl font-bold font-mono text-brand mt-1">
                {(pools ?? []).length > 0
                  ? `${Math.round((proPools.length / (pools ?? []).length) * 100)}%`
                  : "0%"}
              </p>
            </CardContent>
          </Card>
          <Card className="border-border/50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Total Bolões</p>
              <p className="text-2xl font-bold font-mono text-foreground mt-1">{(pools ?? []).length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Lista Pro */}
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Crown className="h-4 w-4 text-yellow-400" />
              Bolões com Plano Pro
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-20">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : proPools.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma assinatura Pro ativa.</p>
            ) : (
              <div className="space-y-2">
                {proPools.map((p) => (
                  <div key={p.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                    <div>
                      <p className="text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{p.slug}</p>
                    </div>
                    <div className="text-right">
                      {p.planExpiresAt && (
                        <p className="text-xs text-muted-foreground">
                          Expira: {format(new Date(p.planExpiresAt), "dd/MM/yyyy", { locale: ptBR })}
                        </p>
                      )}
                      {p.stripeSubscriptionId && (
                        <p className="text-xs text-muted-foreground font-mono truncate max-w-[140px]">
                          {p.stripeSubscriptionId.slice(0, 20)}...
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
