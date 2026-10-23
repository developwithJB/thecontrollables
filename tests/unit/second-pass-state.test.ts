// @vitest-environment jsdom
import { createElement } from "react";
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { readCoachConversation, useCoachConversation } from "@/hooks/useCoachConversation";
import { clearSignedOutState } from "@/lib/signedOutState";
import { CIRCUIT_TYPES } from "@/domain/formation/circuits";
import { summarizeFormationPractices } from "@/hooks/useFormationPracticeSummary";
const mocks = vi.hoisted(() => ({ from: vi.fn(), update: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from, functions: { invoke: mocks.update } } }));
vi.mock("@/hooks/useOnboarding", () => ({ useOnboarding: () => ({ resetDailyOperatorOnboarding: vi.fn(), isResettingDailyOperatorOnboarding: false }) }));
import { AISettingsCard } from "@/components/settings/AISettingsCard";
function storage(): Storage {
  const values = new Map<string, string>();
  return { get length() { return values.size; }, key: i => [...values.keys()][i] ?? null, getItem: k => values.get(k) ?? null, setItem: (k,v) => { values.set(k,v); }, removeItem: k => { values.delete(k); }, clear: () => values.clear() };
}
beforeEach(() => { vi.clearAllMocks(); vi.stubGlobal("sessionStorage", storage()); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("restores only an explicitly remembered conversation and its selected guide", () => {
  const hook = renderHook(() => useCoachConversation("qa"));
  act(() => { hook.result.current.setMessages([{ role: "user", content: "Synthetic question" }]); hook.result.current.setGuide("awareness"); });
  expect(sessionStorage.length).toBe(0);
  act(() => hook.result.current.setRemember(true));
  hook.unmount();
  const restored = renderHook(() => useCoachConversation("qa"));
  expect(restored.result.current.messages).toEqual([{ role: "user", content: "Synthetic question" }]);
  expect(restored.result.current.guide).toBe("awareness");
  act(() => restored.result.current.setRemember(false));
  expect(sessionStorage.length).toBe(0);
});
it("isolates accounts, expires tab caches, rejects malformed content and clears on signout", () => {
  const store = storage(); const now = Date.now();
  const value = { version: 1, owner: "qa", savedAt: now, guide: "awareness", messages: [{ role: "user", content: "Private synthetic" }] };
  store.setItem("coach-conversation:qa", JSON.stringify(value));
  expect(readCoachConversation("other", store, now).messages).toEqual([]);
  expect(readCoachConversation("qa", store, now + 86400000).messages).toEqual([]);
  store.setItem("coach-conversation:qa", JSON.stringify({ ...value, messages: [{ role: "system", content: "invalid" }] }));
  expect(readCoachConversation("qa", store, now).messages).toEqual([]);
  store.setItem("coach-conversation:qa", JSON.stringify(value));
  clearSignedOutState("qa", [store]); expect(store.length).toBe(0);
});
it("does not combine partial dates or tracks into an all-five day, and honors the latest saved row", () => {
  const rows = CIRCUIT_TYPES.map(circuit => ({ userId: "qa", track: "read_along" as const, localDate: "2026-10-23", circuit, updatedAt: "2026-10-23T01:00:00Z", completedActionIds: [], completionState: "recorded" as const }));
  expect(summarizeFormationPractices(rows).completeDays).toBe(1);
  expect(summarizeFormationPractices(rows.map((r,i) => ({ ...r, localDate: i ? r.localDate : "2026-10-22" }))).completeDays).toBe(0);
  expect(summarizeFormationPractices(rows.map((r,i) => ({ ...r, track: i ? r.track : "charge_40" }))).completeDays).toBe(0);
  expect(summarizeFormationPractices([...rows, { ...rows[0], updatedAt: "2026-10-23T02:00:00Z", completionState: "not_started" }]).completeDays).toBe(0);
});
it("disables unavailable consents and does not repeatedly query missing memory tables", async () => {
  mocks.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: { code: "PGRST205", message: "missing table" } }) }) }) });
  const client = new QueryClient();
  render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(AISettingsCard, { userId: "qa" }))));
  await screen.findByText(/AI privacy settings are unavailable/);
  expect(screen.getAllByRole("switch").every(s => s.hasAttribute("disabled"))).toBe(true);
  expect(mocks.from).toHaveBeenCalledTimes(1);
  expect(mocks.from).toHaveBeenCalledWith("ai_consents");
  fireEvent.click(screen.getByRole("button", { name: "Operator Memory (0)" }));
  await screen.findByText(/Memory could not be loaded/);
  expect(mocks.from).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Retry privacy settings" }));
  await waitFor(() => expect(mocks.from).toHaveBeenCalledTimes(2));
  expect(mocks.update).not.toHaveBeenCalled();
  client.clear();
});
