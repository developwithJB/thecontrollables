import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy experience components
export const LazyProgressHistory = lazy(() =>
  import("./ProgressHistory").then((m) => ({ default: m.ProgressHistory }))
);

export const LazyMomentumDecay = lazy(() =>
  import("./MomentumDecay").then((m) => ({ default: m.MomentumDecay }))
);

export const LazyBadgesEarned = lazy(() =>
  import("./BadgesEarned").then((m) => ({ default: m.BadgesEarned }))
);

export const LazyResetHistory = lazy(() =>
  import("./ResetHistory").then((m) => ({ default: m.ResetHistory }))
);

// Loading skeleton for experience components
export function ExperienceLoadingSkeleton() {
  return (
    <div className="rounded-2xl border bg-card/50 p-4 space-y-3">
      <div className="flex items-center gap-3">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <Skeleton className="h-20 w-full rounded-xl" />
    </div>
  );
}

// Wrapper with suspense
export function SuspenseExperienceComponent({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense fallback={<ExperienceLoadingSkeleton />}>
      {children}
    </Suspense>
  );
}
