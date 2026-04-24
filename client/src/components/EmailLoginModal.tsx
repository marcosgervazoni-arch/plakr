/**
 * Plakr! — Modal de Login
 * Apresenta as opções de acesso ao Plakr! de forma organizada:
 * - Etapa 1: Escolha do método (OAuth ou Magic Link por e-mail)
 * - Etapa 2: Formulário de e-mail (quando Magic Link selecionado)
 *
 * No Safari/iPhone: etapa 1 é pulada, vai direto para o e-mail.
 * Para outros navegadores: OAuth em destaque, Magic Link como alternativa.
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, ChevronLeft } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSafariDetect } from "@/hooks/useSafariDetect";
import { getLoginUrl } from "@/const";

interface EmailLoginModalProps {
  open: boolean;
  onClose: () => void;
  returnPath?: string;
}

type Step = "choose" | "email";

export default function EmailLoginModal({ open, onClose, returnPath = "/dashboard" }: EmailLoginModalProps) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const isSafari = useSafariDetect();

  // Safari vai direto para e-mail; outros começam na escolha
  const [step, setStep] = useState<Step>(isSafari ? "email" : "choose");

  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();
  const loginUrl = getLoginUrl(returnPath);

  function handleClose() {
    // Resetar estado ao fechar
    setEmail("");
    setEmailError("");
    setStep(isSafari ? "email" : "choose");
    onClose();
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError("Digite seu e-mail para continuar.");
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setEmailError("Digite um e-mail válido.");
      return;
    }

    setLoading(true);
    try {
      const result = await sendMagicLink.mutateAsync({
        email: trimmedEmail,
        returnPath,
        origin: window.location.origin,
      });
      // Falha na criação de conta (erro interno)
      if (result && !result.sent) {
        setEmailError("Não foi possível enviar o link. Tente novamente ou entre em contato com o organizador.");
        setLoading(false);
        return;
      }
      handleClose();
      navigate(`/magic-link/sent?email=${encodeURIComponent(trimmedEmail)}&returnPath=${encodeURIComponent(returnPath)}`);
    } catch (err: any) {
      toast.error("Erro ao enviar o link", {
        description: err?.message ?? "Tente novamente em alguns instantes.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent
        className="sm:max-w-sm"
        style={{
          background: "#121826",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#f5f5f5",
        }}
      >
        {/* ── ETAPA 1: Escolha do método ─────────────────────────────────── */}
        {step === "choose" && (
          <>
            <DialogHeader>
              {/* Logo Plakr! */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
                  style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>
                  P!
                </div>
                <span className="font-bold text-white text-base">Plakr!</span>
              </div>
              <DialogTitle className="text-xl font-black text-white">
                Entrar no Plakr!
              </DialogTitle>
              <DialogDescription style={{ color: "#9CA3AF" }}>
                Escolha como prefere acessar sua conta.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-col gap-3 mt-2">
              {/* OAuth — método principal para não-Safari */}
              <a
                href={loginUrl}
                className="w-full flex items-center justify-center gap-2 font-bold text-sm px-4 py-3 rounded-lg transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}
                aria-label="Entrar com conta Manus"
              >
                Entrar com conta Manus
                <ArrowRight size={15} />
              </a>

              {/* Divisor */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <span className="text-xs" style={{ color: "#6B7280" }}>ou</span>
                <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              </div>

              {/* Magic Link — alternativa por e-mail */}
              <button
                onClick={() => setStep("email")}
                className="w-full flex items-center justify-center gap-2 text-sm px-4 py-3 rounded-lg transition-all hover:border-white/20"
                style={{
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#9CA3AF",
                }}
                aria-label="Entrar com link por e-mail"
              >
                <Mail size={15} />
                Entrar com link por e-mail
              </button>

              <p className="text-xs text-center mt-1" style={{ color: "#4B5563" }}>
                Sem senha · Acesso seguro · Funciona em qualquer dispositivo
              </p>
            </div>
          </>
        )}

        {/* ── ETAPA 2: Formulário de e-mail ──────────────────────────────── */}
        {step === "email" && (
          <>
            <DialogHeader>
              {/* Botão voltar — só aparece se não for Safari */}
              {!isSafari && (
                <button
                  onClick={() => { setEmail(""); setEmailError(""); setStep("choose"); }}
                  className="flex items-center gap-1 text-xs mb-3 transition-colors hover:text-white w-fit"
                  style={{ color: "#6B7280" }}
                  aria-label="Voltar para escolha de método"
                >
                  <ChevronLeft size={14} />
                  Voltar
                </button>
              )}

              {/* Badge Safari */}
              {isSafari && (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-3"
                  style={{ background: "rgba(0,194,255,0.08)", border: "1px solid rgba(0,194,255,0.2)", color: "#00C2FF" }}
                  role="alert"
                >
                  <Mail size={12} />
                  <span>Acesso por e-mail recomendado para Safari e iPhone.</span>
                </div>
              )}

              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-2"
                style={{ background: "rgba(255,184,0,0.12)", border: "1px solid rgba(255,184,0,0.3)" }}
              >
                <Mail size={22} style={{ color: "#FFB800" }} />
              </div>
              <DialogTitle className="text-xl font-black text-white">
                Acesso por e-mail
              </DialogTitle>
              <DialogDescription style={{ color: "#9CA3AF" }}>
                Enviaremos um link de acesso direto — sem senha, sem complicação.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <Label htmlFor="magic-link-email" className="text-sm font-medium text-white">
                  Seu e-mail
                </Label>
                <Input
                  id="magic-link-email"
                  type="email"
                  placeholder="seuemail@exemplo.com"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(""); }}
                  autoFocus
                  autoComplete="email"
                  disabled={loading}
                  className="bg-[#0D1120] border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#6B7280] focus:border-[#FFB800] focus:ring-[#FFB800]/20"
                />
                {emailError && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>{emailError}</p>
                )}
              </div>

              <div
                className="rounded-lg p-3 text-xs"
                style={{ background: "#0D1120", border: "1px solid rgba(255,255,255,0.04)", color: "#9CA3AF" }}
              >
                💡 Se já tem conta, o link vai direto para o seu painel. Se é a primeira vez, você será guiado para criar sua conta.
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full font-bold"
                style={{
                  background: loading ? "rgba(255,184,0,0.3)" : "linear-gradient(135deg, #FFB800, #FF8A00)",
                  color: "#0B0F1A",
                  border: "none",
                }}
              >
                {loading ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Enviando link...</>
                ) : (
                  <>Enviar link de acesso<ArrowRight size={16} className="ml-2" /></>
                )}
              </Button>

              <p className="text-xs text-center" style={{ color: "#6B7280" }}>
                ⏰ O link expira em 15 minutos e só pode ser usado uma vez.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
