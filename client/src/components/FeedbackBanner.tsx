/**
 * FeedbackBanner — CES (Customer Effort Score)
 * Aparece como banner discreto no rodapé após ações específicas.
 * Escala: 1=😫 2=😕 3=😐 4=🙂 5=😄
 * Exibe campo de texto opcional quando score ≤ 2.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackBannerProps {
  context: string;
  onSubmit: (score: number, comment?: string) => void;
  onDismiss: () => void;
  isSubmitting?: boolean;
  className?: string;
}

const CES_OPTIONS = [
  { score: 1, emoji: "😫", label: "Muito difícil" },
  { score: 2, emoji: "😕", label: "Difícil" },
  { score: 3, emoji: "😐", label: "Neutro" },
  { score: 4, emoji: "🙂", label: "Fácil" },
  { score: 5, emoji: "😄", label: "Muito fácil" },
];

const CONTEXT_LABELS: Record<string, string> = {
  create_pool: "criar o bolão",
  first_bet: "fazer seu palpite",
  invite_member: "convidar o participante",
  accept_invite: "entrar no bolão",
  pool_ended: "acompanhar o bolão",
  game_result: "ver o resultado",
};

export function FeedbackBanner({
  context,
  onSubmit,
  onDismiss,
  isSubmitting,
  className,
}: FeedbackBannerProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  const contextLabel = CONTEXT_LABELS[context] ?? "usar o Plakr!";

  function handleSelect(score: number) {
    setSelected(score);
    if (score <= 2) {
      setShowComment(true);
    } else {
      setShowComment(false);
      setComment("");
    }
  }

  function handleSubmit() {
    if (selected === null) return;
    onSubmit(selected, comment.trim() || undefined);
  }

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 bg-[#121826] border-t border-white/10 shadow-2xl px-4 py-4 animate-in slide-in-from-bottom-4 duration-300",
        className
      )}
    >
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-sm font-semibold text-white">
              Foi fácil {contextLabel}?
            </p>
            <p className="text-xs text-white/50 mt-0.5">
              Seu feedback nos ajuda a melhorar
            </p>
          </div>
          <button
            onClick={onDismiss}
            className="text-white/40 hover:text-white/70 transition-colors mt-0.5 shrink-0"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>

        {/* Emojis */}
        <div className="flex gap-2 justify-between mb-3">
          {CES_OPTIONS.map((opt) => (
            <button
              key={opt.score}
              onClick={() => handleSelect(opt.score)}
              className={cn(
                "flex flex-col items-center gap-1 flex-1 py-2 px-1 rounded-lg border transition-all duration-150",
                selected === opt.score
                  ? "border-[#FFB800] bg-[#FFB800]/10 scale-105"
                  : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
              )}
              title={opt.label}
            >
              <span className="text-xl leading-none">{opt.emoji}</span>
              <span className="text-[10px] text-white/50 hidden sm:block">{opt.label}</span>
            </button>
          ))}
        </div>

        {/* Campo de texto para notas baixas */}
        {showComment && (
          <div className="mb-3 animate-in fade-in slide-in-from-top-2 duration-200">
            <Textarea
              placeholder="O que dificultou? (opcional)"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm resize-none h-16 focus:border-[#FFB800]/50"
              maxLength={500}
            />
          </div>
        )}

        {/* Botão de envio */}
        {selected !== null && (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#FFB800] to-[#FF8A00] text-[#0B0F1A] font-semibold text-sm h-9 animate-in fade-in duration-200"
          >
            {isSubmitting ? "Enviando..." : "Enviar feedback"}
          </Button>
        )}
      </div>
    </div>
  );
}
