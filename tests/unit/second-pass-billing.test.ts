// @vitest-environment jsdom
import { createElement } from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ checkout: vi.fn(), scrolled: [] as string[] }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  getSession: async () => ({ data: { session: { user: { id: "qa", email: "qa@example.test" } } } }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
} } }));
vi.mock("@/hooks/useEntitlements", () => ({ useEntitlements: () => ({ isPaid: false, legacyAppAccess: false, isLoading: false, planTier: "free", initiateCheckout: mocks.checkout }), getPricing: () => ({}) }));
vi.mock("@/hooks/useHostedAiAllowance", () => ({ useHostedAiAllowance: () => ({ data: undefined, isError: false }) }));
vi.mock("@/components/settings/CoachSettingsCard", () => ({ CoachSettingsCard: () => null }));
vi.mock("@/data/coach/coachSettings", () => ({ loadHostedCoachStatus: async () => ({ enabled: true, entitled: false, selected: false }), selectHostedCoach: vi.fn() }));
import BillingPage from "@/pages/account/BillingPage";
import { HostedCoachCard } from "@/components/settings/HostedCoachCard";
beforeEach(() => {
  vi.clearAllMocks(); mocks.scrolled = [];
  Element.prototype.scrollIntoView = vi.fn(function (this: HTMLElement) { mocks.scrolled.push(this.id); });
});
afterEach(cleanup);
function mount(hash: string) {
  const client = new QueryClient();
  render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, { initialEntries: [`/billing${hash}`] }, createElement(BillingPage))));
}
it.each(["plans", "coach-settings"])("Billing navigates to #%s after its authenticated view loads", async section => {
  mount(`#${section}`);
  await screen.findByRole("heading", { name: "Billing & Subscription" });
  await waitFor(() => expect(mocks.scrolled).toContain(section));
});
it("Billing's actual Pro button opens the selected interval through the existing checkout handler", async () => {
  mount("");
  await screen.findByRole("heading", { name: "Billing & Subscription" });
  fireEvent.click(screen.getByRole("radio", { name: "Monthly" }));
  fireEvent.click(screen.getByRole("button", { name: "Choose Pro — monthly" }));
  expect(mocks.checkout).toHaveBeenCalledWith("pro", expect.objectContaining({ interval: "month", source: "billing_freemium" }));
  expect(screen.getByRole("link", { name: "Open provider settings" }).getAttribute("href")).toBe("/billing#coach-settings");
  expect(screen.getByRole("link", { name: "Return to Today" }).getAttribute("href")).toBe("/formation/today");
});
it("the hosted coach offer targets the plans section", async () => {
  const client = new QueryClient();
  render(createElement(QueryClientProvider, { client }, createElement(MemoryRouter, null, createElement(HostedCoachCard, { userId: "qa" }))));
  expect((await screen.findByRole("link", { name: "Explore Pro" })).getAttribute("href")).toBe("/billing#plans");
});
