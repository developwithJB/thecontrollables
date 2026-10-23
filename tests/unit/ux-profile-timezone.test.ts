// @vitest-environment jsdom
import { createElement } from "react";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  cleanup,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  profile: {
    display_name: "QA",
    timezone: "America/Chicago",
    created_at: "2026-10-23T00:00:00Z",
    updated_at: "2026-10-23T00:00:00Z",
  },
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => ({
        eq: () => ({
          single: async () => ({ data: mocks.profile, error: null }),
        }),
      }),
      update: (value: unknown) => {
        mocks.update(value);
        return { eq: async () => ({ error: null }) };
      },
    }),
  },
}));
vi.mock("@/hooks/useObservations", () => ({
  useObservations: () => ({
    observations: [],
    inferredPreferences: [],
    dismissObservation: vi.fn(),
  }),
}));
vi.mock("@/lib/pushNotifications", () => ({
  isPushSupported: () => false,
  isPushSubscribed: async () => false,
}));
vi.mock("@/components/settings/HostedCoachCard", () => ({
  HostedCoachCard: () => null,
}));
vi.mock("@/components/settings/CoachSettingsCard", () => ({
  CoachSettingsCard: () => null,
}));
vi.mock("@/components/settings/AISettingsCard", () => ({
  AISettingsCard: () => null,
}));
vi.mock("@/components/settings/ObservationsSettingsCard", () => ({
  ObservationsSettingsCard: () => null,
}));
vi.mock("@/components/CalendarReminderButton", () => ({
  CalendarReminderButton: () => null,
}));
vi.mock("@/hooks/use-toast", () => ({ useToast: () => ({ toast: vi.fn() }) }));
import { ProfileSettingsModal } from "@/components/ProfileSettingsModal";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.profile.updated_at = mocks.profile.created_at;
  const original = new Intl.DateTimeFormat().resolvedOptions();
  vi.spyOn(Intl.DateTimeFormat.prototype, "resolvedOptions").mockReturnValue({
    ...original,
    timeZone: "America/Los_Angeles",
  });
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});
function mount() {
  render(
    createElement(
      MemoryRouter,
      null,
      createElement(ProfileSettingsModal, {
        open: true,
        onOpenChange: vi.fn(),
        userId: "qa",
        userEmail: "qa@example.test",
        isPaid: false,
        onSignOut: vi.fn(),
      }),
    ),
  );
}
it("offers and saves browser time for a profile with an untouched database default", async () => {
  mount();
  expect(await screen.findByText("Pacific Time (PT)")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Save Changes" }));
  await waitFor(() =>
    expect(mocks.update).toHaveBeenCalledWith(
      expect.objectContaining({ timezone: "America/Los_Angeles" }),
    ),
  );
  expect(mocks.update.mock.calls[0][0]).not.toHaveProperty("start_timezone");
});
it("preserves Central time when a profile has already been edited", async () => {
  mocks.profile.updated_at = "2026-10-24T00:00:00Z";
  mount();
  expect(await screen.findByText("Central Time (CT)")).toBeTruthy();
  expect(mocks.update).not.toHaveBeenCalled();
  fireEvent.click(
    screen.getByRole("button", { name: /Use this browser’s timezone/ }),
  );
  expect(await screen.findByText("Pacific Time (PT)")).toBeTruthy();
  expect(mocks.update).not.toHaveBeenCalled();
});
