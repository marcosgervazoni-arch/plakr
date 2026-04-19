/**
 * FeedbackModal — CSAT (Customer Satisfaction Score)
 * Aparece como modal leve após momentos de alto valor emocional.
 * Escala: 1=😠 2=😞 3=😐 4=😊 5=🤩
 * Exibe campo de texto opcional quando score ≤ 3.
 */
import { useState } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackModalProps {
  context: string;
  onSubmit: (score: number, comment?: string) => void;
  onDismiss: () => void;
  isSubmitting?: boolean;
}

const CSAT_OPTIONS = [
  { score: 1, emoji: "😠", label: "Péssimo" },
  { score: 2, emoji: "😞", label: "Ruim" },
  { score: 3, emoji: "😐", label: "Regular" },
  { score: 4, emoji: "😊", label: "Bom" },
  { score: 5, emoji: "🤩", label: "Incrível" },
];

const CONTEXT_QUESTIONS: Record<string, string> = {
  pool_ended: "Curtiu o bolão do começo ao fim?",
  game_result: "Valeu acompanhar esse jogo no Plakr!?",
  accept_invite: "Tá gostando do Plakr! até agora?",
  create_pool: "O que achou de criar seu bolão?",
  first_bet: "Curtiu fazer seu primeiro palpite?",
  invite_member: "Foi fácil chamar alguém pro bolão?",
};

export function FeedbackModal({
  context,
  onSubmit,
  onDismiss,
  isSubmitting,
}: FeedbackModalProps) {
  const [selected, setSelected] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [showComment, setShowComment] = useState(false);

  const question = CONTEXT_QUESTIONS[context] ?? "Tá gostando do Plakr!?";

  function handleSelect(score: number) {
    setSelected(score);
    if (score <= 3) {
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
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onDismiss}
      />

      {/* Modal */}
      <div className="fixed bottom-0 left-0 right-0 z-50 sm:bottom-auto sm:top-1/2 sm:left-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:max-w-sm sm:w-full sm:rounded-2xl animate-in slide-in-from-bottom-4 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-300">
        <div className="bg-[#121826] border border-white/10 rounded-t-2xl sm:rounded-2xl p-6 shadow-2xl">
          {/* Handle bar (mobile) */}
          <div className="w-10 h-1 bg-white/20 rounded-full mx-auto mb-5 sm:hidden" />

          {/* Botão fechar */}
          <button
            onClick={onDismiss}
            className="absolute top-4 right-4 text-white/40 hover:text-white/70 transition-colors"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>

          {/* Ícone decorativo */}
          <div className="text-4xl text-center mb-3">🏆</div>

          {/* Pergunta */}
          <h3 className="text-lg font-bold text-white text-center mb-1">
            {question}
          </h3>
          <p className="text-xs text-white/50 text-center mb-5">
            Seu feedback é essencial pra gente
          </p>

          {/* Emojis */}
          <div className="flex gap-2 justify-between mb-4">
            {CSAT_OPTIONS.map((opt) => (
              <button
                key={opt.score}
                onClick={() => handleSelect(opt.score)}
                className={cn(
                  "flex flex-col items-center gap-1 flex-1 py-3 px-1 rounded-xl border transition-all duration-150",
                  selected === opt.score
                    ? "border-[#FFB800] bg-[#FFB800]/10 scale-105"
                    : "border-white/10 bg-white/5 hover:border-white/30 hover:bg-white/10"
                )}
                title={opt.label}
              >
                <span className="text-2xl leading-none">{opt.emoji}</span>
                <span className="text-[10px] text-white/50 hidden sm:block">{opt.label}</span>
              </button>
            ))}
          </div>

          {/* Campo de texto para notas baixas */}
          {showComment && (
            <div className="mb-4 animate-in fade-in slide-in-from-top-2 duration-200">
              <Textarea
                placeholder="O que podemos melhorar? (opcional)"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30 text-sm resize-none h-20 focus:border-[#FFB800]/50"
                maxLength={500}
              />
            </div>
          )}

          {/* Botões */}
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onDismiss}
              className="flex-1 text-white/50 hover:text-white hover:bg-white/5 text-sm h-10"
            >
              Agora não
            </Button>
            {selected !== null && (
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex-1 bg-gradient-to-r from-[#FFB800] to-[#FF8A00] text-[#0B0F1A] font-semibold text-sm h-10 animate-in fade-in duration-200"
              >
                {isSubmitting ? "Enviando..." : "Enviar"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
