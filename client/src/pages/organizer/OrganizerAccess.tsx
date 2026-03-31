/**
 * O4 — Controle de Acesso
 * Especificação: tipo de acesso atual, código/link em JetBrains Mono 24px,
 * botões copiar (feedback 2s) e regenerar (AlertDialog), estatísticas de ingresso.
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { AdBanner } from "@/components/AdBanner";
import { AdInterleaved } from "@/components/AdInterleaved";
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
import { Input } from "@/components/ui/input";
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
  Crown,
  TrendingUp,
  UserCheck,
  Lock,
  Share2,
  DollarSign,
  Info,
  Save,
} from "lucide-react";
import { useParams } from "wouter";
import { useState, useRef } from "react";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useImageUpload } from "@/hooks/useImageUpload";

type AccessType = "public" | "private_link";

export default function OrganizerAccess() {
  const { slug } = useParams<{ slug: string }>();
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [regenConfirm, setRegenConfirm] = useState<boolean>(false);
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
      toast.success("Regenerado com sucesso! O link anterior não funciona mais.");
      setRegenConfirm(false);
    },
    onError: (err) => toast.error(err.message || "Erro ao regenerar."),
  });

  const handleRegen = () => {
    if (!pool?.id) return;
    regenMutation.mutate({ poolId: pool.id });
  };

  const handleAccessTypeChange = (accessType: AccessType) => {
    if (!pool?.id) return;
    updateMutation.mutate({ poolId: pool.id, accessType });
  };

  const { isPro, isProExpired } = useUserPlan();
  void isProExpired; // usado no OrganizerLayout
  const accessType = (pool?.accessType ?? "private_link") as AccessType;

  // Taxa de inscrição
  const [entryFeeInput, setEntryFeeInput] = useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null); // URL após upload ou URL atual
  const [feeEditing, setFeeEditing] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  // Sincronizar com dados do pool quando carregarem
  const currentFee = pool?.entryFee ? Number(pool.entryFee) : null;
  const currentQr = (pool as any)?.entryQrCodeUrl ?? null;

  const { upload: uploadQrCode, uploading: uploadingQr } = useImageUpload({
    folder: "pool-qrcodes",
    maxSizeMB: 2,
    onSuccess: (url) => {
      setQrPreviewUrl(url);
      toast.success("QR Code carregado com sucesso!");
    },
    onError: (err) => toast.error(err),
  });

  const handleQrFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // Preview local imediato
    const localUrl = URL.createObjectURL(file);
    setQrPreviewUrl(localUrl);
    // Upload para S3
    const uploadedUrl = await uploadQrCode(file);
    if (uploadedUrl) {
      setQrPreviewUrl(uploadedUrl);
    } else {
      // Reverter preview se upload falhou
      setQrPreviewUrl(null);
    }
    // Limpar input para permitir re-upload do mesmo arquivo
    if (qrFileInputRef.current) qrFileInputRef.current.value = "";
  };

  const handleSaveFee = () => {
    if (!pool?.id) return;
    const fee = entryFeeInput ? parseFloat(entryFeeInput.replace(",", ".")) : null;
    if (fee !== null && (isNaN(fee) || fee < 0)) {
      toast.error("Valor inválido. Use um número positivo.");
      return;
    }
    updateMutation.mutate({
      poolId: pool.id,
      entryFee: fee,
      entryQrCodeUrl: qrPreviewUrl || null,
    }, {
      onSuccess: () => {
        toast.success("Taxa de inscrição atualizada.");
        setFeeEditing(false);
        refetch();
      },
    });
  };
  const inviteLink = pool?.inviteToken
    ? `${window.location.origin}/join/${pool.inviteToken}`
    : "";

  const accessOptions: { id: AccessType; icon: React.ElementType; label: string; desc: string }[] = [
    { id: "public", icon: Globe, label: "Público", desc: "Qualquer pessoa autenticada pode entrar" },
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

        {/* Invite permission — apenas para bolões privados */}
        {accessType === "private_link" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Permissão de Convite</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: "organizer_only" as const, icon: Lock, label: "Apenas o organizador", desc: "Só você pode compartilhar o link de convite" },
                { id: "all_members" as const, icon: UserCheck, label: "Todos os participantes", desc: "Qualquer membro pode compartilhar o convite com outras pessoas" },
              ].map((opt) => {
                const currentPerm = ((pool as any)?.invitePermission ?? "organizer_only") as "organizer_only" | "all_members";
                const isActive = currentPerm === opt.id;
                return (
                  <button
                    key={opt.id}
                    onClick={() => pool?.id && updateMutation.mutate({ poolId: pool.id, invitePermission: opt.id })}
                    disabled={updateMutation.isPending}
                    className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                      isActive ? "border-primary bg-primary/5" : "border-border/30 bg-card hover:border-primary/30"
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? "bg-primary/10" : "bg-muted/50"
                    }`}>
                      <opt.icon className={`w-5 h-5 ${isActive ? "text-primary" : "text-muted-foreground"}`} />
                    </div>
                    <div>
                      <p className={`font-semibold text-sm ${isActive ? "text-primary" : ""}`}>{opt.label}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                    </div>
                    {isActive && <Check className="w-4 h-4 text-primary ml-auto shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Link display */}
        {accessType === "private_link" && (
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Link de Convite</h3>
            <div className="bg-surface-3 border border-border/30 rounded-xl p-5 space-y-4">
              <div>
                <p
                  className="text-sm font-mono text-muted-foreground break-all leading-relaxed"
                  style={{ fontFamily: "'JetBrains Mono', monospace" }}
                >
                  {inviteLink || "Link não gerado"}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  className="flex-1"
                  variant="outline"
                  onClick={() => inviteLink && handleCopy(inviteLink, "link")}
                >
                  {copiedLink ? <Check className="w-4 h-4 mr-2 text-green-400" /> : <Copy className="w-4 h-4 mr-2" />}
                  {copiedLink ? "Copiado!" : "Copiar link"}
                </Button>
                {typeof navigator !== "undefined" && !!navigator.share && (
                  <Button
                    variant="outline"
                    className="gap-1.5"
                    onClick={async () => {
                      if (!inviteLink) return;
                      try {
                        await navigator.share({
                          title: pool?.name ?? "Bolão",
                          text: `Entre no bolão "${pool?.name}" e faça seus palpites!`,
                          url: inviteLink,
                        });
                      } catch {
                        // usuário cancelou ou erro — silencioso
                      }
                    }}
                  >
                    <Share2 className="w-4 h-4" /> Compartilhar
                  </Button>
                )}
                <Button
                  variant="outline"
                  className="border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10"
                  onClick={() => setRegenConfirm(true)}
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

        {/* Taxa de inscrição — Pro only */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Taxa de Inscrição</h3>
            {isPro && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Pro</span>
            )}
          </div>

          {!isPro ? (
            <div className="bg-card border border-border/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Cobrança de taxa de inscrição via PIX disponível no Plano Pro</p>
              </div>
              <Crown className="w-4 h-4 text-primary shrink-0" />
            </div>
          ) : !feeEditing ? (
            <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/10 flex items-center justify-center shrink-0">
                    <DollarSign className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    {currentFee && currentFee > 0 ? (
                      <>
                        <p className="font-bold text-lg text-yellow-400">R$ {currentFee.toFixed(2).replace(".", ",")}</p>
                        <p className="text-xs text-muted-foreground">Taxa de inscrição ativa</p>
                      </>
                    ) : (
                      <>
                        <p className="font-medium text-sm text-muted-foreground">Sem taxa de inscrição</p>
                        <p className="text-xs text-muted-foreground">Entrada gratuita para todos</p>
                      </>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEntryFeeInput(currentFee ? currentFee.toFixed(2).replace(".", ",") : "");
                    setQrPreviewUrl(currentQr ?? null);
                    setFeeEditing(true);
                  }}
                >
                  Configurar
                </Button>
              </div>
              {currentFee && currentFee > 0 && currentQr && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <QrCode className="w-3.5 h-3.5 text-green-400" />
                  <span>QR Code PIX configurado</span>
                </div>
              )}
              {currentFee && currentFee > 0 && !currentQr && (
                <div className="flex items-center gap-2 text-xs text-yellow-400">
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code PIX não configurado — participantes não poderão ver como pagar</span>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card border border-border/30 rounded-xl p-4 space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Valor da taxa (R$)</label>
                <Input
                  value={entryFeeInput}
                  onChange={(e) => setEntryFeeInput(e.target.value)}
                  placeholder="Ex: 20,00"
                  className="font-mono"
                />
                <p className="text-xs text-muted-foreground">Deixe em branco para desativar a taxa de inscrição.</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">QR Code PIX</label>
                {/* Preview do QR Code */}
                {qrPreviewUrl ? (
                  <div className="relative w-40 h-40 rounded-xl overflow-hidden border border-border/30 bg-white">
                    <img
                      src={qrPreviewUrl}
                      alt="QR Code PIX"
                      className="w-full h-full object-contain p-2"
                    />
                    <button
                      type="button"
                      onClick={() => setQrPreviewUrl(null)}
                      className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/60 flex items-center justify-center hover:bg-black/80 transition-colors"
                      title="Remover imagem"
                    >
                      <span className="text-white text-xs leading-none">&times;</span>
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={uploadingQr}
                    className="w-40 h-40 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground"
                  >
                    {uploadingQr ? (
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    ) : (
                      <>
                        <QrCode className="w-8 h-8" />
                        <span className="text-xs text-center px-2">Clique para enviar o QR Code</span>
                      </>
                    )}
                  </button>
                )}
                {/* Botão de troca quando já tem imagem */}
                {qrPreviewUrl && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => qrFileInputRef.current?.click()}
                    disabled={uploadingQr}
                  >
                    {uploadingQr ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <QrCode className="w-3.5 h-3.5" />}
                    Trocar imagem
                  </Button>
                )}
                <input
                  ref={qrFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleQrFileChange}
                />
                <p className="text-xs text-muted-foreground">
                  Gere o QR Code PIX no app do seu banco e faça o upload da imagem (PNG ou JPG, máx. 2MB).
                </p>
              </div>
              <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-3 flex items-start gap-2">
                <Info className="w-3.5 h-3.5 text-yellow-400 shrink-0 mt-0.5" />
                <div className="text-xs text-muted-foreground space-y-1">
                  <p>Após o pagamento, o participante clicará em "Já paguei" e aguardará sua aprovação na aba <strong>Aprovações Pendentes</strong> em Membros.</p>
                  <p>Solicitações não aprovadas em <strong>7 dias</strong> são canceladas automaticamente.</p>
                  <p>O reembolso em caso de recusa é de responsabilidade do organizador e deve ser tratado fora do app.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className="flex-1 gap-1.5"
                  onClick={handleSaveFee}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
                <Button variant="outline" onClick={() => setFeeEditing(false)}>Cancelar</Button>
              </div>
            </div>
          )}
        </div>

        {/* Ingress stats */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Estatísticas de Ingresso</h3>
          <div className="grid grid-cols-3 gap-3">
          {[
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

          {/* Série temporal 7 dias (Pro) */}
          {accessStats?.daily && accessStats.daily.length > 0 ? (
            <div className="bg-card border border-border/30 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">Ingressos — últimos 7 dias</span>
              </div>
              <div className="flex items-end gap-1 h-16">
                {accessStats.daily.map((d) => {
                  const maxCount = Math.max(...accessStats.daily!.map((x) => x.count), 1);
                  const heightPct = Math.max((d.count / maxCount) * 100, d.count > 0 ? 8 : 2);
                  const dayLabel = new Date(d.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" });
                  return (
                    <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-sm bg-primary/60 transition-all"
                        style={{ height: `${heightPct}%` }}
                        title={`${d.count} ingresso${d.count !== 1 ? "s" : ""} em ${d.date}`}
                      />
                      <span className="text-[10px] text-muted-foreground capitalize">{dayLabel.replace(".", "")}</span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Total no período: <strong>{accessStats.daily.reduce((s, d) => s + d.count, 0)} ingressos</strong>
              </p>
            </div>
          ) : !isPro ? (
            <div className="bg-card border border-border/30 rounded-xl p-4 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-muted-foreground" />
                <p className="text-xs text-muted-foreground">Gráfico de ingressos por dia disponível no Plano Pro</p>
              </div>
              <Crown className="w-4 h-4 text-primary shrink-0" />
            </div>
          ) : null}
        </div>
      </div>

      {/* Banner between_sections — apenas para usuários free */}
      {!isPro && <AdBanner position="between_sections" className="w-full mt-4" />}

      {/* Regen AlertDialog */}
      <AlertDialog open={regenConfirm} onOpenChange={(o) => !o && setRegenConfirm(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
              Regenerar link de convite?
            </AlertDialogTitle>
            <AlertDialogDescription>
              O link atual deixará de funcionar imediatamente.
              Participantes que ainda não ingressaram precisarão do novo link.
              Esta ação não afeta quem já está no bolão.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
              onClick={() => handleRegen()}
            >
              {regenMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Regenerar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </OrganizerLayout>
  );
}
