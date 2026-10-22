import type { HostedAiAllowance } from "@/hooks/useHostedAiAllowance";
import { sanitizeAttributionValue } from "./growthAttribution";

export const NEW_PASSWORD_MIN_LENGTH = 8;
export const CONTROLLABLES_INSTAGRAM_URL =
  "https://www.instagram.com/thecontrollables/";
export const CONTROLLABLES_YOUTUBE_URL = "https://www.youtube.com/@thcontrollables";
export const JB_X_URL = "https://x.com/developwithjb";

/** Campaign parameters are attribution, never destinations or authorization. */
export function readAlongCampaignPath(search: string): string {
  const input = new URLSearchParams(search);
  const output = new URLSearchParams({ path: "read_along" });
  const defaults: Record<string, string> = {
    utm_source: "bio",
    utm_medium: "social",
    utm_campaign: "first100",
  };
  for (const key of [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "ref",
  ]) {
    const value = sanitizeAttributionValue(input.get(key)) ?? defaults[key];
    if (value) output.set(key, value);
  }
  return `/quick-start?${output}`;
}

export function isFreeSampleExhausted(allowance?: HostedAiAllowance): boolean {
  return (
    !!allowance &&
    allowance.enabled === true &&
    allowance.plan === "free" &&
    allowance.byoActive === false &&
    (allowance.repliesRemaining === 0 || allowance.budgetPercentRemaining === 0)
  );
}
