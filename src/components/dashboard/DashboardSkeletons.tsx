import { Skeleton } from "@/components/ui/skeleton";

export function MainQuestSkeleton() {
  return (
    <div className="p-6 rounded-2xl bg-card border animate-pulse">
      <div className="flex items-start gap-3 mb-4">
        <Skeleton className="w-9 h-9 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-20 mb-2" />
          <Skeleton className="h-6 w-48" />
        </div>
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-3" />
      <div className="flex justify-between">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

export function ResetProgressSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-card border animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-5 w-24" />
      </div>
      <div className="flex justify-center gap-2 mb-3">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="w-8 h-8 rounded-full" />
        ))}
      </div>
      <Skeleton className="h-9 w-full rounded-lg" />
    </div>
  );
}

export function SmallModuleSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-card border animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-5 w-20" />
      </div>
      <div className="text-center mb-4">
        <Skeleton className="h-10 w-24 mx-auto mb-2" />
        <Skeleton className="h-4 w-16 mx-auto" />
      </div>
      <Skeleton className="h-2 w-full rounded-full mb-4" />
      <Skeleton className="h-4 w-32 mx-auto" />
    </div>
  );
}

export function AIGuideSkeleton() {
  return (
    <div className="p-5 rounded-2xl bg-card border animate-pulse">
      <div className="flex items-center gap-2 mb-4">
        <Skeleton className="w-7 h-7 rounded-lg" />
        <Skeleton className="h-5 w-28" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-10 w-full rounded-lg mt-4" />
      </div>
    </div>
  );
}
