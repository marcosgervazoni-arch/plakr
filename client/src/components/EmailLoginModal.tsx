/**
 * Plakr! — Modal de Login por E-mail (Magic Link)
 * Método padrão de acesso ao Plakr! — funciona em todos os navegadores,
 * incluindo Safari no iPhone (onde o OAuth é bloqueado por cookies de terceiros).
 *
 * Comportamento:
 * - No Safari/iPhone: exibe badge informativo sobre compatibilidade
 * - Para qualquer usuário: funciona para quem já tem conta E para novos usuários
 *
 * Uso:
 * <EmailLoginModal open={open} onClose={() => setOpen(false)} returnPath="/dashboard" />
 */
import { useState } from "react";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, ArrowRight, Loader2, Smartphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSafariDetect } from "@/hooks/useSafariDetect";

interface EmailLoginModalProps {
  open: boolean;
  onClose: () => void;
  returnPath?: string;
}

export default function EmailLoginModal({ open, onClose, returnPath = "/dashboard" }: EmailLoginModalProps) {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [emailError, setEmailError] = useState("");
  const isSafari = useSafariDetect();

  const sendMagicLink = trpc.authMagic.sendMagicLink.useMutation();

  function validateEmail(value: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
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
      await sendMagicLink.mutateAsync({
        email: trimmedEmail,
        returnPath,
        origin: window.location.origin,
      });

      // Navega para a página de confirmação
      onClose();
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
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="sm:max-w-md"
        style={{
          background: "#121826",
          border: "1px solid rgba(255,255,255,0.08)",
          color: "#f5f5f5",
        }}
      >
        <DialogHeader>
          {/* Badge Safari — aparece apenas no Safari/iPhone */}
          {isSafari && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs mb-3"
              style={{ background: "rgba(0,194,255,0.08)", border: "1px solid rgba(0,194,255,0.2)", color: "#00C2FF" }}
              role="alert"
            >
              <Smartphone size={12} />
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
            Entrar no Plakr!
          </DialogTitle>
          <DialogDescription style={{ color: "#9CA3AF" }}>
            Informe seu e-mail e enviaremos um link de acesso direto — sem senha, sem complicação.
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
              onChange={(e) => {
                setEmail(e.target.value);
                setEmailError("");
              }}
              autoFocus
              autoComplete="email"
              disabled={loading}
              className="bg-[#0D1120] border-[rgba(255,255,255,0.1)] text-white placeholder:text-[#6B7280] focus:border-[#FFB800] focus:ring-[#FFB800]/20"
            />
            {emailError && (
              <p className="text-xs" style={{ color: "#ef4444" }}>
                {emailError}
              </p>
            )}
          </div>

          {/* Dica contextual */}
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
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Enviando link...
              </>
            ) : (
              <>
                Enviar link de acesso
                <ArrowRight size={16} className="ml-2" />
              </>
            )}
          </Button>

          <p className="text-xs text-center" style={{ color: "#6B7280" }}>
            ⏰ O link expira em 15 minutos e só pode ser usado uma vez.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
