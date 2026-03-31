/**
 * Taxa de Inscrição — Página dedicada para configuração de cobrança via PIX
 * Exclusivo para organizadores com Plano Pro.
 * Suporta QR Code (upload) + Chave PIX (com reconhecimento automático do tipo)
 */
import OrganizerLayout from "@/components/OrganizerLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  QrCode,
  Crown,
  DollarSign,
  Info,
  Save,
  Loader2,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  Key,
  Copy,
  Check,
} from "lucide-react";
import { useParams } from "wouter";
import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useImageUpload } from "@/hooks/useImageUpload";

// ── Reconhecimento automático do tipo de chave PIX ──────────────────────────
type PixKeyType = "cpf" | "cnpj" | "email" | "phone" | "random" | null;

function detectPixKeyType(key: string): PixKeyType {
  if (!key || key.trim() === "") return null;
  const clean = key.replace(/\D/g, "");
  // CPF: 11 dígitos
  if (/^\d{11}$/.test(clean)) return "cpf";
  // CNPJ: 14 dígitos
  if (/^\d{14}$/.test(clean)) return "cnpj";
  // Telefone: +55 + 10 ou 11 dígitos
  if (/^(\+55)?\d{10,11}$/.test(key.replace(/[\s\-().]/g, ""))) return "phone";
  // E-mail
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(key)) return "email";
  // Chave aleatória: UUID-like (32 hex chars com hífens)
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(key)) return "random";
  return null;
}

const PIX_KEY_LABELS: Record<NonNullable<PixKeyType>, string> = {
  cpf: "CPF",
  cnpj: "CNPJ",
  email: "E-mail",
  phone: "Telefone",
  random: "Chave aleatória",
};

const PIX_KEY_COLORS: Record<NonNullable<PixKeyType>, string> = {
  cpf: "text-blue-400 bg-blue-500/10 border-blue-500/20",
  cnpj: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  email: "text-green-400 bg-green-500/10 border-green-500/20",
  phone: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
  random: "text-orange-400 bg-orange-500/10 border-orange-500/20",
};

