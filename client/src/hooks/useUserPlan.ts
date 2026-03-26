/**
 * Hook centralizado para acessar o tier do plano do usuário logado.
 * Usa o planTier retornado por auth.me (enriquecido no servidor).
 *
 * Uso:
 *   const { tier, isPro, isUnlimited, isFree } = useUserPlan();
 */
import { trpc } from "@/lib/trpc";

export type PlanTier = "free" | "pro" | "unlimited";

export function useUserPlan() {
  const { data: user } = trpc.auth.me.useQuery();
  const tier: PlanTier = (user as (typeof user & { planTier?: PlanTier }) | null)?.planTier ?? "free";

  return {
    tier,
    isFree: tier === "free",
    isPro: tier === "pro" || tier === "unlimited",
    isUnlimited: tier === "unlimited",
    // No novo modelo, o plano nunca "expira" de forma silenciosa no frontend
    // A expiração é gerenciada pelo webhook do Stripe no servidor
    isProExpired: false,
  };
}
