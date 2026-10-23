// @vitest-environment jsdom
import { createElement } from "react";
import { readFileSync } from "node:fs";
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ invoke: vi.fn(), refetch: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));
vi.mock("@/hooks/useHostedAiAllowance", () => ({
  useHostedAiAllowance: () => ({
    data: {
      enabled: true,
      plan: "free",
      repliesRemaining: 5,
      dailyRemaining: 5,
      budgetPercentRemaining: 100,
      byoActive: false,
      byoRemaining: 100,
    },
    refetch: mocks.refetch,
  }),
}));
vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: () => ({ serverVerified: true, isPaid: false }),
}));
vi.mock("@/lib/growthEvents", () => ({ trackGrowthEvent: vi.fn() }));
import { ControllableHub } from "@/components/dashboard/ControllableHub";
import { summarizeFormationPractices } from "@/hooks/useFormationPracticeSummary";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.invoke.mockResolvedValue({
    data: { reply: "Synthetic reply" },
    error: null,
  });
  mocks.refetch.mockResolvedValue({});
  Element.prototype.scrollIntoView = vi.fn();
  Element.prototype.scrollTo = vi.fn();
});
afterEach(cleanup);
function mount() {
  return render(
    createElement(
      QueryClientProvider,
      { client: new QueryClient() },
      createElement(
        MemoryRouter,
        null,
        createElement(ControllableHub, { userId: "qa", completedCount: 0 }),
      ),
    ),
  );
}
it("counts a recorded historical row even when its legacy action ids are empty, but excludes empty drafts", () => {
  const base = {
    userId: "qa",
    track: "read_along" as const,
    localDate: "2026-10-23",
    circuit: "awareness" as const,
    updatedAt: "2026-10-23",
    completedActionIds: [],
  };
  expect(
    summarizeFormationPractices([
      { ...base, completionState: "recorded" },
      { ...base, circuit: "habit", completionState: "not_started" },
    ]).total,
  ).toBe(1);
});
it.each([
  "I am tired in spirit",
  "I feel overwhelmed and need sleep",
  "I feel anxious about food",
])(
  "routes emotional context to Awareness before physical keywords: %s",
  async (text) => {
    mount();
    fireEvent.change(screen.getByRole("textbox"), { target: { value: text } });
    fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
    await waitFor(() =>
      expect(mocks.invoke).toHaveBeenCalledWith(
        "ai-chat",
        expect.objectContaining({
          body: expect.objectContaining({ controllable: "awareness" }),
        }),
      ),
    );
  },
);
it("honors an explicit Wellness choice", async () => {
  mount();
  fireEvent.click(screen.getAllByRole("button", { name: /Wellness/ })[0]);
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "I feel scattered" },
  });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  await waitFor(() =>
    expect(mocks.invoke).toHaveBeenCalledWith(
      "ai-chat",
      expect.objectContaining({
        body: expect.objectContaining({ controllable: "wellness" }),
      }),
    ),
  );
  await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
});
it("starts with Awareness selected and holds busy state until allowance refresh settles", async () => {
  let resolveRefresh!: () => void;
  mocks.refetch.mockImplementationOnce(() => new Promise<void>(resolve => { resolveRefresh=resolve; }));
  mount();
  expect(screen.getAllByRole("button",{name:/Awareness/})[0].getAttribute("aria-pressed")).toBe("true");
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"I feel scattered"}});
  fireEvent.keyDown(screen.getByRole("textbox"),{key:"Enter"});
  await screen.findByText("Synthetic reply");
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(true);
  resolveRefresh();
  await waitFor(()=>expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(false));
});
it("keeps Wellness instructions non-quantified and avoids explaining emotional distress through nutrition",()=>{
 const source=readFileSync("supabase/functions/ai-chat/index.ts","utf8");
 const wellness=source.slice(source.indexOf("  wellness: `[IDENTITY]"),source.indexOf("  environment: `[IDENTITY]"));
 expect(wellness).toContain("Never provide calorie, macro, portion, weight, fluid or supplement targets or estimates.");
 expect(wellness).not.toMatch(/~Xg|16oz|macro estimate/);
 expect(wellness).toContain("Emotional or spiritual distress is not evidence of blood sugar problems");
});
