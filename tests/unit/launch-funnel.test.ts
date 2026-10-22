// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  readAlongCampaignPath,
  isFreeSampleExhausted,
} from "@/lib/launchFunnel";
import type { HostedAiAllowance } from "@/hooks/useHostedAiAllowance";
import { ProOfferCard } from "@/components/billing/ProOfferCard";
import { AiAllowancePanel } from "@/components/billing/AiAllowancePanel";
import { DaySevenProOffer } from "@/components/billing/DaySevenProOffer";
const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  entitlement: {
    isLoading: false,
    isPaid: false,
    legacyAppAccess: false,
    serverVerified: true,
  },
  allowance: { isError: false, data: { enabled: true, plan: "free" } },
}));
vi.mock("@/lib/growthEvents", () => ({ trackGrowthEvent: mocks.track }));
vi.mock("@/hooks/useEntitlements", () => ({
  useEntitlements: () => mocks.entitlement,
}));
vi.mock("@/hooks/useHostedAiAllowance", () => ({
  useHostedAiAllowance: () => mocks.allowance,
}));
const free: HostedAiAllowance = {
  enabled: true,
  plan: "free",
  repliesRemaining: 0,
  dailyRemaining: 0,
  budgetPercentRemaining: 50,
  resetsAt: null,
  byoActive: false,
  byoRemaining: 100,
};
const router = (child: ReturnType<typeof createElement>) =>
  createElement(MemoryRouter, null, child);
beforeEach(() => {
  const map = new Map<string, string>();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => map.set(k, v),
  });
  vi.clearAllMocks();
  mocks.entitlement = {
    isLoading: false,
    isPaid: false,
    legacyAppAccess: false,
    serverVerified: true,
  };
  mocks.allowance = { isError: false, data: { enabled: true, plan: "free" } };
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
describe("campaign entry", () => {
  it("always selects Read Along and gives untagged bio visits explicit defaults", () => {
    const url = new URL(
      readAlongCampaignPath(
        "?path=fully_charged_75&returnTo=https://evil.invalid",
      ),
      "https://example.test",
    );
    expect(url.pathname).toBe("/quick-start");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      path: "read_along",
      utm_source: "bio",
      utm_medium: "social",
      utm_campaign: "first100",
    });
  });
  it("preserves sanitized per-platform tags without arbitrary parameters or destinations", () => {
    const url = new URL(
      readAlongCampaignPath(
        "?utm_source=YouTube!&utm_content=Episode_01&ref=JB&email=private@example.test&token=secret",
      ),
      "https://example.test",
    );
    expect(url.searchParams.get("utm_source")).toBe("youtube");
    expect(url.searchParams.get("utm_content")).toBe("episode_01");
    expect(url.search).not.toMatch(/email|token|secret/);
    expect(url.searchParams.get("ref")).toBe("jb");
  });
});
describe("server-driven upgrade moments", () => {
  it.each([
    [undefined, false],
    [free, true],
    [{ ...free, repliesRemaining: 2, dailyRemaining: 0 }, false],
    [{ ...free, repliesRemaining: 3, budgetPercentRemaining: 0 }, true],
    [{ ...free, plan: "pro" }, false],
    [{ ...free, enabled: false }, false],
    [{ ...free, byoActive: true, byoRemaining: 0 }, false],
  ])(
    "offers only an exhausted hosted free sample: %j",
    (allowance, expected) => {
      expect(
        isFreeSampleExhausted(allowance as HostedAiAllowance | undefined),
      ).toBe(expected);
    },
  );
  it("shows exact prices and free/BYO alternatives without starting checkout", () => {
    render(
      router(
        createElement(ProOfferCard, {
          placement: "sample_exhausted",
          userId: "a",
        }),
      ),
    );
    expect(screen.getByText(/\$14.99\/month or \$119.99\/year/)).toBeTruthy();
    expect(
      screen.getByRole("link", { name: "See Pro plans" }).getAttribute("href"),
    ).toBe("/pricing");
    expect(
      screen
        .getByRole("link", { name: "Bring my own AI key" })
        .getAttribute("href"),
    ).toBe("/billing#coach-settings");
    expect(screen.getByText(/Read Along stays free/)).toBeTruthy();
    expect(mocks.track).toHaveBeenCalledWith("pro_offer_viewed", {
      placement: "sample_exhausted",
    });
    fireEvent.click(screen.getByRole("link", { name: "See Pro plans" }));
    expect(mocks.track).toHaveBeenCalledWith("pro_offer_clicked", {
      placement: "sample_exhausted",
    });
  });
  it("dismisses per owner and placement without affecting another account", () => {
    const view = render(
      router(
        createElement(ProOfferCard, { placement: "day7_review", userId: "a" }),
      ),
    );
    fireEvent.click(
      screen.getByRole("button", { name: "Keep practicing free" }),
    );
    expect(screen.queryByRole("complementary")).toBeNull();
    view.rerender(
      router(
        createElement(ProOfferCard, { placement: "day7_review", userId: "b" }),
      ),
    );
    expect(screen.getByRole("complementary")).toBeTruthy();
    expect(
      localStorage.getItem("pro-offer-dismissed:b:day7_review"),
    ).toBeNull();
  });
  it("does not show a sample offer from stale data when allowance loading failed", () => {
    render(
      router(
        createElement(AiAllowancePanel, { allowance: free, unavailable: true }),
      ),
    );
    expect(screen.queryByTestId("pro-offer-sample_exhausted")).toBeNull();
  });
  it.each([
    "paid",
    "legacy",
    "unverified",
    "loading",
    "allowance-error",
    "paused",
    "pro",
  ])("hides day-seven offer for %s", (state) => {
    if (state === "paid") mocks.entitlement.isPaid = true;
    if (state === "legacy") mocks.entitlement.legacyAppAccess = true;
    if (state === "unverified") mocks.entitlement.serverVerified = false;
    if (state === "loading") mocks.entitlement.isLoading = true;
    if (state === "allowance-error") mocks.allowance.isError = true;
    if (state === "paused") mocks.allowance.data.enabled = false;
    if (state === "pro") mocks.allowance.data.plan = "pro";
    render(router(createElement(DaySevenProOffer, { userId: "a" })));
    expect(screen.queryByRole("complementary")).toBeNull();
  });
  it("shows the day-seven offer to a server-verified free account", () => {
    render(router(createElement(DaySevenProOffer, { userId: "a" })));
    expect(screen.getByTestId("pro-offer-day7_review")).toBeTruthy();
  });
});
