// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signUp: vi.fn(), activate: vi.fn(), clear: vi.fn(), track: vi.fn() }));
vi.mock("@/hooks/useFormationEntryStatus", () => ({ useFormationEntryStatus: () => ({ data: { strictReady: true, reviewedDays: 75, emailDeliveryReady: false }, isPending: false }) }));
vi.mock("@/hooks/useAnalytics", () => ({ useAnalytics: () => ({ trackEvent: vi.fn() }), usePageViewTracking: vi.fn() }));
vi.mock("@/hooks/useOnboardingAnalytics", () => ({ useOnboardingAnalytics: () => ({ trackAccountCreated: mocks.track }) }));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock("@/lib/growthEvents", () => ({ trackGrowthEvent: vi.fn(), signupFailureCategory: () => "unknown" }));
vi.mock("@/lib/growthAttribution", () => ({ getSignupAttribution: () => ({}) }));
vi.mock("@/lib/formationEnrollment", () => ({ activateFormationEnrollment: mocks.activate }));
vi.mock("@/hooks/useFormationTrack", () => ({ saveFormationTrackSelection: vi.fn() }));
vi.mock("@/lib/onboardingQuickStartDraft", () => ({
  getOnboardingQuickStartDraft: () => ({ formationTrack: "read_along", dailyEmailEnabled: false, timezone: "America/Los_Angeles" }),
  getQuickStartCompletionRoute: () => "/formation/today", clearOnboardingQuickStartDraft: mocks.clear,
}));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: {
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: vi.fn() } } }),
  getSession: () => Promise.resolve({ data: { session: null } }),
  signUp: mocks.signUp, resend: vi.fn().mockResolvedValue({ error: null }),
} } }));
import Auth from "@/pages/onboarding/AuthPage";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
async function submit() {
  render(createElement(MemoryRouter, { initialEntries: ["/auth?mode=signup"] }, createElement(Auth)));
  fireEvent.change(screen.getByTestId("auth-name-input"), { target: { value: "Local QA" } });
  fireEvent.change(screen.getByTestId("auth-email-input"), { target: { value: "local@example.test" } });
  fireEvent.change(screen.getByTestId("auth-password-input"), { target: { value: "test-only-password" } });
  fireEvent.submit(screen.getByTestId("auth-form"));
}
it("shows a durable masked confirmation and cooldown without claiming an activated account", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  await submit();
  expect(await screen.findByTestId("signup-confirmation")).toBeTruthy();
  expect(screen.getByText(/l•••@example.test/)).toBeTruthy();
  expect((screen.getByRole("button", { name: /Resend in/ }) as HTMLButtonElement).disabled).toBe(true);
  expect(mocks.activate).not.toHaveBeenCalled();
  expect(mocks.track).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Edit email address" }));
  expect(screen.getByTestId("auth-email-input")).toHaveProperty("value", "local@example.test");
});
it("keeps the draft and surfaces retry if enrollment fails after authenticated signup", async () => {
  mocks.signUp.mockResolvedValue({ data: { session: { user: { id: "local-user", user_metadata: {} } } }, error: null });
  mocks.activate.mockRejectedValueOnce(new Error("private service error")).mockResolvedValueOnce(undefined);
  await submit();
  expect(await screen.findByRole("button", { name: "Retry path setup" })).toBeTruthy();
  expect(mocks.clear).not.toHaveBeenCalled();
  expect(screen.queryByText("private service error")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Retry path setup" }));
  await waitFor(() => expect(mocks.activate).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(mocks.clear).toHaveBeenCalledTimes(1));
});
