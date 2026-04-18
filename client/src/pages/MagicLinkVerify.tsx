/**
 * Plakr! — Página de Verificação do Magic Link
 * Processa o token da URL e redireciona para o destino após login bem-sucedido.
 *
 * Esta página é acessada via link no e-mail:
 * /magic-link/verify?token=XXX
 *
 * O token é validado pelo backend via redirect para:
 * /api/auth/magic-link/verify?token=XXX
 *
 * Em caso de erro, o backend redireciona para:
 * /magic-link/verify?error=invalid_or_expired
 */
import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Loader2, CheckCircle, XCircle, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";

type VerifyState = "loading" | "redirecting" | "error";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_token: "O link é inválido ou está mal formatado.",
  invalid_or_expired: "Este link já foi usado ou expirou. Links de acesso são válidos por apenas 15 minutos e só podem ser usados uma vez.",
  user_not_found: "Não encontramos uma conta associada a este e-mail.",
  user_blocked: "Esta conta está temporariamente suspensa. Entre em contato com o suporte.",
  server_error: "Ocorreu um erro no servidor. Por favor, tente novamente.",
};

export default function MagicLinkVerify() {
  const [, navigate] = useLocation();
  const [state, setState] = useState<VerifyState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");

  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");
  const error = params.get("error");

  useEffect(() => {
    // Se há um erro na URL, o backend já processou e redirecionou com erro
    if (error) {
      setState("error");
      setErrorMessage(ERROR_MESSAGES[error] ?? "Ocorreu um erro inesperado.");
      return;
    }

    // Se há um token, redirecionar para a rota Express de verificação
    if (token) {
      setState("redirecting");
      // O backend valida o token, cria a sessão e redireciona para o returnPath
      window.location.href = `/api/auth/magic-link/verify?token=${encodeURIComponent(token)}`;
      return;
    }

    // Sem token e sem erro — URL inválida
    setState("error");
    setErrorMessage("Link de acesso inválido. Por favor, solicite um novo link.");
  }, [token, error]);

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
        {/* Estado: carregando / redirecionando */}
        {(state === "loading" || state === "redirecting") && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.2)" }}
            >
              <Loader2 size={28} className="animate-spin" style={{ color: "#22c55e" }} />
            </div>
            <h1 className="text-xl font-black text-white mb-3">
              {state === "redirecting" ? "Verificando seu acesso..." : "Aguarde..."}
            </h1>
            <p className="text-sm" style={{ color: "#9CA3AF" }}>
              {state === "redirecting"
                ? "Estamos validando seu link e preparando seu acesso."
                : "Processando..."}
            </p>
          </>
        )}

        {/* Estado: erro */}
        {state === "error" && (
          <>
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
              style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}
            >
              <XCircle size={28} style={{ color: "#ef4444" }} />
            </div>
            <h1 className="text-xl font-black text-white mb-3">
              Link inválido ou expirado
            </h1>
            <p className="text-sm leading-relaxed mb-6" style={{ color: "#9CA3AF" }}>
              {errorMessage}
            </p>

            {/* CTA para solicitar novo link */}
            <Button
              onClick={() => navigate("/?login=email")}
              className="w-full font-bold mb-3"
              style={{
                background: "linear-gradient(135deg, #FFB800, #FF8A00)",
                color: "#0B0F1A",
                border: "none",
              }}
            >
              <Mail size={16} className="mr-2" />
              Solicitar novo link
            </Button>

            <button
              onClick={() => navigate("/")}
              className="text-sm transition-colors hover:text-white"
              style={{ color: "#6B7280" }}
            >
              Voltar para o início
            </button>
          </>
        )}
      </div>
    </div>
  );
}
