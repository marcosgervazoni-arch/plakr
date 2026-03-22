import { Skeleton } from "@/components/ui/skeleton";

export function CardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg bg-[var(--surface-2)]" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-2/3 bg-[var(--surface-2)]" />
          <Skeleton className="h-3 w-1/3 bg-[var(--surface-2)]" />
        </div>
      </div>
      <Skeleton className="h-3 w-full bg-[var(--surface-2)]" />
      <Skeleton className="h-3 w-4/5 bg-[var(--surface-2)]" />
    </div>
  );
}

export function PoolCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl bg-[var(--surface-2)]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-32 bg-[var(--surface-2)]" />
            <Skeleton className="h-3 w-20 bg-[var(--surface-2)]" />
          </div>
        </div>
        <Skeleton className="h-6 w-16 rounded-full bg-[var(--surface-2)]" />
      </div>
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map(i => (
          <div key={i} className="space-y-1">
            <Skeleton className="h-5 w-8 bg-[var(--surface-2)]" />
            <Skeleton className="h-3 w-12 bg-[var(--surface-2)]" />
          </div>
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-lg bg-[var(--surface-2)]" />
    </div>
  );
}

export function GameCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-full bg-[var(--surface-2)]" />
          <Skeleton className="h-4 w-20 bg-[var(--surface-2)]" />
        </div>
        <Skeleton className="h-8 w-16 rounded-lg bg-[var(--surface-2)]" />
        <div className="flex-1 flex items-center justify-end gap-2">
          <Skeleton className="h-4 w-20 bg-[var(--surface-2)]" />
          <Skeleton className="h-8 w-8 rounded-full bg-[var(--surface-2)]" />
        </div>
      </div>
    </div>
  );
}

export function RankingRowSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3 px-4">
      <Skeleton className="h-6 w-6 rounded bg-[var(--surface-2)]" />
      <Skeleton className="h-8 w-8 rounded-full bg-[var(--surface-2)]" />
      <Skeleton className="h-4 w-32 bg-[var(--surface-2)]" />
      <div className="ml-auto flex gap-4">
        <Skeleton className="h-4 w-10 bg-[var(--surface-2)]" />
        <Skeleton className="h-4 w-10 bg-[var(--surface-2)]" />
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 space-y-2">
      <Skeleton className="h-3 w-20 bg-[var(--surface-2)]" />
      <Skeleton className="h-8 w-16 bg-[var(--surface-2)]" />
      <Skeleton className="h-3 w-24 bg-[var(--surface-2)]" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[0, 1, 2, 3].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[0, 1, 2, 3, 4, 5].map(i => <PoolCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

export function PoolPageSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-xl bg-[var(--surface-2)]" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48 bg-[var(--surface-2)]" />
          <Skeleton className="h-4 w-32 bg-[var(--surface-2)]" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        {[0, 1, 2].map(i => <StatCardSkeleton key={i} />)}
      </div>
      <div className="space-y-3">
        {[0, 1, 2, 3].map(i => <GameCardSkeleton key={i} />)}
      </div>
    </div>
  );
}
