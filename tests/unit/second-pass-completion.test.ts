// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { FirstWeekPanel } from "@/components/formation/FirstWeekPanel";
import { FreemiumPlans } from "@/components/billing/FreemiumPlans";
import { CIRCUIT_TYPES, createEmptyCircuitDraft, type FormationCircuitEntry } from "@/domain/formation/circuits";
vi.mock("@/components/AIChat", () => ({ AIChat: () => null }));
beforeEach(() => { const values = new Map<string, string>(); vi.stubGlobal("localStorage", { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value) }); });
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
const actions = ["scripture_opened", "prayer_practiced", "main_promise_completed", "sleep_preparation", "service_completed"];
const history = CIRCUIT_TYPES.map((circuit, i) => ({
  id: circuit, userId: "qa", track: "read_along", localDate: "2026-10-23", circuit,
  completionState: "recorded", completedActionIds: [], // Server-shaped non-strict row.
  draft: { ...createEmptyCircuitDraft(), actions: { [actions[i]]: true } },
  updatedAt: "2026-10-23T12:00:00Z",
})) as FormationCircuitEntry[];
it("makes Close today visibly change the receipt without granting rewards", () => {
  render(createElement(MemoryRouter, null, createElement(FirstWeekPanel, {
    history, userId: "qa", track: "read_along", journey: null, today: "2026-10-23", nextCircuit: null, canPractice: true,
  })));
  fireEvent.click(screen.getByRole("button", { name: "Close today" }));
  expect(screen.getByRole("heading", { name: "Today closed" })).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("Saved on this browser");
  expect(screen.queryByText(/XP awarded|streak earned/i)).toBeNull();
});
it("billing's free action returns to practice instead of signup or its own plan page", () => {
  const checkout = vi.fn();
  render(createElement(MemoryRouter, null, createElement(FreemiumPlans, { onCheckout: checkout })));
  expect(screen.getByRole("link", { name: "Return to Today" }).getAttribute("href")).toBe("/formation/today");
  fireEvent.click(screen.getByRole("button", { name: "Choose Pro — annual" }));
  expect(checkout).toHaveBeenLastCalledWith("year");
  fireEvent.click(screen.getByRole("radio", { name: "Monthly" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose Pro — monthly" }));
  expect(checkout).toHaveBeenLastCalledWith("month");
  expect(screen.getByRole("link", { name: "Set up my provider" }).getAttribute("href")).toBe("/billing#coach-settings");
});
