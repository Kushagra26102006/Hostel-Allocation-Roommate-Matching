import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6 p-6 md:p-8 max-w-7xl mx-auto w-full animate-in fade-in duration-200">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 rounded-lg" />
          <Skeleton className="h-4 w-96 rounded-md" />
        </div>
        <Skeleton className="h-10 w-28 rounded-ctrl" />
      </div>

      {/* Cards skeleton grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-4">
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
        <Skeleton className="h-44 rounded-card" />
      </div>

      {/* Body skeleton */}
      <div className="rounded-card border border-border/70 p-6 space-y-4 mt-2">
        <Skeleton className="h-6 w-48 rounded-md" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}
