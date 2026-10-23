import { afterEach, expect, it, vi } from "vitest";
import { refreshAllowanceWithin } from "@/hooks/useAllowanceRefresh";
afterEach(() => vi.useRealTimers());
it("bounds a never-settling allowance refresh", async () => {
  vi.useFakeTimers();
  const result = refreshAllowanceWithin(() => new Promise(() => {}));
  await vi.advanceTimersByTimeAsync(5_000);
  expect(await result).toBe(false);
  expect(vi.getTimerCount()).toBe(0);
});
it.each([() => Promise.reject(new Error("offline")), () => { throw new Error("sync failure"); }, () => Promise.resolve({ isError: true })])("handles refresh failures without rejecting", async refetch => {
  expect(await refreshAllowanceWithin(refetch)).toBe(false);
});
it("accepts only a successfully refreshed allowance", async () => {
  expect(await refreshAllowanceWithin(async () => ({ isError: false }))).toBe(true);
});
