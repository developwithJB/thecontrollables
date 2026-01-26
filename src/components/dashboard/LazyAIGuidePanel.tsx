import { lazy, Suspense, forwardRef } from "react";
import { AIGuideSkeleton } from "./DashboardSkeletons";
import type { AIGuidePanelHandle } from "./AIGuidePanel";

// Lazy load AIGuidePanel - it's heavy with all the guide logic
export const LazyAIGuidePanel = lazy(() =>
  import("./AIGuidePanel").then((m) => ({ default: m.AIGuidePanel }))
);

// Props type for the lazy component
interface LazyAIGuidePanelWrapperProps {
  activeQuest: { title: string; duration_days: number } | null;
  totalXp: number;
  integrityScore: number | null;
  currentBuild?: any;
  onXpEarned?: () => void;
  isPaid?: boolean;
  onUpgrade?: () => void;
  isCheckingOut?: boolean;
  hasActiveSnapshot?: boolean;
}

export const LazyAIGuidePanelWrapper = forwardRef<AIGuidePanelHandle, LazyAIGuidePanelWrapperProps>(
  function LazyAIGuidePanelWrapper(props, ref) {
    return (
      <Suspense fallback={<AIGuideSkeleton />}>
        <LazyAIGuidePanel ref={ref} {...props} />
      </Suspense>
    );
  }
);
