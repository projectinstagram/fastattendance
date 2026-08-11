import { SkeletonTable, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-ink-900/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Skeleton className="h-6 w-40" />
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 py-10">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="mt-3 h-4 w-64" />
        <Skeleton className="mt-6 h-10 w-48" />

        <div className="mt-10 grid gap-6 sm:grid-cols-[200px_1fr]">
          <Skeleton className="h-32 rounded-sm" />
          <SkeletonTable rows={4} cols={3} />
        </div>
      </main>
    </div>
  );
}
