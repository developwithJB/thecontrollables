// @vitest-environment jsdom
import { createElement } from "react";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
} from "@testing-library/react";
import {
  createMemoryRouter,
  RouterProvider,
  MemoryRouter,
  Link,
} from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { auth: { signOut: vi.fn().mockResolvedValue({ error: null }) } },
}));
vi.mock("@/lib/growthEvents", () => ({ trackGrowthEvent: vi.fn() }));
const account = vi.hoisted(() => ({
  user: null as null | { id: string },
  isLoading: false,
}));
vi.mock("@/hooks/useOptionalAccount", () => ({
  useOptionalAccount: () => account,
}));
import { resolveProfileTimezone } from "@/lib/profileTimezone";
import { clearSignedOutState } from "@/lib/signedOutState";
import { PlanSelector } from "@/components/PlanSelector";
import { PlannerCalendarConnect } from "@/components/planner/PlannerCalendarConnect";
import { AwarenessCircuitEditor } from "@/components/formation/CircuitEditors";
import { createEmptyCircuitDraft } from "@/domain/formation/circuits";
import { evaluateCircuit } from "@/domain/formation/circuitRules";
import { PageDataLoading } from "@/components/layout/PageDataLoading";
import { UnsavedPracticeGuard } from "@/components/formation/UnsavedPracticeGuard";
import PricingPage from "@/pages/public/PricingPage";
function storage() {
  const map = new Map<string, string>();
  return {
    get length() {
      return map.size;
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => map.set(key, value),
    removeItem: (key: string) => map.delete(key),
    clear: () => map.clear(),
  };
}
beforeEach(() => {
  vi.stubGlobal("localStorage", storage());
  vi.stubGlobal("sessionStorage", storage());
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  account.user = null;
});
it("uses the browser zone only for a provably untouched default and preserves chosen or ambiguous zones", () => {
  const initial = {
    timezone: "America/Chicago",
    created_at: "2026-10-23T00:00:00Z",
    updated_at: "2026-10-23T00:00:00Z",
  };
  expect(resolveProfileTimezone(initial, "Europe/Paris")).toBe("Europe/Paris");
  expect(
    resolveProfileTimezone(
      { ...initial, updated_at: "2026-10-24T00:00:00Z" },
      "Europe/Paris",
    ),
  ).toBe("America/Chicago");
  expect(
    resolveProfileTimezone({ timezone: "America/Chicago" }, "Europe/Paris"),
  ).toBe("America/Chicago");
  expect(
    resolveProfileTimezone(
      { ...initial, timezone: "Asia/Tokyo" },
      "Europe/Paris",
    ),
  ).toBe("Asia/Tokyo");
  expect(resolveProfileTimezone(null, "Europe/Paris")).toBe("Europe/Paris");
});
it("clears only the departing account and unscoped private state, preserving another owner and theme", () => {
  for (const storage of [localStorage, sessionStorage])
    for (const key of [
      "formation_circuit_entries_v1_alice",
      "formation-day-ack:alice:2026-10-23",
      "formation_selected_track_bob",
      "theme",
      "onboarding_quick_start_draft",
      "dashboard-intelligence-cache",
      "growth_event_buffer",
      "control_release_move_guest_2026-10-23",
    ])
      storage.setItem(key, "synthetic");
  clearSignedOutState("alice");
  for (const storage of [localStorage, sessionStorage]) {
    expect(storage.getItem("formation_circuit_entries_v1_alice")).toBeNull();
    expect(storage.getItem("formation-day-ack:alice:2026-10-23")).toBeNull();
    expect(storage.getItem("onboarding_quick_start_draft")).toBeNull();
    expect(storage.getItem("growth_event_buffer")).toBeNull();
    expect(storage.getItem("control_release_move_guest_2026-10-23")).toBeNull();
    expect(storage.getItem("formation_selected_track_bob")).toBe("synthetic");
    expect(storage.getItem("theme")).toBe("synthetic");
  }
});
it.each([true, false])(
  "offers only Pro for new purchases (compact=%s)",
  (compact) => {
    const select = vi.fn();
    render(createElement(PlanSelector, { onSelect: select, compact }));
    expect(screen.queryByText(/Plus/)).toBeNull();
    fireEvent.click(screen.getByRole("button"));
    expect(select).toHaveBeenCalledWith("pro");
  },
);
it("suppresses only the duplicate disconnected calendar prompt", () => {
  const { rerender } = render(
    createElement(PlannerCalendarConnect, {
      connections: [],
      onConnect: vi.fn(),
      onSync: vi.fn(),
      hideConnect: true,
    }),
  );
  expect(
    screen.queryByRole("button", { name: "Connect Google Calendar" }),
  ).toBeNull();
  rerender(
    createElement(PlannerCalendarConnect, {
      connections: [],
      onConnect: vi.fn(),
      onSync: vi.fn(),
    }),
  );
  expect(
    screen.getAllByRole("button", { name: "Connect Google Calendar" }),
  ).toHaveLength(1);
});
it("labels the existing Awareness reading prompts Observe, Understand and Respond", () => {
  const draft = createEmptyCircuitDraft();
  render(
    createElement(AwarenessCircuitEditor, {
      userId: "qa",
      localDate: "2026-10-23",
      track: "read_along",
      draft,
      evaluation: evaluateCircuit("read_along", "awareness", draft),
      history: [],
      localOnly: true,
      onChange: vi.fn(),
    }),
  );
  for (const name of ["Observe:", "Understand:", "Respond:"])
    expect(screen.getByText(name, { exact: true })).toBeTruthy();
  expect(screen.getByLabelText("One honest truth")).toBeTruthy();
});
it("shows a skeleton for an existing pending query without causing another fetch", async () => {
  const client = new QueryClient();
  let finish!: (value: string) => void;
  const fetcher = vi.fn(
    () => new Promise<string>((resolve) => (finish = resolve)),
  );
  const pending = client.fetchQuery({
    queryKey: ["private", "qa"],
    queryFn: fetcher,
  });
  render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(PageDataLoading, { userId: "qa" }),
    ),
  );
  expect(screen.getByRole("status", { name: "Loading page" })).toBeTruthy();
  await act(async () => {
    finish("done");
    await pending;
  });
  await waitFor(() =>
    expect(screen.queryByRole("status", { name: "Loading page" })).toBeNull(),
  );
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it("blocks route changes and native unload while dirty, then allows explicit discard", async () => {
  const router = createMemoryRouter(
    [
      {
        path: "/edit",
        element: createElement(
          "div",
          null,
          createElement(UnsavedPracticeGuard, { dirty: true }),
          createElement(Link, { to: "/next" }, "Next"),
        ),
      },
      { path: "/next", element: createElement("h1", null, "Next page") },
    ],
    { initialEntries: ["/edit"] },
  );
  render(createElement(RouterProvider, { router }));
  fireEvent.click(screen.getByRole("link", { name: "Next" }));
  expect(await screen.findByRole("alertdialog")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Keep editing" }));
  expect(router.state.location.pathname).toBe("/edit");
  const unload = new Event("beforeunload", { cancelable: true });
  window.dispatchEvent(unload);
  expect(unload.defaultPrevented).toBe(true);
  fireEvent.click(screen.getByRole("link", { name: "Next" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Discard changes" }),
  );
  expect(
    await screen.findByRole("heading", { name: "Next page" }),
  ).toBeTruthy();
});
it.each([true, false])(
  "uses the correct pricing navigation and free-card CTA (signedIn=%s)",
  (signedIn) => {
    account.user = signedIn ? { id: "qa" } : null;
    render(
      createElement(
        QueryClientProvider,
        { client: new QueryClient() },
        createElement(MemoryRouter, null, createElement(PricingPage)),
      ),
    );
    expect(!!screen.queryByRole("link", { name: "Sign in", exact: true })).toBe(
      !signedIn,
    );
    expect(
      !!screen.queryByRole("link", { name: "View my plan", exact: true }),
    ).toBe(signedIn);
    expect(!!screen.queryByRole("button", { name: "Profile menu" })).toBe(
      signedIn,
    );
  },
);
