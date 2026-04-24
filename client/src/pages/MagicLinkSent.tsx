/**
 * Plakr! — Página de Confirmação do Magic Link
 * Exibida após o usuário solicitar o link de acesso por e-mail.
 * Informa que o e-mail foi enviado e orienta o usuário a verificar a caixa de entrada.
 */
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Mail, ArrowLeft, RefreshCw } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export default function MagicLinkSent() {
  const [, navigate] = useLocation();
  const [resent, setResent] = useState(false);
  const [resending, setResending] = useState(false);

  // Recupera o e-mail e returnPath da query string
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") ?? "";
  const returnPath = params.get("returnPath") ?? "/dashboard";

  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();

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
        toast.error("Erro ao reenviar", {
          description: "Não foi possível enviar o link. Tente novamente.",
        });
      } else {
        setResent(true);
        toast.success("E-mail reenviado!", {
          description: "Verifique sua caixa de entrada novamente.",
        });
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
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "#0B0F1A" }}
    >
      <div
        className="w-full max-w-md rounded-2xl p-8 text-center"
        style={{
          background: "#121826",
          border: "1px solid rgba(255,255,255,0.06)",
          boxShadow: "0 0 40px rgba(0,0,0,0.4)",
        }}
      >
        {/* Ícone */}
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}
        >
          <Mail size={28} style={{ color: "#22c55e" }} />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black text-white mb-3">
          Verifique seu e-mail!
        </h1>

        {/* Descrição */}
        <p className="text-sm leading-relaxed mb-2" style={{ color: "#9CA3AF" }}>
          Enviamos um link de acesso para:
        </p>
        {email && (
          <p className="font-semibold text-white mb-6 text-base break-all">
            {email}
          </p>
        )}

        {/* Instruções */}
        <div
          className="rounded-xl p-4 mb-6 text-left"
          style={{ background: "#0D1120", border: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p className="text-sm font-semibold text-white mb-3">Como acessar:</p>
          <ol className="space-y-2 text-sm" style={{ color: "#9CA3AF" }}>
            <li className="flex items-start gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}
              >
                1
              </span>
              Abra seu aplicativo de e-mail
            </li>
            <li className="flex items-start gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}
              >
                2
              </span>
              Procure o e-mail do <strong className="text-white">Plakr!</strong> com o assunto "Seu link de acesso"
            </li>
            <li className="flex items-start gap-2">
              <span
                className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5"
                style={{ background: "rgba(255,184,0,0.15)", color: "#FFB800" }}
              >
                3
              </span>
              Clique no botão <strong className="text-white">"Entrar no Plakr!"</strong>
            </li>
          </ol>
        </div>

        {/* Aviso de expiração */}
        <p className="text-xs mb-6" style={{ color: "#6B7280" }}>
          ⏰ O link expira em <strong style={{ color: "#f59e0b" }}>15 minutos</strong> e só pode ser usado uma vez.
          Verifique também a pasta de spam.
        </p>

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
                Reenviar link
              </>
            )}
          </Button>
        ) : (
          <p className="text-sm mb-3" style={{ color: "#22c55e" }}>
            ✅ Link reenviado! Verifique sua caixa de entrada.
          </p>
        )}

        {/* Voltar */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-sm mx-auto transition-colors hover:text-white"
          style={{ color: "#6B7280" }}
        >
          <ArrowLeft size={14} />
          Voltar para o início
        </button>
      </div>
    </div>
  );
}
