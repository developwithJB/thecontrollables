import { supabase } from "@/integrations/supabase/client";
export const COACH_SETTINGS_COLUMNS =
  "user_id,provider,base_url,model,persona_tone,depth,last4,updated_at" as const;
export type CoachSettings = {
  user_id: string;
  provider: string;
  base_url: string | null;
  model: string;
  persona_tone: string;
  depth: string;
  last4: string | null;
  updated_at: string;
};
async function requireOwner(userId: string) {
  const { data, error } = await supabase.auth.getUser();
  if (error || data.user?.id !== userId)
    throw new Error("coach_session_changed");
}
export async function loadCoachSettings(userId: string) {
  await requireOwner(userId);
  const { data: enabled, error: flagError } = await supabase.rpc(
    "coach_providers_available",
  );
  if (flagError || enabled !== true) return { enabled: false, settings: null };
  const { data, error } = await supabase
    .from("coach_provider_settings")
    .select(COACH_SETTINGS_COLUMNS)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("coach_settings_unavailable");
  return { enabled: true, settings: data as CoachSettings | null };
}
export async function saveCoachKey(
  userId: string,
  input: { provider: string; key: string; baseUrl: string; model: string },
) {
  await requireOwner(userId);
  const { error } = await supabase.rpc("set_coach_api_key", {
    p_provider: input.provider,
    p_key: input.key,
    p_base_url: input.baseUrl,
    p_model: input.model,
  });
  if (error) throw new Error("coach_key_save_failed");
}
export async function saveCoachPreferences(
  userId: string,
  model: string,
  tone: string,
  depth: string,
) {
  await requireOwner(userId);
  const { error } = await supabase.rpc("save_coach_preferences", {
    p_model: model,
    p_tone: tone,
    p_depth: depth,
  });
  if (error) throw new Error("coach_preferences_save_failed");
}
export async function removeCoachKey(userId: string) {
  await requireOwner(userId);
  const { error } = await supabase.rpc("clear_coach_api_key");
  if (error) throw new Error("coach_key_remove_failed");
}

export async function loadHostedCoachStatus(userId: string) {
  await requireOwner(userId);
  const { data, error } = await supabase.rpc("get_hosted_coach_status");
  if (error || !data || typeof data !== "object" || Array.isArray(data))
    throw new Error("hosted_coach_status_unavailable");
  return {
    enabled: data.enabled === true,
    entitled: data.entitled === true,
    selected: data.selected === true,
  };
}
export async function selectHostedCoach(userId: string, selected: boolean) {
  await requireOwner(userId);
  const { error } = await supabase.rpc("select_hosted_coach", {
    p_selected: selected,
  });
  if (error) throw new Error("hosted_coach_selection_failed");
}
