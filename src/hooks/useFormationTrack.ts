import { useEffect, useState } from "react";
import { isTrainingTrack, type TrainingTrack } from "@/domain/formation/circuits";
import { supabase } from "@/integrations/supabase/client";
import { updateFormationTrack } from "@/lib/formationEnrollment";

const DEFAULT_TRACK: TrainingTrack = "read_along";

export function useFormationTrack(userId: string) {
  const storageKey = getFormationTrackStorageKey(userId);
  const [track, setTrackState] = useState<TrainingTrack>(() => readTrack(storageKey));

  useEffect(() => {
    const localTrack = readTrack(storageKey);
    setTrackState(localTrack);
    let active = true;

    void supabase
      .from("profiles")
      .select("formation_track")
      .eq("id", userId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (!active || error) return;
        if (isTrainingTrack(data?.formation_track)) {
          setTrackState(data.formation_track);
          saveFormationTrackSelection(userId, data.formation_track);
          return;
        }
        void updateFormationTrack(localTrack).catch((syncError) => {
          console.warn("Existing formation path could not be synchronized:", syncError);
        });
      });

    return () => {
      active = false;
    };
  }, [storageKey, userId]);

  const setTrack = (nextTrack: TrainingTrack) => {
    setTrackState(nextTrack);
    saveFormationTrackSelection(userId, nextTrack);
    void updateFormationTrack(nextTrack).catch((error) => {
      console.warn("Formation path could not be synchronized:", error);
    });
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
