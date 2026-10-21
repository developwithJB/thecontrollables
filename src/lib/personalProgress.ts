import { supabase } from "@/integrations/supabase/client";
type ProgressRpcName =
  | "record_personal_action"
  | "record_circle_attendance"
  | "complete_legacy_reset_day"
  | "award_wellness_milestone"
  | "award_legacy_personal_event";
type ProgressClient = {
  rpc(
    name: ProgressRpcName,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: { message: string } | null }>;
};
const client = supabase as unknown as ProgressClient;
export interface PersonalReward {
  id: string;
  xpAwarded: number;
  selfTrustAwarded: number;
  alreadyCompleted: boolean;
}
export async function recordPersonalAction(input: {
  text: string;
  controllable?: string | null;
  kind?: "personal" | "movement" | "planner" | "mission";
}): Promise<PersonalReward> {
  const canonical = [
    "awareness",
    "perspective",
    "habit",
    "wellness",
    "environment",
  ];
  const name = input.controllable?.toLowerCase();
  const { data, error } = await client.rpc("record_personal_action", {
    p_action_text: input.text.trim().slice(0, 1000),
    p_controllable: name && canonical.includes(name) ? name : null,
    p_kind: input.kind || "personal",
  });
  if (error) throw Error(error.message);
  const reward = data as PersonalReward;
  if (
    !reward ||
    typeof reward.id !== "string" ||
    !Number.isFinite(reward.xpAwarded) ||
    reward.xpAwarded < 0 ||
    reward.xpAwarded > 40 ||
    !Number.isFinite(reward.selfTrustAwarded) ||
    reward.selfTrustAwarded < 0 ||
    reward.selfTrustAwarded > 10
  )
    throw Error("Reward could not be verified");
  return reward;
}
export async function completeLegacyResetDay(
  sessionId: string,
  reflection?: string,
) {
  const { data, error } = await client.rpc("complete_legacy_reset_day", {
    p_session_id: sessionId,
    p_reflection: reflection?.slice(0, 4000) || null,
  });
  if (error) throw Error(error.message);
  return data;
}
export async function awardWellnessMilestone() {
  const { data, error } = await client.rpc("award_wellness_milestone", {});
  if (error) throw Error(error.message);
  return data as { amount: number; streak: number };
}

export async function awardLegacyEvent(
  source: "quest_complete" | "integrity_rep" | "time_log",
  recordId: string,
) {
  const { data, error } = await client.rpc("award_legacy_personal_event", {
    p_source: source,
    p_record_id: recordId,
  });
  if (error) throw Error(error.message);
  return data as { amount: number; alreadyAwarded: boolean };
}

export async function recordCircleAttendance(
  challengeId: string,
  resetSessionId: string,
) {
  const { data, error } = await client.rpc("record_circle_attendance", {
    p_challenge_id: challengeId,
    p_reset_session_id: resetSessionId,
  });
  if (error) throw Error(error.message);
  return data as { recorded: boolean; newRecord?: boolean };
}
