/**
 * OnboardingChecklist — Guia de configuração inicial do bolão
 * Aparece no Dashboard do organizador enquanto há etapas pendentes e não foi dispensado.
 * Etapas: Aparência, Acesso e Convite, Taxa de Inscrição (Pro)
 */
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { CheckCircle2, Circle, ChevronRight, X, Palette, Link2, DollarSign, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface OnboardingChecklistProps {
  poolId: number;
  slug: string;
  isPro: boolean;
}

interface Step {
  key: string;
  label: string;
  description: string;
  href: string;
  icon: React.ElementType;
  done: boolean;
  proOnly?: boolean;
}

export default function OnboardingChecklist({ poolId, slug, isPro }: OnboardingChecklistProps) {
  const utils = trpc.useUtils();

  const { data, isLoading } = trpc.pools.getOnboardingStatus.useQuery(
    { poolId },
    { enabled: !!poolId }
  );

  const dismissMutation = trpc.pools.dismissOnboarding.useMutation({
    onSuccess: () => {
      utils.pools.getOnboardingStatus.invalidate({ poolId });
      toast.success("Checklist dispensado. Você pode acessar as configurações pelo menu lateral.");
    },
    onError: (err) => toast.error(err.message || "Erro ao dispensar checklist."),
  });

  if (isLoading || !data) return null;

  // Não exibir se dispensado ou se todas as etapas estiverem concluídas
  if (data.dismissed || data.allDone) return null;

  const steps: Step[] = [
    {
      key: "appearance",
      label: "Personalize a aparência",
      description: "Adicione um logo e uma descrição para o seu bolão.",
      href: `/pool/${slug}/manage/identity`,
      icon: Palette,
      done: data.steps.appearance,
    },
    {
      key: "access",
      label: "Configure o acesso e convite",
      description: "Defina se o bolão é público ou privado e compartilhe o link.",
      href: `/pool/${slug}/manage/access`,
      icon: Link2,
      done: data.steps.access,
    },
    {
      key: "entryFee",
      label: "Configure a taxa de inscrição",
      description: isPro
        ? "Defina um valor de entrada via PIX para os participantes."
        : "Disponível no Plano Pro — cobranças de entrada via PIX.",
      href: `/pool/${slug}/manage/entry-fee`,
      icon: DollarSign,
      done: data.steps.entryFee,
      proOnly: true,
    },
  ];

  const completedCount = steps.filter((s) => s.done).length;
  const totalCount = steps.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div className="bg-card border border-primary/20 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/20 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div>
            <p className="font-semibold text-sm">Configure seu bolão</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {completedCount} de {totalCount} etapas concluídas
            </p>
          </div>
        </div>
        <button
          onClick={() => dismissMutation.mutate({ poolId })}
          disabled={dismissMutation.isPending}
          className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted/40"
          title="Dispensar checklist"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-muted/30">
        <div
          className="h-full bg-primary transition-all duration-500"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Steps */}
      <div className="divide-y divide-border/10">
        {steps.map((step) => {
          const Icon = step.icon;
          const isLocked = step.proOnly && !isPro;

          return (
            <Link key={step.key} href={isLocked ? `/pool/${slug}/manage/entry-fee` : step.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-5 py-3.5 transition-colors",
                  step.done
                    ? "opacity-60"
                    : isLocked
                    ? "opacity-50 cursor-default"
                    : "hover:bg-muted/20 cursor-pointer"
                )}
              >
                {/* Status icon */}
                {step.done ? (
                  <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                ) : (
                  <Circle className="w-5 h-5 text-muted-foreground/40 shrink-0" />
                )}

                {/* Step icon */}
                <div
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                    step.done ? "bg-primary/10" : "bg-muted/30"
                  )}
                >
                  <Icon className={cn("w-4 h-4", step.done ? "text-primary" : "text-muted-foreground")} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", step.done && "line-through text-muted-foreground")}>
                    {step.label}
                    {isLocked && (
                      <span className="ml-2 text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-normal">
                        Pro
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{step.description}</p>
                </div>

                {/* Arrow */}
                {!step.done && (
                  <ChevronRight className="w-4 h-4 text-muted-foreground/40 shrink-0" />
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* Footer CTA */}
      <div className="px-5 py-3 border-t border-border/10 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Você pode dispensar este guia a qualquer momento.
        </p>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground h-7"
          onClick={() => dismissMutation.mutate({ poolId })}
          disabled={dismissMutation.isPending}
        >
          Dispensar
        </Button>
      </div>
    </div>
  );
}
