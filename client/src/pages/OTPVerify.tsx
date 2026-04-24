/**
 * Plakr! — Tela de verificação por código OTP
 * Exibida quando o usuário prefere digitar o código de 6 dígitos
 * em vez de clicar no link do e-mail.
 */
import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { ArrowLeft, RefreshCw, KeyRound, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

export default function OTPVerify() {
  const [, navigate] = useLocation();
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") ?? "";
  const returnPath = params.get("returnPath") ?? "/dashboard";

  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const verifyOtp = trpc.authMagic.verifyOtp.useMutation();
  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();

  // Foca no primeiro campo ao montar
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  function handleDigitChange(index: number, value: string) {
    // Aceita apenas dígitos
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    setError(null);

    // Avança para o próximo campo
    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit quando todos os 6 dígitos estiverem preenchidos
    if (digit && index === 5) {
      const code = [...newDigits.slice(0, 5), digit].join("");
      if (code.length === 6) {
        handleVerify(code);
      }
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === "ArrowLeft" && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === "ArrowRight" && index < 5) inputRefs.current[index + 1]?.focus();
  }

  function handlePaste(e: React.ClipboardEvent) {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pasted) return;
    const newDigits = [...digits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] ?? "";
    }
    setDigits(newDigits);
    setError(null);
    // Foca no último preenchido
    const lastIdx = Math.min(pasted.length - 1, 5);
    inputRefs.current[lastIdx]?.focus();
    // Auto-submit se completo
    if (pasted.length === 6) handleVerify(pasted);
  }

  async function handleVerify(code?: string) {
    const otp = code ?? digits.join("");
    if (otp.length !== 6) {
      setError("Digite todos os 6 dígitos do código.");
      return;
    }
    if (!email) {
      setError("E-mail não informado. Volte e tente novamente.");
      return;
    }

    setVerifying(true);
    setError(null);
    try {
      const result = await verifyOtp.mutateAsync({
        email,
        otp,
        origin: window.location.origin,
      });

      if (result.valid && result.redirectUrl) {
        // Redireciona para o verify do magic link (que cria a sessão)
        window.location.href = result.redirectUrl;
      } else {
        setError(result.error ?? "Código inválido ou expirado.");
        // Limpa os campos para nova tentativa
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 50);
      }
    } catch {
      setError("Erro ao verificar o código. Tente novamente.");
      setDigits(["", "", "", "", "", ""]);
      setTimeout(() => inputRefs.current[0]?.focus(), 50);
    } finally {
      setVerifying(false);
    }
  }

  async function handleResend() {
    if (resending || !email) return;
    setResending(true);
    setDigits(["", "", "", "", "", ""]);
    setError(null);
    try {
      await sendMagicLink.mutateAsync({
        email,
        returnPath,
        origin: window.location.origin,
      });
      setResent(true);
      toast.success("Novo código enviado!", {
        description: "Verifique sua caixa de entrada e também o spam.",
      });
      setTimeout(() => {
        setResent(false);
        inputRefs.current[0]?.focus();
      }, 5000);
    } catch {
      toast.error("Erro ao reenviar", { description: "Tente novamente em instantes." });
    } finally {
      setResending(false);
    }
  }

  const code = digits.join("");
  const isComplete = code.length === 6;

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
          style={{ background: "rgba(255,184,0,0.12)", border: "1px solid rgba(255,184,0,0.2)" }}
        >
          <KeyRound size={28} style={{ color: "#FFB800" }} />
        </div>

        {/* Título */}
        <h1 className="text-2xl font-black text-white mb-2">
          Digite o código
        </h1>
        <p className="text-sm mb-1" style={{ color: "#9CA3AF" }}>
          Enviamos um código de 6 dígitos para:
        </p>
        {email && (
          <p className="font-bold text-white mb-6 text-sm break-all px-2">
            {email}
          </p>
        )}

        {/* Campos de dígitos */}
        <div className="flex gap-2 justify-center mb-5" onPaste={handlePaste}>
          {digits.map((digit, i) => (
            <input
              key={i}
              ref={(el) => { inputRefs.current[i] = el; }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digit}
              onChange={(e) => handleDigitChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              disabled={verifying}
              className="w-11 h-14 text-center text-2xl font-black rounded-xl border-2 transition-all outline-none"
              style={{
                background: "#0D1120",
                borderColor: error
                  ? "#EF4444"
                  : digit
                  ? "#FFB800"
                  : "rgba(255,255,255,0.1)",
                color: "#FFFFFF",
                caretColor: "#FFB800",
              }}
            />
          ))}
        </div>

        {/* Erro */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-xl p-3 mb-4 text-left"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            <AlertCircle size={14} className="shrink-0 mt-0.5 text-red-400" />
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Sucesso reenvio */}
        {resent && (
          <div
            className="flex items-center gap-2 rounded-xl p-3 mb-4 text-sm font-semibold"
            style={{ background: "rgba(34,197,94,0.08)", color: "#22c55e" }}
          >
            <CheckCircle2 size={14} />
            Novo código enviado! Verifique sua caixa de entrada.
          </div>
        )}

        {/* Botão verificar */}
        <Button
          onClick={() => handleVerify()}
          disabled={!isComplete || verifying}
          className="w-full mb-3 font-black text-base h-12"
          style={{
            background: isComplete ? "linear-gradient(135deg, #FFB800, #FF8A00)" : "rgba(255,255,255,0.06)",
            color: isComplete ? "#0B0F1A" : "#4B5563",
            border: "none",
          }}
        >
          {verifying ? (
            <>
              <RefreshCw size={16} className="mr-2 animate-spin" />
              Verificando...
            </>
          ) : (
            "Entrar no Plakr!"
          )}
        </Button>

        {/* Reenviar código */}
        <button
          onClick={handleResend}
          disabled={resending}
          className="text-sm w-full py-2 mb-3 transition-colors hover:text-white"
          style={{ color: "#6B7280" }}
        >
          {resending ? (
            <span className="flex items-center justify-center gap-1.5">
              <RefreshCw size={13} className="animate-spin" />
              Reenviando...
            </span>
          ) : (
            "Não recebi o código — reenviar"
          )}
        </button>

        {/* Voltar */}
        <button
          onClick={() => navigate(-1 as never)}
          className="flex items-center gap-1.5 text-sm mx-auto transition-colors hover:text-white"
          style={{ color: "#4B5563" }}
        >
          <ArrowLeft size={13} />
          Voltar
        </button>
      </div>
    </div>
  );
}
