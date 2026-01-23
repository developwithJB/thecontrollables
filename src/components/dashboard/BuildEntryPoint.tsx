import { useState } from "react";
import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { useBuildAssessment } from "@/hooks/useBuildAssessment";
import { BuildAssessmentModal } from "./BuildAssessmentModal";

interface BuildEntryPointProps {
  compact?: boolean;
}

export function BuildEntryPoint({ compact = false }: BuildEntryPointProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const {
    questions,
    questionsLoading,
    currentBuild,
    submitAssessment,
    isSubmitting,
  } = useBuildAssessment();

  const hasBuild = currentBuild && currentBuild.overall > 0;

  // Only show if user has not completed a build assessment
  if (hasBuild) {
    return null;
  }

  return (
    <>
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
            <p className="text-sm font-medium text-foreground">
              Not sure what to focus on?
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Start here. Take the Build Assessment.
            </p>
          </div>
          <span className="text-xs text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            →
          </span>
        </div>
      </motion.button>

      {/* Assessment Modal */}
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
