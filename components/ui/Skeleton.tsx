import { SURFACE_CLASS } from "./Card";

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-md bg-ink-900/[0.06] ${className}`} />;
}

export function SkeletonTable({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className={`overflow-hidden ${SURFACE_CLASS}`}>
      <div className="border-b border-ink-900/10 bg-ink-900/[0.03] px-4 py-2.5">
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="divide-y divide-ink-900/5">
        {Array.from({ length: rows }).map((_, r) => (
          <div key={r} className="flex items-center gap-6 px-4 py-3">
            {Array.from({ length: cols }).map((__, c) => (
              <Skeleton key={c} className="h-3 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`px-5 py-4 ${SURFACE_CLASS}`}>
          <Skeleton className="h-3 w-16" />
          <Skeleton className="mt-3 h-6 w-10" />
        </div>
      ))}
    </div>
  );
}
