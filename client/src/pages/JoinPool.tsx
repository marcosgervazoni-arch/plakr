/**
 * P4 — Aceitar Convite (via link)
 * Especificação: tela intermediária com dados completos do bolão antes de confirmar ingresso.
 * Logo 64px circular com borda brand, nome Syne 24px, campeonato/participantes/organizador.
 * Botão "Entrar" largo na cor brand. Animação sutil ao confirmar.
 * Se já membro: mensagem + botão "Ir para o bolão".
 */
import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { useSafariDetect } from "@/hooks/useSafariDetect";
import EmailLoginModal from "@/components/EmailLoginModal";
import GoogleLoginButton from "@/components/GoogleLoginButton";
import AppleLoginButton from "@/components/AppleLoginButton";
import {
  Trophy,
  Users,
  User,
  CheckCircle2,
  Loader2,
  XCircle,
  Clock,
  QrCode,
  AlertCircle,
  Info,
  Copy,
  Check,
  Key,
  Mail,
} from "lucide-react";
import { useState, useCallback } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function JoinPool() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [joined, setJoined] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [targetSlug, setTargetSlug] = useState("");
  const [copiedPixKey, setCopiedPixKey] = useState(false);
  const [emailLoginOpen, setEmailLoginOpen] = useState(false);
  const isSafari = useSafariDetect();

  const handleCopyPixKey = useCallback((key: string) => {
    navigator.clipboard.writeText(key).then(() => {
      setCopiedPixKey(true);
      setTimeout(() => setCopiedPixKey(false), 2000);
    });
  }, []);

  // Fetch pool preview by token
  const { data: preview, isLoading: loadingPreview, error: previewError } =
    trpc.pools.previewByToken.useQuery(
      { token: token ?? "" },
      { enabled: !!token && isAuthenticated, retry: false }
    );

  // Mutation para bolão com taxa (solicitar aprovação)
  const requestEntryMutation = trpc.pools.requestEntry.useMutation({
    onSuccess: (data: { poolId: number; slug: string; alreadyMember: boolean; status?: string }) => {
      if (data.alreadyMember) {
        setAlreadyMember(true);
        setTargetSlug(data.slug);
      } else {
        setPendingApproval(true);
        setTargetSlug(data.slug);
      }
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao solicitar entrada no bolão.");
    },
  });

  const joinMutation = trpc.pools.joinByToken.useMutation({
    onSuccess: (data: { poolId: number; slug: string; alreadyMember: boolean }) => {
      if (data.alreadyMember) {
        setAlreadyMember(true);
        setTargetSlug(data.slug);
      } else {
        setJoined(true);
        setTargetSlug(data.slug);
        setTimeout(() => navigate(`/pool/${data.slug}`), 1800);
      }
    },
    onError: (err: { message?: string }) => {
      toast.error(err.message || "Erro ao entrar no bolão.");
    },
  });

  // Loading auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not authenticated
  if (!isAuthenticated) {
    const returnPath = window.location.pathname;
    const loginUrl = getLoginUrl(returnPath);
    return (
      <>
        <EmailLoginModal
          open={emailLoginOpen}
          onClose={() => setEmailLoginOpen(false)}
          returnPath={returnPath}
        />
        <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "#0B0F1A" }}>
          <div className="w-full max-w-sm rounded-xl p-8 text-center space-y-5" style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-14 h-14 rounded-xl flex items-center justify-center mx-auto" style={{ background: "rgba(255,184,0,0.12)", border: "1px solid rgba(255,184,0,0.3)" }}>
              <Trophy className="w-7 h-7" style={{ color: "#FFB800" }} />
            </div>
            <div>
              <p className="text-sm mb-1" style={{ color: "#9CA3AF" }}>Você foi convidado para um bolão.</p>
              <h1 className="font-bold text-xl text-white">Entre para confirmar seu ingresso</h1>
            </div>

            {/* E-mail como método principal para todos os navegadores */}
            <div className="space-y-3">
              <button
                onClick={() => setEmailLoginOpen(true)}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-lg transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
              >
                <Mail size={16} />
                Entrar com e-mail
              </button>

              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs" style={{ color: "#6B7280" }}>ou</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              <div className="space-y-2">
                {/* Botão Google OAuth — condicional via authConfig */}
                <GoogleLoginButton returnPath={returnPath} />

                {/* Botão Apple Sign In — condicional via authConfig */}
                <AppleLoginButton returnPath={returnPath} />

                {/* Manus OAuth — oculto no Safari */}
                {!isSafari && (
                  <a
                    href={loginUrl}
                    className="w-full flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-lg transition-all"
                    style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF", display: "flex" }}
                  >
                    Entrar com conta Manus
                  </a>
                )}
              </div>
            </div>

            <p className="text-xs" style={{ color: "#4B5563" }}>Sem senha · Acesso seguro · Funciona em qualquer dispositivo</p>
          </div>
        </div>
      </>
    );
  }

  // Loading preview
  if (loadingPreview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
          <p className="text-sm text-muted-foreground">Carregando informações do bolão...</p>
        </div>
      </div>
    );
  }

  // Invalid token
  if (previewError || !preview) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-red-500/10 flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7 text-red-400" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">Link inválido ou expirado</h1>
            <p className="text-sm text-muted-foreground">Este link de convite não é mais válido. Peça um novo link ao organizador.</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
            Ir para o início
          </Button>
        </div>
      </div>
    );
  }

  // Pending approval state
  if (pendingApproval) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border-2 border-yellow-500/30 flex items-center justify-center mx-auto">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">Aguardando aprovação</h1>
            <p className="text-sm text-muted-foreground">
              Sua solicitação foi enviada ao organizador de <strong>{preview.name}</strong>.
              Você receberá uma notificação assim que for aprovado.
            </p>
          </div>
          <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground text-left space-y-1.5">
            <p className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
              Solicitações não aprovadas em 7 dias são canceladas automaticamente.
            </p>
            <p className="flex items-start gap-1.5">
              <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-yellow-400" />
              Em caso de não aprovação, entre em contato com o organizador sobre o reembolso.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/dashboard")} className="w-full">
            Ir para o início
          </Button>
        </div>
      </div>
    );
  }

  // Already member state
  if (alreadyMember) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7 text-green-400" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">Você já faz parte deste bolão</h1>
            <p className="text-sm text-muted-foreground">{preview.name}</p>
          </div>
          <Button onClick={() => navigate(`/pool/${targetSlug}`)} className="w-full" size="lg">
            Ir para o bolão →
          </Button>
        </div>
      </div>
    );
  }

  // Success / joined state
  if (joined) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
          <div className="w-16 h-16 rounded-full bg-green-500/10 border-2 border-green-500/30 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">Você entrou no bolão!</h1>
            <p className="text-sm text-muted-foreground">Redirecionando para {preview.name}...</p>
          </div>
          <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
        </div>
      </div>
    );
  }

  const hasFee = !!preview.entryFee && preview.entryFee > 0;

  // Main confirmation screen
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm space-y-4">

        <div className="bg-card border border-border/50 rounded-xl overflow-hidden">

          {/* Pool identity header */}
          <div className="p-6 text-center border-b border-border/30 space-y-3">
            {/* Logo 64px circular com borda brand */}
            <div className="w-16 h-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto overflow-hidden">
              {preview.logoUrl ? (
                <img src={preview.logoUrl} alt={preview.name} className="w-full h-full object-cover" />
              ) : (
                <Trophy className="w-8 h-8 text-primary" />
              )}
            </div>

            {/* Nome em Syne 24px */}
            <div>
              <h1 className="font-display font-bold text-2xl leading-tight">
                {preview.name}
              </h1>
              {preview.tournament && (
                <p className="text-sm text-muted-foreground mt-0.5">{preview.tournament.name}</p>
              )}

            </div>
          </div>

          {/* Pool stats */}
          <div className="grid grid-cols-2 divide-x divide-border/30 border-b border-border/30">
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <Users className="w-3.5 h-3.5" />
                <span className="text-xs">Participantes</span>
              </div>
              <p className="font-mono font-bold text-lg text-foreground">{preview.memberCount}</p>
            </div>
            <div className="p-4 text-center">
              <div className="flex items-center justify-center gap-1.5 text-muted-foreground mb-1">
                <User className="w-3.5 h-3.5" />
                <span className="text-xs">Organizador</span>
              </div>
              <p className="font-bold text-sm text-foreground truncate">{preview.ownerName ?? "—"}</p>
            </div>
          </div>

          {/* Entry fee section */}
          {hasFee ? (
            <>
              {/* Alerta de taxa — destaque visual */}
              <div className="px-6 py-4 bg-yellow-500/10 border-b border-yellow-500/30">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="text-base">⚠️</span>
                  </div>
                  <div>
                    <p className="font-bold text-yellow-400 text-sm">Este bolão possui taxa de inscrição!</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Para participar, é necessário realizar o pagamento de{" "}
                      <strong className="text-yellow-400">
                        R$ {Number(preview.entryFee).toFixed(2).replace(".", ",")}
                      </strong>{" "}
                      antes de ser aprovado pelo organizador.
                    </p>
                  </div>
                </div>
              </div>

              {/* QR Code */}
              {preview.entryQrCodeUrl && (
                <div className="p-6 border-b border-border/30 space-y-3">
                  <p className="text-sm text-center text-muted-foreground">
                    Escaneie o QR Code PIX para pagar a taxa de inscrição:
                  </p>
                  <div className="flex justify-center">
                    <div className="bg-white p-3 rounded-xl shadow-sm">
                      <img
                        src={preview.entryQrCodeUrl}
                        alt="QR Code PIX"
                        className="w-48 h-48 object-contain"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Chave PIX com botão de copiar */}
              {(preview as any).pixKey && (
                <div className="px-6 py-4 border-b border-border/30 space-y-2">
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <Key className="w-3.5 h-3.5" />
                    Ou pague via chave PIX:
                  </p>
                  <div className="flex items-center gap-2 bg-muted/30 rounded-lg px-3 py-2.5">
                    <span className="font-mono text-sm text-foreground flex-1 truncate">
                      {(preview as any).pixKey}
                    </span>
                    <button
                      onClick={() => handleCopyPixKey((preview as any).pixKey)}
                      className="flex items-center gap-1.5 text-xs font-medium shrink-0 px-2.5 py-1.5 rounded-md bg-primary/10 hover:bg-primary/20 text-primary transition-colors"
                    >
                      {copiedPixKey ? (
                        <><Check className="w-3.5 h-3.5" /> Copiado!</>
                      ) : (
                        <><Copy className="w-3.5 h-3.5" /> Copiar</>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Aviso se não tem QR nem chave */}
              {!preview.entryQrCodeUrl && !(preview as any).pixKey && (
                <div className="p-6 border-b border-border/30">
                  <div className="flex items-center gap-3 bg-muted/30 rounded-lg p-3">
                    <QrCode className="w-8 h-8 text-muted-foreground/50 shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      O organizador ainda não configurou os dados de pagamento PIX. Entre em contato para obter as informações.
                    </p>
                  </div>
                </div>
              )}

              {/* Instruções em 3 passos */}
              <div className="px-6 py-4 border-b border-border/30 space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Como participar:</p>
                <ol className="space-y-2.5">
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">1</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Faça o pagamento usando o <strong className="text-foreground">QR Code ou a chave PIX</strong> acima.
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">2</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Volte aqui e clique em <strong className="text-yellow-400">“Confirmo a realização do pagamento!”</strong>.
                    </p>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-yellow-500/20 text-yellow-400 text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">3</span>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Aguarde a confirmação do organizador — você receberá um aviso assim que for aprovado.
                    </p>
                  </li>
                </ol>
                <p className="text-xs text-muted-foreground/70 pt-1">
                  ⚠️ Solicitações não confirmadas em 7 dias são canceladas automaticamente.
                </p>
              </div>

              {/* Actions */}
              <div className="p-6 space-y-3">
                <Button
                  onClick={() => requestEntryMutation.mutate({ token: token ?? "" })}
                  disabled={requestEntryMutation.isPending}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-semibold"
                  size="lg"
                >
                  {requestEntryMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando solicitação...</>
                  ) : (
                    <>✅ Confirmo a realização do pagamento!</>
                  )}
                </Button>
                <Link href="/dashboard" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Recusar convite
                </Link>
              </div>
            </>
          ) : (
            <>
              {/* Invite context */}
              <div className="px-6 py-3 bg-primary/5 border-b border-border/30">
                <p className="text-sm text-center text-muted-foreground">
                  Você foi convidado para participar deste bolão.
                </p>
              </div>
              {/* Actions */}
              <div className="p-6 space-y-3">
                <Button
                  onClick={() => joinMutation.mutate({ token: token ?? "" })}
                  disabled={joinMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {joinMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Entrando...</>
                  ) : (
                    "Entrar no bolão"
                  )}
                </Button>
                <Link href="/dashboard" className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors">
                  Recusar convite
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os{" "}
          <Link href="/" className="hover:underline">Termos de Uso</Link>
        </p>
      </div>
    </div>
  );
}
