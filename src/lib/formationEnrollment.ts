import { supabase } from "@/integrations/supabase/client";
import type { TrainingTrack } from "@/domain/formation/circuits";
import { getDeviceTimezone, type FormationEnrollmentInput } from "@/lib/formationEnrollmentConfig";

export async function activateFormationEnrollment(input: FormationEnrollmentInput): Promise<void> {
  const { error } = await supabase.rpc("activate_formation_path", {
    p_track: input.track,
    p_email_enabled: input.dailyEmailEnabled,
    p_timezone: input.timezone,
  });

  if (error) throw error;
}

export async function updateFormationTrack(track: TrainingTrack, timezone = getDeviceTimezone()): Promise<void> {
  const { error } = await supabase.rpc("activate_formation_path", {
    p_track: track,
    p_email_enabled: null,
    p_timezone: timezone,
  });

  if (error) throw error;
}
