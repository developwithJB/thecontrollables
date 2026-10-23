// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, afterEach, it, expect, vi } from "vitest";
const mocks = vi.hoisted(() => ({ signUp: vi.fn(), activate: vi.fn(), clear: vi.fn(), track: vi.fn(), signIn: vi.fn(), updateUser: vi.fn() }));
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
  signUp: mocks.signUp, signInWithPassword: mocks.signIn, updateUser: mocks.updateUser, resend: vi.fn().mockResolvedValue({ error: null }),
} } }));
import Auth from "@/pages/onboarding/AuthPage";
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn(), addListener: vi.fn(), removeListener: vi.fn() }));
});
afterEach(() => { window.location.hash = ""; cleanup(); vi.unstubAllGlobals(); });
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

it("requires eight characters for signup, including programmatic form submission", async () => {
  render(createElement(MemoryRouter, { initialEntries: ["/auth?mode=signup"] }, createElement(Auth)));
  expect(screen.getByTestId("auth-password-input").getAttribute("minlength")).toBe("8");
  fireEvent.change(screen.getByTestId("auth-name-input"), { target: { value: "Local QA" } });
  fireEvent.change(screen.getByTestId("auth-email-input"), { target: { value: "local@example.test" } });
  fireEvent.change(screen.getByTestId("auth-password-input"), { target: { value: "1234567" } });
  fireEvent.submit(screen.getByTestId("auth-form"));
  expect(mocks.signUp).not.toHaveBeenCalled();
  mocks.signUp.mockResolvedValue({ data: { session: null }, error: null });
  fireEvent.change(screen.getByTestId("auth-password-input"), { target: { value: "12345678" } });
  fireEvent.submit(screen.getByTestId("auth-form"));
  await waitFor(() => expect(mocks.signUp).toHaveBeenCalledTimes(1));
});
it("does not lock out existing six-character passwords during sign-in", async () => {
  mocks.signIn.mockResolvedValue({ data: { session: null }, error: null });
  render(createElement(MemoryRouter, { initialEntries: ["/auth"] }, createElement(Auth)));
  expect(screen.getByTestId("auth-password-input").hasAttribute("minlength")).toBe(false);
  fireEvent.change(screen.getByTestId("auth-email-input"), { target: { value: "local@example.test" } });
  fireEvent.change(screen.getByTestId("auth-password-input"), { target: { value: "123456" } });
  fireEvent.submit(screen.getByTestId("auth-form"));
  await waitFor(() => expect(mocks.signIn).toHaveBeenCalledWith({ email: "local@example.test", password: "123456" }));
});
it("requires eight characters when setting a replacement password", async () => {
  window.location.hash = "#type=recovery";
  mocks.updateUser.mockResolvedValue({ error: null });
  render(createElement(MemoryRouter, { initialEntries: ["/auth"] }, createElement(Auth)));
  const input = await screen.findByLabelText("New Password");
  expect(input.getAttribute("minlength")).toBe("8");
  fireEvent.change(input, { target: { value: "1234567" } });
  fireEvent.submit(input.closest("form")!);
  expect(mocks.updateUser).not.toHaveBeenCalled();
  fireEvent.change(input, { target: { value: "12345678" } });
  fireEvent.submit(input.closest("form")!);
  await waitFor(() => expect(mocks.updateUser).toHaveBeenCalledWith({ password: "12345678" }));
});
it("does not promise email confirmation before the signup response establishes it",()=>{
 render(createElement(MemoryRouter,{initialEntries:["/auth?mode=signup"]},createElement(Auth)));
 expect(screen.queryByText(/Confirm your account, then/)).toBeNull();
 expect(screen.getByText(/If email confirmation is required/)).toBeTruthy();
});
it("switches an already-registered signup to sign-in with email retained and a recovery action",async()=>{
 mocks.signUp.mockResolvedValue({data:null,error:new Error("User already registered")});await submit();
 expect(await screen.findByRole("heading",{name:"Welcome back"})).toBeTruthy();
 expect(screen.getByTestId("auth-email-input")).toHaveProperty("value","local@example.test");
 expect(screen.getByTestId("auth-password-input")).toHaveProperty("value","");
 expect(screen.getByRole("alert").textContent).toContain("Forgot password?");
});
it("keeps invalid credentials generic with a visible prefilled password-recovery path",async()=>{
 mocks.signIn.mockResolvedValue({data:null,error:new Error("Invalid login credentials")});
 render(createElement(MemoryRouter,{initialEntries:["/auth"]},createElement(Auth)));
 fireEvent.change(screen.getByTestId("auth-email-input"),{target:{value:"local@example.test"}});fireEvent.change(screen.getByTestId("auth-password-input"),{target:{value:"synthetic"}});fireEvent.submit(screen.getByTestId("auth-form"));
 const alert=await screen.findByRole("alert");expect(alert.textContent).toContain("We could not sign you in");
 fireEvent.click(screen.getAllByRole("button",{name:"Forgot password?"})[0]);
 expect(await screen.findByRole("heading",{name:"Reset your password"})).toBeTruthy();expect(screen.getByLabelText("Email")).toHaveProperty("value","local@example.test");
});
