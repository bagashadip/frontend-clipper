"use client";

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800 ${className}`}
    />
  );
}

export function SidebarProjectSkeleton() {
  return (
    <div className="py-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          className="px-4 py-3 border-b border-white/[0.03] border-l-2 border-l-transparent"
        >
          <div className="flex items-start gap-2">
            <Skeleton className="w-3.5 h-3.5 rounded-full shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0 space-y-2">
              <Skeleton className="h-4 w-3/4" />
              <div className="flex items-center gap-2">
                <Skeleton className="h-3 w-10" />
                <Skeleton className="h-3 w-14" />
              </div>
              <Skeleton className="h-2.5 w-20" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ProjectDetailSkeleton() {
  return (
    <div className="px-6 py-8 space-y-8 animate-pulse">
      {/* Progress bar skeleton */}
      <div className="w-full max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-between mb-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <Skeleton className="w-10 h-10 rounded-full" />
                <Skeleton className="mt-2 h-3 w-16" />
              </div>
              {i < 3 && <Skeleton className="h-0.5 flex-1 mx-2" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ClipGridSkeleton() {
  return (
    <div className="w-full max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-7 w-40" />
        <Skeleton className="h-5 w-8" />
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden"
          >
            <Skeleton className="aspect-[9/16] rounded-none" />
            <div className="p-4 space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-16" />
                <div className="flex items-center gap-2">
                  <Skeleton className="h-8 w-14 rounded-lg" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
