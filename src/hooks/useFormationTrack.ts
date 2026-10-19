import { useBookLoopState } from "@/hooks/useBookLoopState";
import { type TrainingTrack } from "@/domain/formation/circuits";

export function useFormationTrack(userId: string) {
  const { state: track, persist } = useBookLoopState("track", userId);
  const setTrack = (nextTrack: TrainingTrack) => persist(() => nextTrack);

  return { track, setTrack };
}

export function getFormationTrackStorageKey(userId: string): string {
  return `formation_selected_track_${userId}`;
}

// Auth uses this only to stage the onboarding choice before the signed-in import
// decision. Interactive track changes use the server-aware hook above.
export function saveFormationTrackSelection(userId: string, track: TrainingTrack): void {
  try {
    localStorage.setItem(getFormationTrackStorageKey(userId), track);
  } catch {
    // Callers retain their in-memory selection when storage is unavailable.
  }
}
