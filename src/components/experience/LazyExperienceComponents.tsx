import { lazy, Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

// Lazy load heavy experience components
export const LazyActivityHistory = lazy(() =>
  import("./ActivityHistory").then((m) => ({ default: m.ActivityHistory }))
);

export const LazyBadgesEarned = lazy(() =>
  import("./BadgesEarned").then((m) => ({ default: m.BadgesEarned }))
);

export const LazyCertificates = lazy(() =>
  import("./Certificates").then((m) => ({ default: m.Certificates }))
);

export const LazySnapshotHistory = lazy(() =>
  import("../dashboard/SnapshotHistory").then((m) => ({ default: m.SnapshotHistory }))
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
