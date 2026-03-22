import { AlertTriangle, RefreshCw, WifiOff, Lock, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorType = "network" | "forbidden" | "not_found" | "server" | "generic";

interface ErrorCardProps {
  error?: unknown;
  onRetry?: () => void;
  className?: string;
  compact?: boolean;
}

function getErrorInfo(error: unknown): { type: ErrorType; title: string; description: string } {
  const msg = error instanceof Error ? error.message : String(error ?? "");
  const code = (error as { data?: { code?: string } })?.data?.code;

  if (code === "FORBIDDEN" || msg.includes("FORBIDDEN")) {
    return { type: "forbidden", title: "Acesso negado", description: "Você não tem permissão para visualizar este conteúdo." };
  }
  if (code === "NOT_FOUND" || msg.includes("NOT_FOUND")) {
    return { type: "not_found", title: "Não encontrado", description: "O recurso solicitado não existe ou foi removido." };
  }
  if (msg.includes("fetch") || msg.includes("network") || msg.includes("Failed to fetch")) {
    return { type: "network", title: "Sem conexão", description: "Verifique sua conexão com a internet e tente novamente." };
  }
  if (code === "INTERNAL_SERVER_ERROR" || msg.includes("500")) {
    return { type: "server", title: "Erro no servidor", description: "Algo deu errado no servidor. Nossa equipe foi notificada." };
  }
  return { type: "generic", title: "Algo deu errado", description: "Ocorreu um erro inesperado. Tente novamente em alguns instantes." };
}

const icons: Record<ErrorType, typeof AlertTriangle> = {
  network: WifiOff,
  forbidden: Lock,
  not_found: AlertTriangle,
  server: ServerCrash,
  generic: AlertTriangle,
};

export function ErrorCard({ error, onRetry, className = "", compact = false }: ErrorCardProps) {
  const { type, title, description } = getErrorInfo(error);
  const Icon = icons[type];

  if (compact) {
    return (
      <div className={`flex items-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 ${className}`}>
        <Icon className="w-4 h-4 text-red-400 shrink-0" />
        <p className="text-sm text-red-400 flex-1">{title}</p>
        {onRetry && (
          <button onClick={onRetry} className="text-xs text-red-400 hover:text-red-300 underline">
            Tentar novamente
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center py-12 px-6 text-center ${className}`}>
      <div className="w-14 h-14 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4">
        <Icon className="w-7 h-7 text-red-400" />
      </div>
      <h3 className="text-base font-semibold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed mb-5">{description}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          className="border-[var(--border)] text-[var(--text)] gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Tentar novamente
        </Button>
      )}
    </div>
  );
}
