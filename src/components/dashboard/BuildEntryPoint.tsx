import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Compass, X } from "lucide-react";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { BuildAssessmentModal } from "./BuildAssessmentModal";

interface BuildEntryPointProps {
  compact?: boolean;
  userId?: string;
}

export function BuildEntryPoint({ compact = false, userId }: BuildEntryPointProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const dismissKey = useMemo(
    () => (userId ? `build_assessment_cta_dismissed_${userId}` : null),
    [userId],
  );
  const [isDismissed, setIsDismissed] = useState(() =>
    dismissKey ? localStorage.getItem(dismissKey) === "1" : false,
  );

  const { questions, currentBuild, submitAssessment, isSubmitting } = useBuildAssessment();

  const hasBuild = currentBuild && currentBuild.overall > 0;

  // Only show if user has not completed a build assessment
  if (hasBuild || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="relative">
        <motion.button
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onClick={() => setIsModalOpen(true)}
          className="w-full text-left p-4 rounded-xl bg-gradient-to-br from-primary/5 to-accent/5 border border-primary/20 hover:border-primary/40 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
              <Compass className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">Optional: take the full Build assessment</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Use this later for a deeper recommendation. It will not block your daily flow.
              </p>
            </div>
            <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
              →
            </span>
          </div>
        </motion.button>
        <button
          onClick={(event) => {
            event.stopPropagation();
            if (dismissKey) {
              localStorage.setItem(dismissKey, "1");
            }
            setIsDismissed(true);
          }}
          className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50"
          aria-label="Dismiss build assessment card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <BuildAssessmentModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        questions={questions}
        onSubmit={submitAssessment}
        isSubmitting={isSubmitting}
      />
    </>
  );
}
