/**
 * Plakr! — Modal de Login
 * Apresenta as opções de acesso ao Plakr! de forma organizada:
 * - Etapa 1: Escolha do método (OAuth ou Magic Link por e-mail)
 * - Etapa 2: Formulário de nome completo + e-mail (quando Magic Link selecionado)
 *
 * No Safari/iPhone: etapa 1 é pulada, vai direto para o formulário de e-mail.
 * Para outros navegadores: OAuth em destaque, Magic Link como alternativa.
 *
 * Correção: useEffect sincroniza o step sempre que o modal abre,
 * evitando que o useState fique travado no valor inicial do primeiro render.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, ChevronLeft, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSafariDetect } from "@/hooks/useSafariDetect";
import { getLoginUrl } from "@/const";

interface EmailLoginModalProps {
  open: boolean;
  onClose: () => void;
  returnPath?: string;
  subtitle?: string;
  /** Quando "email", pula a etapa de escolha de método e vai direto para o formulário de e-mail */
  initialStep?: "choose" | "email";
}

type Step = "choose" | "email";

export default function EmailLoginModal({ open, onClose, returnPath = "/dashboard", subtitle, initialStep }: EmailLoginModalProps) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const isSafari = useSafariDetect();

  // Calcula o step padrão considerando a prop e o Safari
  const getDefaultStep = (): Step => initialStep ?? (isSafari ? "email" : "choose");
  const [step, setStep] = useState<Step>(getDefaultStep);

  // Sincroniza o step sempre que o modal ABRE — corrige o bug do useState travado no primeiro render
  useEffect(() => {
    if (open) {
      setStep(getDefaultStep());
      setEmail("");
      setName("");
      setEmailError("");
      setNameError("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();
  const loginUrl = getLoginUrl(returnPath);

  function handleClose() {
    setEmail("");
    setName("");
    setEmailError("");
    setNameError("");
    setStep(getDefaultStep());
    onClose();
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailError("");
    setNameError("");

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setNameError("Digite seu nome completo para continuar.");
      return;
    }
    if (trimmedName.length < 2) {
      setNameError("Nome muito curto. Digite seu nome completo.");
      return;
    }
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
        name: trimmedName,
        returnPath,
        origin: window.location.origin,
      });
      if (result && !result.sent) {
        setEmailError("Não foi possível enviar o código. Tente novamente ou entre em contato com o organizador.");
        setLoading(false);
        return;
      }
      handleClose();
      navigate(`/magic-link/sent?email=${encodeURIComponent(trimmedEmail)}&returnPath=${encodeURIComponent(returnPath)}`);
    } catch (err: any) {
      toast.error("Erro ao enviar o código", {
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
                {subtitle ?? "Escolha como prefere acessar sua conta."}
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

        {/* ── ETAPA 2: Formulário de nome + e-mail ───────────────────────── */}
        {step === "email" && (
          <>
            <DialogHeader>
              {/* Botão voltar — só aparece se não for Safari e se initialStep não forçou "email" */}
              {!isSafari && !initialStep && (
                <button
                  onClick={() => { setEmail(""); setName(""); setEmailError(""); setNameError(""); setStep("choose"); }}
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
                {subtitle ?? "Enviaremos um código de acesso — sem senha, sem complicação."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              {/* Campo: Nome completo */}
              <div className="space-y-1.5">
                <Label htmlFor="magic-link-name" className="text-sm font-medium text-white">
                  Seu nome completo
                </Label>
                <div className="relative">
                  <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" style={{ color: "#6B7280" }} />
                  <Input
                    id="magic-link-name"
                    type="text"
                    placeholder="Ex: João Silva"
                    value={name}
                    onChange={(e) => { setName(e.target.value); setNameError(""); }}
                    autoFocus
                    autoComplete="name"
                    disabled={loading}
                    className="pl-9 bg-[#0D1120] border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#6B7280] focus:border-[#FFB800] focus:ring-[#FFB800]/20"
                  />
                </div>
                {nameError && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>{nameError}</p>
                )}
              </div>

              {/* Campo: E-mail */}
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
                  autoComplete="email"
                  disabled={loading}
                  className="bg-[#0D1120] border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#6B7280] focus:border-[#FFB800] focus:ring-[#FFB800]/20"
                />
                {emailError && (
                  <p className="text-xs" style={{ color: "#ef4444" }}>{emailError}</p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading || !email.trim() || !name.trim()}
                className="w-full font-bold"
                style={{
                  background: loading ? "rgba(255,184,0,0.3)" : "linear-gradient(135deg, #FFB800, #FF8A00)",
                  color: "#0B0F1A",
                  border: "none",
                }}
              >
                {loading ? (
                  <><Loader2 size={16} className="mr-2 animate-spin" />Enviando código...</>
                ) : (
                  <>Enviar código de acesso<ArrowRight size={16} className="ml-2" /></>
                )}
              </Button>

              <p className="text-xs text-center" style={{ color: "#6B7280" }}>
                ⏰ O código expira em 15 minutos e só pode ser usado uma vez.
              </p>
            </form>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
