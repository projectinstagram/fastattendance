import { SkeletonCards, SkeletonTable, Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-ink-900/10 bg-white">
        <div className="mx-auto max-w-6xl px-6 py-4">
          <Skeleton className="h-6 w-40" />
        </div>
      </div>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="mt-3 h-4 w-40" />

        <div className="mt-8">
          <SkeletonCards />
        </div>

        <div className="mt-10">
          <Skeleton className="mb-3 h-5 w-32" />
          <SkeletonTable rows={4} cols={3} />
        </div>
      </main>
    </div>
  );
}
