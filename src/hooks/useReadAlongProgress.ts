import { useCallback, useEffect, useMemo, useState } from "react";
import {
  completeReadAlongRep,
  completeReadAlongSection,
  createReadAlongProgress,
  getInitialSectionForReadingStatus,
  getReadAlongProgressPercent,
  getReadAlongStorageKey,
  getVisibleReadAlongSections,
  normalizeReadAlongProgress,
  type ReadAlongProgress,
  type ReadAlongSectionId,
  type ReadingStatus,
} from "@/lib/readAlong";

export function useReadAlongProgress(userId: string | null | undefined) {
  const storageKey = useMemo(() => getReadAlongStorageKey(userId), [userId]);
  const [progress, setProgress] = useState<ReadAlongProgress>(() => readProgress(storageKey));

  useEffect(() => {
    setProgress(readProgress(storageKey));
  }, [storageKey]);

  const persist = useCallback(
    (updater: (current: ReadAlongProgress) => ReadAlongProgress) => {
      setProgress((current) => {
        const next = updater(current);
        writeProgress(storageKey, next);
        return next;
      });
    },
    [storageKey],
  );

  const setReadingStatus = useCallback(
    (status: ReadingStatus) => {
      persist((current) =>
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
      persist((current) => completeReadAlongSection(current, sectionId));
    },
    [persist],
  );

  const markRepComplete = useCallback(
    (sectionId: ReadAlongSectionId) => {
      persist((current) => completeReadAlongRep(current, sectionId));
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

function readProgress(storageKey: string): ReadAlongProgress {
  if (typeof window === "undefined") return createReadAlongProgress();

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return createReadAlongProgress();
    return normalizeReadAlongProgress(JSON.parse(raw));
  } catch {
    return createReadAlongProgress();
  }
}

function writeProgress(storageKey: string, progress: ReadAlongProgress) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(storageKey, JSON.stringify(progress));
  } catch {
    // Local storage can be unavailable in restricted browsers.
  }
}
