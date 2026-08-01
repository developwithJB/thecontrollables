import { useEffect, useState } from "react";
import { isTrainingTrack, type TrainingTrack } from "@/domain/formation/circuits";

const DEFAULT_TRACK: TrainingTrack = "read_along";

export function useFormationTrack(userId: string) {
  const storageKey = `formation_selected_track_${userId}`;
  const [track, setTrackState] = useState<TrainingTrack>(() => readTrack(storageKey));

  useEffect(() => {
    setTrackState(readTrack(storageKey));
  }, [storageKey]);

  const setTrack = (nextTrack: TrainingTrack) => {
    setTrackState(nextTrack);
    try {
      localStorage.setItem(storageKey, nextTrack);
    } catch {
      // The in-memory selection remains usable when storage is unavailable.
    }
  };

  return { track, setTrack };
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
