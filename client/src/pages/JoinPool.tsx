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
import {
  Trophy,
  Users,
  User,
  CheckCircle2,
  Loader2,
  XCircle,
  Crown,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

export default function JoinPool() {
  const { token } = useParams<{ token: string }>();
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();
  const [joined, setJoined] = useState(false);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [targetSlug, setTargetSlug] = useState("");

  // Fetch pool preview by token
  const { data: preview, isLoading: loadingPreview, error: previewError } =
    trpc.pools.previewByToken.useQuery(
      { token: token ?? "" },
      { enabled: !!token && isAuthenticated, retry: false }
    );

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
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-sm bg-card border border-border/50 rounded-xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Você foi convidado para um bolão.</p>
            <h1 className="font-bold text-xl">Entre para confirmar seu ingresso</h1>
          </div>
          <a href={getLoginUrl(window.location.pathname)}>
            <Button className="w-full" size="lg">Entrar com Manus</Button>
          </a>
        </div>
      </div>
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
          <div className="w-14 h-14 rounded-xl bg-destructive/10 flex items-center justify-center mx-auto">
            <XCircle className="w-7 h-7 text-destructive" />
          </div>
          <div>
            <h1 className="font-bold text-xl mb-1">Link inválido</h1>
            <p className="text-sm text-muted-foreground">Este link de convite é inválido ou expirou.</p>
          </div>
          <Link href="/dashboard">
            <Button variant="outline" className="w-full">Ir para o painel</Button>
          </Link>
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
              {preview.plan === "pro" && (
                <span className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary px-2.5 py-0.5 rounded-full mt-1.5">
                  <Crown className="w-3 h-3" /> Plano Pro
                </span>
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
        </div>

        <p className="text-center text-xs text-muted-foreground">
          Ao entrar, você concorda com os{" "}
          <Link href="/" className="hover:underline">Termos de Uso</Link>
        </p>
      </div>
    </div>
  );
}
