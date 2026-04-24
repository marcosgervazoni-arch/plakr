/**
 * Plakr! — Página de Confirmação do Magic Link
 * Exibida após o usuário solicitar o link de acesso por e-mail.
 * Orienta o usuário passo a passo e oferece link direto para o provedor de e-mail.
 */
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle, Clock, Inbox, Smartphone, KeyRound } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function MagicLinkSent() {
  const [, navigate] = useLocation();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);
  const [resentCount, setResentCount] = useState(0);

  // Recupera o e-mail e returnPath da query string
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") ?? "";
  const returnPath = params.get("returnPath") ?? "/dashboard";

  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();

  // Detecta provedor de e-mail para link direto
  const emailProvider = getEmailProvider(email);

  async function handleResend() {
    if (!email || resending) return;
    setResending(true);
    try {
      const result = await sendMagicLink.mutateAsync({
        email,
        returnPath,
        origin: window.location.origin,
      });
      if (result && !result.sent) {
        toast.error("Não foi possível reenviar", {
          description: "Tente novamente em alguns instantes.",
        });
      } else {
        setResent(true);
        setResentCount((c) => c + 1);
        toast.success("E-mail reenviado!", {
          description: "Verifique sua caixa de entrada e também a pasta de spam.",
        });
        // Permite reenviar novamente após 30s
        setTimeout(() => setResent(false), 30_000);
      }
    } catch {
      toast.error("Erro ao reenviar", {
        description: "Tente novamente em alguns instantes.",
      });
    } finally {
      setResending(false);
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-8"
      style={{ background: "#0B0F1A" }}
    >
      <div
        className="w-full max-w-sm rounded-3xl p-7 text-center"
        style={{
          background: "#121826",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 60px rgba(0,0,0,0.5)",
        }}
      >
        {/* Ícone */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <Mail size={28} style={{ color: "#22c55e" }} />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black text-white mb-2">
          E-mail enviado!
        </h1>
        <p className="text-sm mb-1" style={{ color: "#9CA3AF" }}>
          Enviamos um link de acesso para:
        </p>
        {email && (
          <p className="font-bold text-white mb-5 text-sm break-all px-2">
            {email}
          </p>
        )}

        {/* Passo a passo */}
        <div
          className="rounded-2xl p-4 mb-4 text-left space-y-3"
          style={{ background: "#0D1120", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6B7280" }}>
            O que fazer agora:
          </p>
          <Step number={1} icon={<Inbox size={13} />} text="Abra seu aplicativo de e-mail" />
          <Step
            number={2}
            icon={<Mail size={13} />}
            text={<>Procure o e-mail do <strong className="text-white">Plakr!</strong> com o assunto <strong className="text-white">"Seu link de acesso"</strong></>}
          />
          <Step
            number={3}
            icon={<CheckCircle2 size={13} />}
            text={<>Clique no botão <strong className="text-white">"Entrar no Plakr!"</strong></>}
          />
        </div>

        {/* Aviso de spam — destaque */}
        <div
          className="flex items-start gap-2.5 rounded-xl p-3 mb-4 text-left"
          style={{ background: "rgba(251,191,36,0.07)", border: "1px solid rgba(251,191,36,0.2)" }}
        >
          <AlertCircle size={14} className="shrink-0 mt-0.5" style={{ color: "#FBB724" }} />
          <p className="text-xs leading-relaxed" style={{ color: "#D97706" }}>
            <strong>Não encontrou?</strong> Verifique a pasta de <strong>spam</strong> ou <strong>lixo eletrônico</strong> — e-mails automáticos às vezes vão parar lá.
          </p>
        </div>

        {/* Link direto para o provedor */}
        {emailProvider && (
          <a
            href={emailProvider.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl mb-4 font-bold text-sm transition-all hover:opacity-90"
            style={{ background: emailProvider.color, color: "#fff" }}
          >
            <Smartphone size={15} />
            Abrir {emailProvider.name}
          </a>
        )}

        {/* Aviso de expiração */}
        <div className="flex items-center justify-center gap-1.5 mb-4 text-xs" style={{ color: "#4B5563" }}>
          <Clock size={11} />
          <span>
            O link expira em <strong style={{ color: "#f59e0b" }}>15 minutos</strong> e só pode ser usado uma vez
          </span>
        </div>

        {/* Botão: digitar código OTP */}
        {email && (
          <Link
            href={`/magic-link/otp?email=${encodeURIComponent(email)}&returnPath=${encodeURIComponent(returnPath)}`}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 rounded-xl mb-3 font-bold text-sm transition-all hover:opacity-90"
            style={{
              background: "rgba(255,184,0,0.1)",
              border: "1px solid rgba(255,184,0,0.25)",
              color: "#FFB800",
            }}
          >
            <KeyRound size={15} />
            Prefiro digitar o código de 6 dígitos
          </Link>
        )}

        {/* Botão de reenvio */}
        {!resent ? (
          <Button
            variant="outline"
            size="sm"
            onClick={handleResend}
            disabled={resending || !email}
            className="w-full mb-3 font-semibold"
            style={{
              borderColor: "rgba(255,255,255,0.12)",
              color: "#9CA3AF",
              background: "transparent",
            }}
          >
            {resending ? (
              <>
                <RefreshCw size={14} className="mr-2 animate-spin" />
                Reenviando...
              </>
            ) : (
              <>
                <RefreshCw size={14} className="mr-2" />
                {resentCount > 0 ? "Reenviar novamente" : "Não recebi — reenviar link"}
              </>
            )}
          </Button>
        ) : (
          <div
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 rounded-xl mb-3 text-sm font-semibold"
            style={{ background: "rgba(34,197,94,0.1)", color: "#22c55e" }}
          >
            <CheckCircle2 size={14} />
            Link reenviado! Verifique sua caixa de entrada.
          </div>
        )}

        {/* Voltar */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm mx-auto transition-colors hover:text-white"
          style={{ color: "#4B5563" }}
        >
          <ArrowLeft size={13} />
          Voltar para o início
        </button>
      </div>
    </div>
  );
}

function Step({ number, icon, text }: { number: number; icon: React.ReactNode; text: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div
        className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black shrink-0 mt-0.5"
        style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}
      >
        {number}
      </div>
      <div className="flex items-start gap-1.5 text-sm" style={{ color: "#9CA3AF" }}>
        <span className="shrink-0 mt-0.5" style={{ color: "#6B7280" }}>{icon}</span>
        <span>{text}</span>
      </div>
    </div>
  );
}

function getEmailProvider(email: string): { name: string; url: string; color: string } | null {
  const domain = email.split("@")[1]?.toLowerCase();
  if (!domain) return null;
  if (domain.includes("gmail")) return { name: "Gmail", url: "https://mail.google.com", color: "#EA4335" };
  if (domain.includes("hotmail") || domain.includes("outlook") || domain.includes("live") || domain.includes("msn"))
    return { name: "Outlook", url: "https://outlook.live.com", color: "#0078D4" };
  if (domain.includes("yahoo")) return { name: "Yahoo Mail", url: "https://mail.yahoo.com", color: "#6001D2" };
  if (domain.includes("icloud") || domain.includes("me.com") || domain.includes("mac.com"))
    return { name: "iCloud Mail", url: "https://www.icloud.com/mail", color: "#3A3A3C" };
  if (domain.includes("uol")) return { name: "UOL Mail", url: "https://mail.uol.com.br", color: "#FF6600" };
  if (domain.includes("bol")) return { name: "BOL Mail", url: "https://email.bol.com.br", color: "#FF6600" };
  return null;
}
