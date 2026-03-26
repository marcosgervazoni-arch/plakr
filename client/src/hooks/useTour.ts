/**
 * useTour — controla o ciclo de vida do tour guiado de primeiro acesso.
 *
 * - Verifica se o usuário já viu o tour via trpc.users.me (campo hasSeenTour)
 * - Expõe `shouldShowTour` para o componente OnboardingTour decidir se inicia
 * - Expõe `markTourComplete` para ser chamado ao concluir ou pular
 */
import { useCallback } from "react";
import { trpc } from "@/lib/trpc";

export function useTour() {
  const { data: meData, isLoading } = trpc.users.me.useQuery();
  const utils = trpc.useUtils();
  const completeTourMutation = trpc.users.completeTour.useMutation({
    onSuccess: () => {
      // Atualiza o cache local para não re-exibir o tour
      utils.users.me.invalidate();
    },
  });

  const hasSeenTour = meData?.user?.hasSeenTour ?? true; // default true = não exibir enquanto carrega
  const shouldShowTour = !isLoading && !hasSeenTour;

  const markTourComplete = useCallback(() => {
    completeTourMutation.mutate();
  }, [completeTourMutation]);

  return { shouldShowTour, markTourComplete, isLoading };
}
