/**
 * O4 — Controle de Acesso
 * Especificação: tipo de acesso atual, código/link em JetBrains Mono 24px,
 * botões copiar (feedback 2s) e regenerar (AlertDialog), estatísticas de ingresso.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Globe,
  Key,
  Link2,
  Copy,
  Check,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Users,
  QrCode,
} from "lucide-react";
import { useParams } from "wouter";
import { useState } from "react";
import { toast } from "sonner";

type AccessType = "public" | "private_code" | "private_link";

export default function OrganizerAccess() {
  const { slug } = useParams<{ slug: string }>();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenConfirm, setRegenConfirm] = useState<"code" | "link" | null>(null);
  const utils = trpc.useUtils();

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;

  const { data: accessStats } = trpc.pools.getAccessStats.useQuery(
    { poolId: pool?.id ?? 0 },
    { enabled: !!pool?.id }
  );

  const updateMutation = trpc.pools.update.useMutation({
    onSuccess: () => {
      toast.success("Configuração de acesso atualizada.");
      refetch();
    },
    onError: (err) => toast.error(err.message || "Erro ao atualizar acesso."),
  });

  const handleCopy = (text: string, type: "code" | "link") => {
    navigator.clipboard.writeText(text);
    if (type === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
    toast.success("Copiado!");
  };

  const regenMutation = trpc.pools.regenerateAccessCode.useMutation({
    onSuccess: () => {
      utils.pools.getBySlug.invalidate({ slug });
      toast.success("Regenerado com sucesso! O código/link anterior não funciona mais.");
      setRegenConfirm(null);
    },
    onError: (err) => toast.error(err.message || "Erro ao regenerar."),
  });

  const handleRegen = (type: "code" | "link") => {
    if (!pool?.id) return;
    regenMutation.mutate({ poolId: pool.id, type });
  };

  const handleAccessTypeChange = (accessType: AccessType) => {
    if (!pool?.id) return;
    updateMutation.mutate({ poolId: pool.id, accessType });
  };

  const isPro = pool?.plan === "pro";
  const isProExpired = isPro && !!pool?.planExpiresAt && new Date(pool.planExpiresAt).getTime() < Date.now();
  const accessType = (pool?.accessType ?? "private_link") as AccessType;
  const inviteLink = pool?.inviteToken
    ? `${window.location.origin}/join/${pool.inviteToken}`
    : "";

  const accessOptions: { id: AccessType; icon: React.ElementType; label: string; desc: string }[] = [
    { id: "public", icon: Globe, label: "Público", desc: "Qualquer pessoa autenticada pode entrar" },
    { id: "private_code", icon: Key, label: "Privado por código", desc: "Participantes precisam de um código" },
    { id: "private_link", icon: Link2, label: "Privado por link", desc: "Apenas quem tiver o link pode entrar" },
  ];

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="access"
    >
      <div className="p-6 space-y-6 max-w-2xl">
        <div>
          <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
            Controle de Acesso
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure como novos participantes podem ingressar no bolão.
          </p>
        </div>

        {/* Access type selector */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Tipo de Acesso</h3>
          <div className="grid grid-cols-1 gap-3">
            {accessOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => handleAccessTypeChange(opt.id)}
                className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                  accessType === opt.id
                    ? "border-primary bg-primary/5"
                    : "border-border/30 bg-card hover:border-primary/30"
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  accessType === opt.id ? "bg-primary/10" : "bg-muted/50"
                }`}>
                  <opt.icon className={`w-5 h-5 ${accessType === opt.id ? "text-primary" : "text-muted-foreground"}`} />
                </div>
                <div>
                  <p className={`font-semibold text-sm ${accessType === opt.id ? "text-primary" : ""}`}>{opt.label}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </div>
                {accessType === opt.id && (
                  <Check className="w-4 h-4 text-primary ml-auto shrink-0" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Code display */}
        {accessType === "private_code" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Código de Convite</h3>
            <div className="bg-[#22263A] border border-border/30 rounded-xl p-5 space-y-4">
              <div className="text-center">
                <p
                  className="font-bold text-4xl tracking-[0.3em] text-primary select-all"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {pool?.inviteCode ?? "------"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">Compartilhe este código com os participantes</p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => pool?.inviteCode && handleCopy(pool.inviteCode, "code")}
                >
                  {copiedCode ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedCode ? "Copiado!" : "Copiar código"}
                </Button>
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => setRegenConfirm("code")}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Link display */}
        {accessType === "private_link" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Link de Convite</h3>
            <div className="bg-[#22263A] border border-border/30 rounded-xl p-5 space-y-4">
              <div>
                <p
                  className="text-sm font-mono text-muted-foreground break-all leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {inviteLink || "Link não gerado"}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => inviteLink && handleCopy(inviteLink, "link")}
                >
                  {copiedLink ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedLink ? "Copiado!" : "Copiar link"}
                </Button>
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => setRegenConfirm("link")}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Regenerar
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Public info */}
        {accessType === "public" && (
          <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
            <Globe className="w-5 h-5 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-400">Bolão público</p>
              <p className="text-xs text-muted-foreground mt-1">
                Qualquer usuário autenticado pode encontrar e entrar neste bolão pela página de Bolões Públicos.
                Para restringir o acesso, altere o tipo acima.
              </p>
            </div>
          </div>
        )}

        {/* Ingress stats */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estatísticas de Ingresso</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Via código", value: accessStats?.bySource.code ?? "—", icon: Key },
              { label: "Via link", value: accessStats?.bySource.link ?? "—", icon: Link2 },
              { label: "Busca pública", value: accessStats?.bySource.public ?? "—", icon: Globe },
            ].map((stat) => (
              <div key={stat.label} className="bg-card border border-border/30 rounded-xl p-4 text-center space-y-2">
                <stat.icon className="w-4 h-4 text-muted-foreground mx-auto" />
                <p className="font-bold text-2xl" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                  {stat.value}
                </p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Regen AlertDialog */}
      <AlertDialog open={!!regenConfirm} onOpenChange={(o) => !o && setRegenConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Regenerar {regenConfirm === "code" ? "código" : "link"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O {regenConfirm === "code" ? "código" : "link"} atual deixará de funcionar imediatamente.
              Participantes que ainda não ingressaram precisarão do novo {regenConfirm === "code" ? "código" : "link"}.
              Esta ação não afeta quem já está no bolão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              onClick={() => regenConfirm && handleRegen(regenConfirm)}
            >
              {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrganizerLayout>
  );
}
