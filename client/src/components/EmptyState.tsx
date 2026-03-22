import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = "",
}: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-16 px-6 text-center ${className}`}>
      <div className="w-16 h-16 rounded-2xl bg-[var(--surface-2)] flex items-center justify-center mb-5 border border-[var(--border)]">
        <Icon className="w-8 h-8 text-[var(--muted)]" />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text)] mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] max-w-xs leading-relaxed mb-6">{description}</p>
      {(actionLabel || secondaryLabel) && (
        <div className="flex gap-3 flex-wrap justify-center">
          {actionLabel && onAction && (
            <Button onClick={onAction} className="bg-[var(--brand)] text-black hover:bg-[var(--brand-dark)] font-semibold">
              {actionLabel}
            </Button>
          )}
          {secondaryLabel && onSecondary && (
            <Button variant="outline" onClick={onSecondary} className="border-[var(--border)] text-[var(--text)]">
              {secondaryLabel}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
