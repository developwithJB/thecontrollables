import { useBookLoopState } from "@/hooks/useBookLoopState";
import { useCallback, useMemo } from "react";
import {
  completeReadAlongRep,
  completeReadAlongSection,
  createReadAlongProgress,
  getInitialSectionForReadingStatus,
  getReadAlongProgressPercent,
  getVisibleReadAlongSections,
  type ReadAlongSectionId,
  type ReadingStatus,
} from "@/lib/readAlong";

export function useReadAlongProgress(userId: string | null | undefined) {
  const { state: progress, persist } = useBookLoopState("reading", userId);

  const setReadingStatus = useCallback(
    (status: ReadingStatus) => {
      return persist((current) =>
        createReadAlongProgress({
          ...current,
          status,
          currentSectionId:
            current.status === status
              ? current.currentSectionId
              : getInitialSectionForReadingStatus(status),
        }),
      );
    },
    [persist],
  );

  const markSectionComplete = useCallback(
    (sectionId: ReadAlongSectionId) => {
      return persist((current) => completeReadAlongSection(current, sectionId));
    },
    [persist],
  );

  const markRepComplete = useCallback(
    (sectionId: ReadAlongSectionId) => {
      return persist((current) => completeReadAlongRep(current, sectionId));
    },
    [persist],
  );

  return {
    progress,
    visibleSections: useMemo(() => getVisibleReadAlongSections(progress), [progress]),
    progressPercent: useMemo(() => getReadAlongProgressPercent(progress), [progress]),
    setReadingStatus,
    markSectionComplete,
    markRepComplete,
  };
}
