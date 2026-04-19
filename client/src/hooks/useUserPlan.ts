/**
 * Hook centralizado para acessar o tier do plano do usuário logado.
 * Usa o planTier retornado por auth.me (enriquecido no servidor).
 *
 * Uso:
 *   const { tier, isPro, isUnlimited, isFree, isVip, isParticipantVip } = useUserPlan();
 */
import { trpc } from "@/lib/trpc";

export type PlanTier = "free" | "pro" | "unlimited" | "vip";

export function useUserPlan() {
  const { data: user } = trpc.auth.me.useQuery();
  const tier: PlanTier = (user as (typeof user & { planTier?: PlanTier }) | null)?.planTier ?? "free";

  // isVip: usuário tem o VIP do participante (R$4,90/mês)
  const isVip = tier === "vip";
  // isParticipantVip: qualquer tier que dá privilégios VIP de participante
  // (pro e unlimited também incluem os benefícios do VIP)
  const isParticipantVip = tier === "vip" || tier === "pro" || tier === "unlimited";

  return {
    tier,
    isFree: tier === "free",
    isPro: tier === "pro" || tier === "unlimited",
    isUnlimited: tier === "unlimited",
    isVip,
    isParticipantVip,
    // No novo modelo, o plano nunca "expira" de forma silenciosa no frontend
    // A expiração é gerenciada pelo webhook do Stripe no servidor
    isProExpired: false,
  };
}
