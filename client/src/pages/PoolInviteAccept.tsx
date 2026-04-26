/**
 * Página de aceite de convite externo — /pool-invite/:token
 * Fluxo:
 *  1. Carrega informações do convite (nome do bolão, organizador, taxa)
 *  2. Se não logado: exibe boas-vindas + opções de acesso claras para usuário novo
 *  3. Se logado: chama acceptPoolInvite automaticamente
 *  4. Se bolão tem taxa: exibe tela de pagamento pendente com PIX
 */
import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useSafariDetect } from "@/hooks/useSafariDetect";
import EmailLoginModal from "@/components/EmailLoginModal";
import { Button } from "@/components/ui/button";
import {
  Loader2, Trophy, Mail, CheckCircle2, AlertTriangle, Copy,
  ExternalLink, Smartphone, ArrowRight, Shield, Zap,
} from "lucide-react";
import { toast } from "sonner";

export default function PoolInviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [accepted, setAccepted] = useState(false);
  const [emailLoginOpen, setEmailLoginOpen] = useState(false);
  const isSafari = useSafariDetect();
  const [acceptResult, setAcceptResult] = useState<{
    poolSlug: string;
    hasEntryFee: boolean;
    entryFee?: number;
    pixKey?: string | null;
    entryQrCodeUrl?: string | null;
  } | null>(null);

  // Buscar informações do convite
  const { data: inviteInfo, isLoading: inviteLoading, error: inviteError } = trpc.pools.getPoolInviteInfo.useQuery(
    { token: token ?? "" },
    { enabled: !!token, retry: false }
  );

  // Mutation de aceite
  const acceptMutation = trpc.pools.acceptPoolInvite.useMutation({
    onSuccess: (data: any) => {
      setAccepted(true);
      if (data.alreadyMember) {
        toast.success("Você já é membro deste bolão!");
        navigate(`/pool/${data.poolSlug}`);
        return;
      }
      if (!data.hasEntryFee) {
        toast.success("Você entrou no bolão! Boas apostas! 🎯");
        navigate(`/pool/${data.poolSlug}`);
        return;
      }
      setAcceptResult({
        poolSlug: data.poolSlug,
        hasEntryFee: data.hasEntryFee,
        entryFee: data.entryFee,
        pixKey: data.pixKey,
        entryQrCodeUrl: data.entryQrCodeUrl,
      });
    },
    onError: (err: any) => {
      toast.error(err.message || "Erro ao aceitar o convite.");
    },
  });

  // Se já é membro aprovado, redirecionar diretamente para o bolão sem mostrar a tela de inscrição
  useEffect(() => {
    if (!authLoading && user && inviteInfo?.status === "valid" && inviteInfo.isMember && inviteInfo.pool?.slug) {
      navigate(`/pool/${inviteInfo.pool.slug}`);
    }
  }, [authLoading, user, inviteInfo?.status, (inviteInfo as any)?.isMember]);

  // Aceitar automaticamente após login (apenas para quem ainda não é membro)
  useEffect(() => {
    if (!authLoading && user && inviteInfo?.status === "valid" && !(inviteInfo as any).isMember && !accepted && !acceptMutation.isPending) {
      acceptMutation.mutate({ token: token! });
    }
  }, [authLoading, user, inviteInfo?.status, (inviteInfo as any)?.isMember, accepted]);

  // ── Estados de carregamento ────────────────────────────────────────────────
  if (inviteLoading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0F1A" }}>
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" style={{ color: "#FFB800" }} />
          <p className="text-sm" style={{ color: "#6B7280" }}>Carregando convite...</p>
        </div>
      </div>
    );
  }

  // ── Convite inválido / expirado / já usado ─────────────────────────────────
  if (inviteError || !inviteInfo) {
    return <InviteErrorState message="Convite não encontrado ou inválido." hint="Verifique se o link está correto ou peça ao organizador que envie um novo convite." />;
  }
  if (inviteInfo.status === "expired") {
    return <InviteErrorState message="Este convite expirou." hint="Peça ao organizador que envie um novo link de convite para você." />;
  }
  if (inviteInfo.status === "used") {
    return <InviteErrorState message="Este convite já foi utilizado." hint="Se você já tem conta, acesse o bolão diretamente pelo app." />;
  }

  // ── Tela de pagamento pendente (pós-aceite com taxa) ──────────────────────
  if (acceptResult?.hasEntryFee) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0B0F1A" }}>
        <div className="max-w-md w-full space-y-5">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)" }}>
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'Syne', sans-serif" }}>
              Pagamento pendente
            </h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              Você foi adicionado ao bolão! Agora só falta pagar a taxa de inscrição.
            </p>
          </div>

          {/* Card de pagamento */}
          <div className="rounded-2xl p-5 space-y-4" style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "#9CA3AF" }}>Taxa de inscrição</span>
              <span className="text-2xl font-black" style={{ color: "#FFB800" }}>
                R$ {acceptResult.entryFee?.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {acceptResult.pixKey && (
              <div className="space-y-2">
                <p className="text-sm font-semibold text-white">Chave PIX do organizador</p>
                <div className="flex items-center gap-2 rounded-xl px-3 py-2.5" style={{ background: "#0D1120", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <code className="text-sm flex-1 break-all text-white">{acceptResult.pixKey}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0 hover:bg-white/10"
                    onClick={() => {
                      navigator.clipboard.writeText(acceptResult.pixKey!);
                      toast.success("Chave PIX copiada!");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5 text-white" />
                  </Button>
                </div>
              </div>
            )}

            {acceptResult.entryQrCodeUrl && (
              <div className="space-y-2 text-center">
                <p className="text-sm font-semibold text-white">QR Code PIX</p>
                <img
                  src={acceptResult.entryQrCodeUrl}
                  alt="QR Code PIX"
                  className="w-44 h-44 mx-auto rounded-xl"
                  style={{ border: "1px solid rgba(255,255,255,0.08)" }}
                />
              </div>
            )}

            <div className="rounded-xl p-3 text-sm" style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)", color: "#93C5FD" }}>
              💬 Após o pagamento, aguarde a confirmação do organizador. Você receberá uma notificação quando seu acesso for liberado.
            </div>
          </div>

          <Button
            className="w-full font-bold"
            variant="outline"
            style={{ borderColor: "rgba(255,255,255,0.12)", color: "#9CA3AF" }}
            onClick={() => navigate(`/pool/${acceptResult.poolSlug}`)}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Ir para o bolão
          </Button>
        </div>
      </div>
    );
  }

  // ── Processando aceite (usuário logado) ────────────────────────────────────
  if (user && (acceptMutation.isPending || accepted)) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0B0F1A" }}>
        <div className="text-center space-y-4">
          {acceptMutation.isPending ? (
            <>
              <Loader2 className="w-10 h-10 animate-spin mx-auto" style={{ color: "#FFB800" }} />
              <p className="font-semibold text-white">Entrando no bolão...</p>
              <p className="text-sm" style={{ color: "#6B7280" }}>Só um momento!</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto" style={{ color: "#22c55e" }} />
              <p className="font-bold text-white text-lg">Tudo certo! 🎯</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Tela de boas-vindas (usuário não logado) ───────────────────────────────
  const info = inviteInfo;
  const returnPath = `/pool-invite/${token}`;
  const loginUrl = getLoginUrl(returnPath);

  return (
    <>
      <EmailLoginModal
        open={emailLoginOpen}
        onClose={() => setEmailLoginOpen(false)}
        returnPath={returnPath}
        initialStep="email"
      />
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0B0F1A" }}>
        <div className="w-full max-w-sm space-y-5">

          {/* Logo + nome do bolão */}
          <div className="text-center space-y-3">
            {info.pool.logoUrl ? (
              <img
                src={info.pool.logoUrl}
                alt={info.pool.name}
                className="w-20 h-20 rounded-2xl object-cover mx-auto"
                style={{ border: "2px solid rgba(255,184,0,0.4)" }}
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(255,184,0,0.12)", border: "1px solid rgba(255,184,0,0.3)" }}>
                <Trophy className="w-10 h-10" style={{ color: "#FFB800" }} />
              </div>
            )}
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest mb-1" style={{ color: "#FFB800" }}>
                Convite para o bolão
              </p>
              <h1 className="text-2xl font-black text-white leading-tight" style={{ fontFamily: "'Syne', sans-serif" }}>
                {info.pool.name}
              </h1>
              <p className="text-sm mt-1" style={{ color: "#9CA3AF" }}>
                Organizado por <span className="text-white font-semibold">{info.organizer.name}</span>
              </p>
            </div>
          </div>

          {/* Detalhes do bolão */}
          <div className="rounded-2xl p-4 space-y-2.5" style={{ background: "#121826", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="flex items-center gap-3 text-sm">
              <Trophy className="w-4 h-4 shrink-0" style={{ color: "#FFB800" }} />
              <span style={{ color: "#9CA3AF" }}>Campeonato</span>
              <span className="ml-auto font-semibold text-white text-right">Copa do Mundo 2026</span>
            </div>
            {info.hasEntryFee && info.entryFee && (
              <div className="flex items-center gap-3 text-sm">
                <AlertTriangle className="w-4 h-4 shrink-0 text-yellow-400" />
                <span style={{ color: "#9CA3AF" }}>Taxa de inscrição</span>
                <span className="ml-auto font-bold text-yellow-400">
                  R$ {info.entryFee.toFixed(2).replace(".", ",")}
                </span>
              </div>
            )}
          </div>

          {/* Seção de acesso — foco total no e-mail para usuário novo */}
          <div className="space-y-3">
            <div className="text-center">
              <p className="text-base font-bold text-white">Como você quer entrar?</p>
              <p className="text-xs mt-0.5" style={{ color: "#6B7280" }}>
                Não precisa criar conta — é rápido e sem senha
              </p>
            </div>

            {/* Botão principal: E-mail (sempre em destaque) */}
            <button
              onClick={() => setEmailLoginOpen(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl transition-all hover:opacity-90 active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(0,0,0,0.15)" }}>
                <Mail size={18} />
              </div>
              <div className="flex-1 text-left">
                <p className="font-black text-sm">Entrar com e-mail</p>
                <p className="text-xs font-medium opacity-70">Receba um link de acesso na sua caixa de entrada</p>
              </div>
              <ArrowRight size={16} className="shrink-0 opacity-70" />
            </button>

            {/* Botão secundário: Google (só para não-Safari) */}
            {!isSafari && (
              <>
                <div className="flex items-center gap-3">
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                  <span className="text-xs" style={{ color: "#4B5563" }}>ou</span>
                  <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
                </div>
                <button
                  onClick={() => { window.location.href = loginUrl; }}
                  className="w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all hover:border-white/20 active:scale-[0.98]"
                  style={{ background: "transparent", border: "1px solid rgba(255,255,255,0.1)", color: "#9CA3AF" }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "rgba(255,255,255,0.05)" }}>
                    <Smartphone size={16} />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm text-white">Entrar com Google</p>
                    <p className="text-xs opacity-60">Use sua conta Google existente</p>
                  </div>
                  <ArrowRight size={14} className="shrink-0 opacity-40" />
                </button>
              </>
            )}

            {/* Aviso Safari */}
            {isSafari && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs" style={{ background: "rgba(0,194,255,0.06)", border: "1px solid rgba(0,194,255,0.15)", color: "#67E8F9" }}>
                <Smartphone size={12} className="shrink-0" />
                <span>No iPhone/Safari, o acesso por e-mail é o método recomendado.</span>
              </div>
            )}
          </div>

          {/* Garantias de segurança */}
          <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "#4B5563" }}>
            <span className="flex items-center gap-1">
              <Shield size={11} />
              Sem senha
            </span>
            <span className="flex items-center gap-1">
              <Zap size={11} />
              Acesso em segundos
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle2 size={11} />
              100% seguro
            </span>
          </div>

          <p className="text-center text-xs" style={{ color: "#374151" }}>
            Ao entrar, você aceita os{" "}
            <span className="underline cursor-pointer hover:text-gray-400 transition-colors">termos de uso</span>{" "}
            do Plakr!
          </p>
        </div>
      </div>
    </>
  );
}

function InviteErrorState({ message, hint }: { message: string; hint?: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: "#0B0F1A" }}>
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)" }}>
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{message}</h1>
          {hint && <p className="text-sm mt-2" style={{ color: "#9CA3AF" }}>{hint}</p>}
        </div>
        <Button
          variant="outline"
          style={{ borderColor: "rgba(255,255,255,0.12)", color: "#9CA3AF" }}
          onClick={() => navigate("/")}
        >
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
