import { describe, it, expect } from "vitest";
import { validFormationSchedulerToken, isFormationSchedulerPayload } from "../../supabase/functions/_shared/formation-scheduler-auth";
const secret = "a".repeat(64);
describe("scoped formation scheduler credentials", () => {
  it("fails closed when unset, malformed, missing, or incorrect", () => {
    for (const [provided, expected] of [[null,secret],[secret,undefined],[secret,"short"],["a".repeat(63),secret],["b".repeat(64),secret],["a".repeat(63)+"b",secret],["A".repeat(64),secret]] as const) expect(validFormationSchedulerToken(provided,expected)).toBe(false);
    expect(validFormationSchedulerToken(secret, secret)).toBe(true);
  });
  it("accepts only the ordinary scheduled run and a non-sending health probe", () => {
    expect(isFormationSchedulerPayload({ scheduled:true })).toBe(true);
    expect(isFormationSchedulerPayload({ schedulerHealthCheck:true })).toBe(true);
    for (const value of [null,[],{},"scheduled",{ scheduled:false },{ scheduled:true, forceSend:true },{ scheduled:true, targetUserId:"someone" },{ scheduled:true, testMode:true },{ schedulerHealthCheck:true, scheduled:true },{ forceSend:true }]) expect(isFormationSchedulerPayload(value)).toBe(false);
  });
});
