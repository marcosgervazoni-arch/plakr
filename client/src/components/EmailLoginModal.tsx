/**
 * Plakr! — Modal de Login por E-mail
 *
 * Vai direto para o formulário de nome + e-mail (magic link).
 * O login via Google OAuth aparece como opção secundária quando habilitado no Super Admin.
 * O login via Manus OAuth aparece como link discreto abaixo do formulário.
 *
 * Simplificação: a etapa "choose" foi eliminada para evitar o bug de closure
 * no useEffect que causava a exibição da etapa errada ao abrir o modal.
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

interface EmailLoginModalProps {
  open: boolean;
  onClose: () => void;
  returnPath?: string;
  subtitle?: string;
  /** @deprecated — mantido por compatibilidade, não tem mais efeito */
  initialStep?: "choose" | "email";
}

export default function EmailLoginModal({ open, onClose, returnPath = "/dashboard", subtitle }: EmailLoginModalProps) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");

  // Limpa o formulário sempre que o modal abre
  useEffect(() => {
    if (open) {
      setEmail("");
      setName("");
      setEmailError("");
      setNameError("");
    }
  }, [open]);

  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();
  const loginUrl = getLoginUrl(returnPath);

  // Verificar se Google OAuth está habilitado (consulta pública, sem auth)
  const { data: authConfig } = trpc.platform.getAuthConfig.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // 5 minutos de cache
  });
  const googleOAuthEnabled = authConfig?.googleOAuthEnabled ?? false;

  function handleClose() {
    setEmail("");
    setName("");
    setEmailError("");
    setNameError("");
    onClose();
  }

  function validateEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  function handleGoogleLogin() {
    const origin = window.location.origin;
    const googleUrl = `/api/oauth/google?origin=${encodeURIComponent(origin)}&returnPath=${encodeURIComponent(returnPath)}`;
    window.location.href = googleUrl;
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
        <DialogHeader>
          {/* Logo Plakr! */}
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-black"
              style={{ background: "linear-gradient(135deg, #FFB800, #FF8A00)", color: "#0B0F1A" }}>
              P!
            </div>
            <span className="font-bold text-white text-base">Plakr!</span>
          </div>

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

          {/* Opções secundárias: Google + Manus */}
          <div className="flex items-center gap-3 pt-1">
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
            <span className="text-xs" style={{ color: "#4B5563" }}>ou</span>
            <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>

          <div className="space-y-2">
            {/* Botão Google OAuth — exibido apenas quando habilitado no Super Admin */}
            {googleOAuthEnabled && (
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-2.5 text-sm px-4 py-2.5 rounded-lg transition-all hover:bg-white/5 active:scale-[0.98]"
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "#E5E7EB",
                }}
                aria-label="Entrar com Google"
              >
                {/* Google "G" SVG */}
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" fill="#34A853"/>
                  <path d="M3.964 10.71c-.18-.54-.282-1.117-.282-1.71s.102-1.17.282-1.71V4.958H.957C.347 6.173 0 7.548 0 9s.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </svg>
                Entrar com Google
              </button>
            )}

            {/* Link Manus OAuth — sempre discreto */}
            <a
              href={loginUrl}
              className="w-full flex items-center justify-center gap-2 text-xs px-4 py-2.5 rounded-lg transition-all"
              style={{
                background: "transparent",
                border: "1px solid rgba(255,255,255,0.07)",
                color: "#6B7280",
                display: "flex",
              }}
              aria-label="Entrar com conta Manus"
            >
              Entrar com conta Manus
            </a>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
