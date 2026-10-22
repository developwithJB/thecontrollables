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
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  invoke: vi.fn(),
  refetch: vi.fn(),
  query: {
    userId: "local",
    data: {
      enabled: true,
      plan: "free",
      repliesRemaining: 5,
      dailyRemaining: 5,
      budgetPercentRemaining: 100,
      resetsAt: null,
      byoActive: false,
      byoRemaining: 100,
    },
    isError: false,
  },
}));
vi.mock("@/hooks/useHostedAiAllowance", () => ({
  useHostedAiAllowance: () => ({ ...mocks.query, refetch: mocks.refetch }),
}));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { functions: { invoke: mocks.invoke } },
}));
vi.mock("@/lib/growthEvents", () => ({ trackGrowthEvent: vi.fn() }));
import { AIChat } from "@/components/AIChat";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.query.data = {
    enabled: true,
    plan: "free",
    repliesRemaining: 5,
    dailyRemaining: 5,
    budgetPercentRemaining: 100,
    resetsAt: null,
    byoActive: false,
    byoRemaining: 100,
  };
  mocks.query.isError = false;
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
function mount() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        MemoryRouter,
        null,
        createElement(AIChat, {
          controllable: "awareness",
          emoji: "🦉",
          title: "Awareness",
          isOpen: true,
          onClose: vi.fn(),
        }),
      ),
    ),
  );
}
it("uses the server's lifetime allowance and refreshes it after a response", async () => {
  mocks.invoke.mockResolvedValue({
    data: { message: "Synthetic response" },
    error: null,
  });
  mount();
  expect(
    screen.getByText(/5 sample replies left on this account/),
  ).toBeTruthy();
  expect(screen.queryByText(/2 free messages today/)).toBeNull();
  fireEvent.change(screen.getByRole("textbox"), {
    target: { value: "Synthetic prompt" },
  });
  fireEvent.keyDown(screen.getByRole("textbox"), { key: "Enter" });
  await screen.findByText("Synthetic response");
  await waitFor(() => expect(mocks.refetch).toHaveBeenCalledTimes(1));
  expect(mocks.invoke).toHaveBeenCalledTimes(1);
});
it("blocks exhausted samples and shows the shared Pro offer without calling AI", () => {
  mocks.query.data.repliesRemaining = 0;
  mount();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(
    true,
  );
  expect(screen.getByTestId("pro-offer-sample_exhausted")).toBeTruthy();
  expect(mocks.invoke).not.toHaveBeenCalled();
});
it("does not mistake a provider limit for an exhausted free hosted sample", () => {
  mocks.query.data.byoActive = true;
  mocks.query.data.byoRemaining = 0;
  mount();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(
    true,
  );
  expect(screen.queryByTestId("pro-offer-sample_exhausted")).toBeNull();
});
it("fails closed on an unavailable allowance without an upgrade claim", () => {
  mocks.query.isError = true;
  mount();
  expect((screen.getByRole("textbox") as HTMLTextAreaElement).disabled).toBe(
    true,
  );
  expect(screen.queryByTestId("pro-offer-sample_exhausted")).toBeNull();
});
