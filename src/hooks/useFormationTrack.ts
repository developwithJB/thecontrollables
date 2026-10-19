import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useBookLoopState } from "@/hooks/useBookLoopState";
import { isTrainingTrack, type TrainingTrack } from "@/domain/formation/circuits";
import { supabase } from "@/integrations/supabase/client";
import { updateFormationTrack } from "@/lib/formationEnrollment";
import { isStartableFormationTrack } from "@/lib/formationEnrollmentConfig";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { bookQueryKey } from "@/data/bookLoop/model";
import { toast } from "sonner";

export function useFormationTrack(userId: string) {
  const { state: bookTrack, persist, server } = useBookLoopState("track", userId);
  const client = useQueryClient();
  const mock = isDevMockAuthEnabled();
  const key = ["formation-profile-track", userId];
  const profile = useQuery({
    queryKey: key,
    enabled: !!userId && !mock,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("formation_track").eq("id", userId).maybeSingle();
      if (error) throw error;
      return isTrainingTrack(data?.formation_track) ? data.formation_track : null;
    },
  });
  const track = profile.data ?? bookTrack;
  const setTrack = async (nextTrack: TrainingTrack): Promise<boolean> => {
    if (mock) return persist(() => nextTrack);
    if (!isStartableFormationTrack(nextTrack)) return false;
    try {
      // The authenticated RPC updates enrollment and its book-track mirror atomically.
      await updateFormationTrack(nextTrack);
      client.setQueryData(key, nextTrack);
      if (server) await client.invalidateQueries({ queryKey: bookQueryKey(userId) });
      else await persist(() => nextTrack);
      return true;
    } catch {
      toast.error("Could not change your formation path. Reload and try again.");
      return false;
    }
  };
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
