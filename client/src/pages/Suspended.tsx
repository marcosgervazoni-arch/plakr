/**
 * Tela de Usuário Bloqueado — /suspended
 * Exibida quando o usuário tem isBlocked=true.
 * Não usa AppShell para evitar acesso à navegação principal.
 */
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { ShieldOff, LogOut, Mail } from "lucide-react";

export default function Suspended() {
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { window.location.href = "/"; },
  });

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center space-y-6">

        {/* Icon */}
        <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
          <ShieldOff className="w-10 h-10 text-red-400" />
        </div>

        {/* Title */}
        <div className="space-y-2">
          <h1 className="font-bold text-2xl text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
            Conta suspensa
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Sua conta foi temporariamente suspensa. Isso pode ter ocorrido por violação dos termos de uso
            ou por uma solicitação administrativa.
          </p>
        </div>

        {/* Info box */}
        <div className="bg-card border border-border/30 rounded-xl p-5 text-left space-y-3">
          <p className="font-semibold text-sm">O que fazer agora?</p>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">1.</span>
              Verifique se você recebeu um e-mail com mais detalhes sobre a suspensão.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">2.</span>
              Entre em contato com o administrador do bolão ou da plataforma para entender o motivo.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary mt-0.5">3.</span>
              Se acredita que houve um engano, solicite a revisão da sua conta.
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <a href="mailto:suporte@apostai.com.br">
            <Button variant="outline" className="gap-2 w-full sm:w-auto">
              <Mail className="w-4 h-4" /> Contatar suporte
            </Button>
          </a>
          <Button
            variant="ghost"
            className="gap-2 text-muted-foreground w-full sm:w-auto"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
          >
            <LogOut className="w-4 h-4" /> Sair da conta
          </Button>
        </div>

      </div>
    </div>
  );
}
