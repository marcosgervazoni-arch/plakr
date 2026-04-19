import { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

export type FeedbackType = "ces" | "csat";
export type FeedbackContext =
  | "create_pool"
  | "first_bet"
  | "invite_member"
  | "accept_invite"
  | "pool_ended"
  | "game_result";

interface FeedbackState {
  type: FeedbackType;
  context: FeedbackContext;
  poolId?: number;
  visible: boolean;
}

// Chave de localStorage para janela de silêncio local (complementa a do servidor)
const SILENCE_KEY = "plakr_feedback_silence";
const SILENCE_DAYS = 30;

function getSilenceMap(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(SILENCE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function setSilence(type: FeedbackType, context: FeedbackContext) {
  const map = getSilenceMap();
  map[`${type}:${context}`] = Date.now();
  localStorage.setItem(SILENCE_KEY, JSON.stringify(map));
}

function isInSilence(type: FeedbackType, context: FeedbackContext): boolean {
  const map = getSilenceMap();
  const ts = map[`${type}:${context}`];
  if (!ts) return false;
  const diffDays = (Date.now() - ts) / (1000 * 60 * 60 * 24);
  return diffDays < SILENCE_DAYS;
}

export function useFeedback() {
  const [state, setState] = useState<FeedbackState | null>(null);

  const submitMutation = trpc.feedback.submit.useMutation({
    onSuccess: (data) => {
      if (data.saved) {
        // Feedback salvo com sucesso — silêncio local
        if (state) {
          setSilence(state.type, state.context);
        }
      }
    },
    onError: () => {
      // Falha silenciosa — não interromper o usuário
    },
  });

  /**
   * Solicita exibição de um feedback.
   * Respeita janela de silêncio local (30 dias).
   * CES tem prioridade sobre CSAT (não exibe os dois ao mesmo tempo).
   */
  const requestFeedback = useCallback(
    (type: FeedbackType, context: FeedbackContext, poolId?: number) => {
      // Já tem um feedback visível? Não sobrepor.
      if (state?.visible) return;
      // Janela de silêncio local
      if (isInSilence(type, context)) return;
      setState({ type, context, poolId, visible: true });
    },
    [state]
  );

  const dismiss = useCallback(() => {
    if (state) {
      // Marcar silêncio mesmo ao fechar sem responder (evitar spam)
      setSilence(state.type, state.context);
    }
    setState(null);
  }, [state]);

  const submit = useCallback(
    async (score: number, comment?: string) => {
      if (!state) return;
      setSilence(state.type, state.context);
      setState(null);
      await submitMutation.mutateAsync({
        type: state.type,
        context: state.context,
        score,
        comment,
        poolId: state.poolId,
      });
    },
    [state, submitMutation]
  );

  return {
    feedback: state,
    requestFeedback,
    dismiss,
    submit,
    isSubmitting: submitMutation.isPending,
  };
}