export default function OrganizerEntryFee() {
  const { slug } = useParams<{ slug: string }>();
  const { isPro, isProExpired } = useUserPlan();

  const { data: poolData, refetch } = trpc.pools.getBySlug.useQuery(
    { slug: slug ?? "" },
    { enabled: !!slug }
  );
  const pool = poolData?.pool;

  const updateMutation = trpc.pools.update.useMutation({
    onError: (err) => toast.error(err.message || "Erro ao atualizar."),
  });

  // Estado do formulário
  const [entryFeeInput, setEntryFeeInput] = useState("");
  const [qrPreviewUrl, setQrPreviewUrl] = useState<string | null>(null);
  const [pixKeyInput, setPixKeyInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const qrFileInputRef = useRef<HTMLInputElement>(null);

  const currentFee = pool?.entryFee ? Number(pool.entryFee) : null;
  const currentQr = (pool as any)?.entryQrCodeUrl ?? null;
  const currentPixKey = (pool as any)?.pixKey ?? null;

  const detectedType = detectPixKeyType(pixKeyInput);

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
    setQrPreviewUrl(URL.createObjectURL(file));
    const uploadedUrl = await uploadQrCode(file);
    if (uploadedUrl) {
      setQrPreviewUrl(uploadedUrl);
    } else {
      setQrPreviewUrl(null);
    }
    if (qrFileInputRef.current) qrFileInputRef.current.value = "";
  };

  const handleSave = () => {
    if (!pool?.id) return;
    const fee = entryFeeInput ? parseFloat(entryFeeInput.replace(",", ".")) : null;
    if (fee !== null && (isNaN(fee) || fee < 0)) {
      toast.error("Valor inválido. Use um número positivo.");
      return;
    }
    updateMutation.mutate(
      {
        poolId: pool.id,
        entryFee: fee,
        entryQrCodeUrl: qrPreviewUrl || null,
        pixKey: pixKeyInput.trim() || null,
      },
      {
        onSuccess: () => {
          toast.success("Taxa de inscrição atualizada.");
          setEditing(false);
          refetch();
        },
      }
    );
  };

  const handleStartEdit = () => {
    setEntryFeeInput(currentFee ? currentFee.toFixed(2).replace(".", ",") : "");
    setQrPreviewUrl(currentQr ?? null);
    setPixKeyInput(currentPixKey ?? "");
    setEditing(true);
  };

  const handleDisable = () => {
    if (!pool?.id) return;
    updateMutation.mutate(
      { poolId: pool.id, entryFee: null, entryQrCodeUrl: null, pixKey: null },
      {
        onSuccess: () => {
          toast.success("Taxa de inscrição desativada.");
          refetch();
        },
      }
    );
  };

  const handleCopyPixKey = useCallback(() => {
    if (!currentPixKey) return;
    navigator.clipboard.writeText(currentPixKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [currentPixKey]);

  const currentPixKeyType = detectPixKeyType(currentPixKey ?? "");

  return (
    <OrganizerLayout
      slug={slug ?? ""}
      poolName={pool?.name ?? "Bolão"}
      poolStatus={(pool?.status as any) ?? "active"}
      isPro={isPro}
      isProExpired={isProExpired}
      activeSection="entry-fee"
    >
      <div className="p-6 space-y-6 max-w-2xl">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-bold text-xl" style={{ fontFamily: "'Syne', sans-serif" }}>
              Taxa de Inscrição
            </h1>
            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">Pro</span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Cobre uma taxa via PIX antes de aprovar a entrada de novos participantes.
          </p>
        </div>

        {/* Gate Pro */}
        {!isPro ? (
          <div className="bg-card border border-border/30 rounded-xl p-6 flex flex-col items-center gap-4 text-center">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
              <Crown className="w-7 h-7 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Recurso exclusivo do Plano Pro</p>
              <p className="text-sm text-muted-foreground mt-1">
                Ative a cobrança de taxa de inscrição via PIX e aprove manualmente cada participante.
              </p>
            </div>
            <Button asChild>
              <a href={`/pool/${slug}/manage/plan`}>Conhecer o Plano Pro</a>
            </Button>
          </div>
        ) : (
          <>
            {/* Status atual */}
            {!editing ? (
              <div className="bg-card border border-border/30 rounded-xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
                      <DollarSign className="w-5 h-5 text-yellow-400" />
                    </div>
                    <div>
                      {currentFee && currentFee > 0 ? (
                        <>
                          <p className="font-bold text-xl text-yellow-400">
                            R$ {currentFee.toFixed(2).replace(".", ",")}
                          </p>
                          <p className="text-xs text-muted-foreground">Taxa de inscrição ativa</p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold text-sm">Sem taxa de inscrição</p>
                          <p className="text-xs text-muted-foreground">Entrada gratuita para todos</p>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleStartEdit}>
                      {currentFee && currentFee > 0 ? "Editar" : "Configurar"}
                    </Button>
                    {currentFee && currentFee > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={handleDisable}
                        disabled={updateMutation.isPending}
                      >
                        Desativar
                      </Button>
                    )}
                  </div>
                </div>

                {/* Status do QR Code e Chave PIX */}
                {currentFee && currentFee > 0 && (
                  <div className="space-y-2 pt-1 border-t border-border/20">
                    {/* QR Code status */}
                    <div className="flex items-center gap-2 text-xs">
                      {currentQr ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          <span className="text-muted-foreground">QR Code PIX configurado</span>
                          <div className="ml-auto w-10 h-10 rounded-lg overflow-hidden border border-border/30 bg-white">
                            <img src={currentQr} alt="QR Code PIX" className="w-full h-full object-contain p-0.5" />
                          </div>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span className="text-yellow-400">QR Code PIX não configurado</span>
                        </>
                      )}
                    </div>

                    {/* Chave PIX status */}
                    <div className="flex items-center gap-2 text-xs">
                      {currentPixKey ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
                          <span className="text-muted-foreground">Chave PIX configurada</span>
                          {currentPixKeyType && (
                            <span className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${PIX_KEY_COLORS[currentPixKeyType]}`}>
                              {PIX_KEY_LABELS[currentPixKeyType]}
                            </span>
                          )}
                          <button
                            onClick={handleCopyPixKey}
                            className="ml-auto flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Copiar chave PIX"
                          >
                            {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copied ? "Copiado!" : "Copiar"}</span>
                          </button>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                          <span className="text-yellow-400">Chave PIX não configurada</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              /* Formulário de edição */
              <div className="bg-card border border-border/30 rounded-xl p-5 space-y-5">
                {/* Valor da taxa */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground">Valor da taxa (R$)</label>
                  <Input
                    value={entryFeeInput}
                    onChange={(e) => setEntryFeeInput(e.target.value)}
                    placeholder="Ex: 20,00"
                    className="font-mono max-w-xs"
                    autoFocus
                  />
                  <p className="text-xs text-muted-foreground">
                    Deixe em branco para desativar a taxa de inscrição.
                  </p>
                </div>

                {/* QR Code PIX */}
                <div className="space-y-3">
                  <label className="text-xs font-medium text-muted-foreground">QR Code PIX (opcional)</label>
                  <div className="flex items-start gap-4">
                    {qrPreviewUrl ? (
                      <div className="relative w-36 h-36 rounded-xl overflow-hidden border border-border/30 bg-white shrink-0">
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
                        className="w-36 h-36 rounded-xl border-2 border-dashed border-border/40 hover:border-primary/50 bg-muted/20 hover:bg-muted/40 transition-all flex flex-col items-center justify-center gap-2 text-muted-foreground shrink-0"
                      >
                        {uploadingQr ? (
                          <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        ) : (
                          <>
                            <QrCode className="w-8 h-8" />
                            <span className="text-xs text-center px-2">Clique para enviar</span>
                          </>
                        )}
                      </button>
                    )}
                    <div className="space-y-2 pt-1">
                      {qrPreviewUrl && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => qrFileInputRef.current?.click()}
                          disabled={uploadingQr}
                        >
                          {uploadingQr ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <QrCode className="w-3.5 h-3.5" />
                          )}
                          Trocar imagem
                        </Button>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Gere o QR Code PIX no app do seu banco e faça o upload (PNG ou JPG, máx. 2MB).
                      </p>
                    </div>
                  </div>
                  <input
                    ref={qrFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleQrFileChange}
                  />
                </div>

                {/* Chave PIX */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Chave PIX (opcional)
                  </label>
                  <div className="relative">
                    <Input
                      value={pixKeyInput}
                      onChange={(e) => setPixKeyInput(e.target.value)}
                      placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória"
                      className="pr-24"
                    />
                    {detectedType && (
                      <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-medium px-2 py-0.5 rounded border ${PIX_KEY_COLORS[detectedType]}`}>
                        {PIX_KEY_LABELS[detectedType]}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    O tipo da chave é detectado automaticamente. Útil para quem acessa pelo celular e quer copiar e colar no app do banco.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    className="gap-1.5"
                    onClick={handleSave}
                    disabled={updateMutation.isPending}
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Salvar
                  </Button>
                  <Button variant="outline" onClick={() => setEditing(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}

            {/* Como funciona */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Como funciona
              </h3>
              <div className="grid grid-cols-1 gap-3">
                {[
                  {
                    icon: QrCode,
                    title: "Participante vê o QR Code ou Chave PIX",
                    desc: "Ao entrar pelo link de convite, o participante vê o valor, o QR Code para escanear e/ou a chave PIX para copiar.",
                  },
                  {
                    icon: Users,
                    title: "Participante solicita entrada",
                    desc: 'Após pagar, o participante clica em "Já paguei" e aguarda sua aprovação.',
                  },
                  {
                    icon: Clock,
                    title: "Prazo de aprovação: 7 dias",
                    desc: "Você recebe uma notificação e tem 7 dias para aprovar ou recusar. Solicitações não respondidas são canceladas automaticamente.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="bg-card border border-border/30 rounded-xl p-4 flex items-start gap-3"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                      <item.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Nota sobre reembolso */}
            <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
              <Info className="w-4 h-4 text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                <strong className="text-foreground">Atenção:</strong> O Plakr! não processa pagamentos. Você é responsável por verificar o recebimento antes de aprovar cada participante.
              </p>
            </div>
          </>
        )}
      </div>
    </OrganizerLayout>
  );
}
