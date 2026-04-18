/**
 * Página de aceite de convite externo — /pool-invite/:token
 * Fluxo:
 *  1. Carrega informações do convite (nome do bolão, organizador, taxa)
 *  2. Se não logado: exibe boas-vindas + botão de login via magic link
 *  3. Se logado: chama acceptPoolInvite automaticamente
 *  4. Se bolão tem taxa: exibe tela de pagamento pendente com PIX
 */
import { useParams, useLocation } from "wouter";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";
import { Loader2, Trophy, Users, Mail, CheckCircle2, AlertTriangle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function PoolInviteAccept() {
  const { token } = useParams<{ token: string }>();
  const [, navigate] = useLocation();
  const { user, loading: authLoading } = useAuth();
  const [accepted, setAccepted] = useState(false);
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
        toast.success("Você entrou no bolão! Boas apostas!");
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

  // Aceitar automaticamente após login
  useEffect(() => {
    if (!authLoading && user && inviteInfo?.status === "valid" && !accepted && !acceptMutation.isPending) {
      acceptMutation.mutate({ token: token! });
    }
  }, [authLoading, user, inviteInfo?.status, accepted]);

  // ── Estados de carregamento ────────────────────────────────────────────────
  if (inviteLoading || authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // ── Convite inválido / expirado / já usado ─────────────────────────────────
  if (inviteError || !inviteInfo) {
    return <InviteErrorState message="Convite não encontrado ou inválido." />;
  }
  if (inviteInfo.status === "expired") {
    return <InviteErrorState message="Este convite expirou. Peça ao organizador que envie um novo convite." />;
  }
  if (inviteInfo.status === "used") {
    return <InviteErrorState message="Este convite já foi utilizado." />;
  }

  // ── Tela de pagamento pendente (pós-aceite com taxa) ──────────────────────
  if (acceptResult?.hasEntryFee) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-full bg-yellow-500/15 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-yellow-400" />
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Syne', sans-serif" }}>
              Pagamento pendente
            </h1>
            <p className="text-muted-foreground text-sm">
              Você foi adicionado ao bolão, mas precisa pagar a taxa de inscrição para ter acesso.
            </p>
          </div>

          {/* Card de pagamento */}
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Taxa de inscrição</span>
              <span className="text-xl font-bold text-primary">
                R$ {acceptResult.entryFee?.toFixed(2).replace(".", ",")}
              </span>
            </div>

            {acceptResult.pixKey && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Chave PIX do organizador</p>
                <div className="flex items-center gap-2 bg-muted/40 rounded-lg px-3 py-2">
                  <code className="text-sm flex-1 break-all">{acceptResult.pixKey}</code>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(acceptResult.pixKey!);
                      toast.success("Chave PIX copiada!");
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            )}

            {acceptResult.entryQrCodeUrl && (
              <div className="space-y-2">
                <p className="text-sm font-medium">QR Code PIX</p>
                <img
                  src={acceptResult.entryQrCodeUrl}
                  alt="QR Code PIX"
                  className="w-40 h-40 mx-auto rounded-lg border border-border"
                />
              </div>
            )}

            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3 text-sm text-blue-300">
              Após realizar o pagamento, aguarde a confirmação do organizador. Você receberá uma notificação quando seu acesso for liberado.
            </div>
          </div>

          <Button
            className="w-full"
            variant="outline"
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          {acceptMutation.isPending ? (
            <>
              <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground">Entrando no bolão...</p>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-10 h-10 text-green-400 mx-auto" />
              <p className="font-medium">Tudo certo!</p>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Tela de boas-vindas (usuário não logado) ───────────────────────────────
  const info = inviteInfo;
  const loginUrl = getLoginUrl(`/pool-invite/${token}`);
  const magicLinkUrl = `/?login=email&return=/pool-invite/${token}`;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo/ícone do bolão */}
        <div className="text-center space-y-3">
          {info.pool.logoUrl ? (
            <img
              src={info.pool.logoUrl}
              alt={info.pool.name}
              className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-primary/30"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-primary/15 flex items-center justify-center mx-auto">
              <Trophy className="w-10 h-10 text-primary" />
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Você foi convidado para o bolão</p>
            <h1 className="text-2xl font-bold mt-1" style={{ fontFamily: "'Syne', sans-serif" }}>
              {info.pool.name}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Organizado por <span className="text-foreground font-medium">{info.organizer.name}</span>
            </p>
          </div>
        </div>

        {/* Detalhes do bolão */}
        <div className="bg-card border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-3 text-sm">
            <Trophy className="w-4 h-4 text-primary shrink-0" />
            <span className="text-muted-foreground">Campeonato</span>
            <span className="ml-auto font-medium">Copa do Mundo 2026</span>
          </div>
          {info.hasEntryFee && info.entryFee && (
            <div className="flex items-center gap-3 text-sm">
              <AlertTriangle className="w-4 h-4 text-yellow-400 shrink-0" />
              <span className="text-muted-foreground">Taxa de inscrição</span>
              <span className="ml-auto font-bold text-yellow-400">
                R$ {info.entryFee.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
          <div className="flex items-center gap-3 text-sm">
            <Mail className="w-4 h-4 text-muted-foreground shrink-0" />
            <span className="text-muted-foreground">Convite enviado para</span>
            <span className="ml-auto font-medium text-xs">{info.invitedEmail}</span>
          </div>
        </div>

        {/* CTAs */}
        <div className="space-y-3">
          <p className="text-center text-sm text-muted-foreground">
            Para entrar no bolão, faça login ou crie sua conta:
          </p>
          <Button
            className="w-full gap-2"
            onClick={() => navigate(magicLinkUrl)}
          >
            <Mail className="w-4 h-4" />
            Entrar com e-mail
          </Button>
          <Button
            variant="outline"
            className="w-full gap-2"
            onClick={() => { window.location.href = loginUrl; }}
          >
            <Users className="w-4 h-4" />
            Entrar com conta Manus
          </Button>
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Ao entrar, você aceita os termos de uso do Plakr!
        </p>
      </div>
    </div>
  );
}

function InviteErrorState({ message }: { message: string }) {
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-sm w-full text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
          <AlertTriangle className="w-8 h-8 text-red-400" />
        </div>
        <h1 className="text-xl font-bold">Convite inválido</h1>
        <p className="text-muted-foreground text-sm">{message}</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Voltar ao início
        </Button>
      </div>
    </div>
  );
}
