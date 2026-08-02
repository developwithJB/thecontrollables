import { useEffect, useState } from "react";
import { isTrainingTrack, type TrainingTrack } from "@/domain/formation/circuits";

const DEFAULT_TRACK: TrainingTrack = "read_along";

export function useFormationTrack(userId: string) {
  const storageKey = getFormationTrackStorageKey(userId);
  const [track, setTrackState] = useState<TrainingTrack>(() => readTrack(storageKey));

  useEffect(() => {
    setTrackState(readTrack(storageKey));
  }, [storageKey]);

  const setTrack = (nextTrack: TrainingTrack) => {
    setTrackState(nextTrack);
    saveFormationTrackSelection(userId, nextTrack);
  };

  return { track, setTrack };
}

export function getFormationTrackStorageKey(userId: string): string {
  return `formation_selected_track_${userId}`;
}

export function saveFormationTrackSelection(userId: string, track: TrainingTrack): void {
  try {
    localStorage.setItem(getFormationTrackStorageKey(userId), track);
  } catch {
    // Callers retain their in-memory selection when storage is unavailable.
  }
}

function readTrack(storageKey: string): TrainingTrack {
  if (typeof window === "undefined") return DEFAULT_TRACK;
  try {
    const value = localStorage.getItem(storageKey);
    return isTrainingTrack(value) ? value : DEFAULT_TRACK;
  } catch {
    return DEFAULT_TRACK;
  }
}
