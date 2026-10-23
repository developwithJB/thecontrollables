// @vitest-environment jsdom
import { createElement } from "react";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ summary: { isLoading: false, byDate: {} as Record<string, number> } }));
vi.mock("@/hooks/useFormationPracticeSummary", () => ({ useFormationPracticeSummary: () => mocks.summary }));
vi.mock("@/hooks/useAIOperator", () => ({ useDailyOperatorBrief: () => ({ isError: true }), useAIOperatorActions: () => ({ requestAdjustment: {} }) }));
vi.mock("@/hooks/useEntitlements", () => ({ useEntitlements: () => ({}) }));
vi.mock("@/hooks/useMissionCompletion", () => ({ useMissionCompletion: () => ({}) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
import { DailyOperatorBrief } from "@/components/dashboard/DailyOperatorBrief";
import { getLocalDate } from "@/domain/formation/circuitRules";
afterEach(cleanup);
it.each([
  [true, 0, "Loading mission..."],
  [false, 0, "Mission delayed"],
  [false, 1, "Your practice is recorded. Optional planning is unavailable."],
] as const)("uses resolved summary for unavailable mission copy (loading=%s, today=%s)", (isLoading, count, copy) => {
  mocks.summary = { isLoading, byDate: { [getLocalDate()]: count } };
  render(createElement(MemoryRouter, null, createElement(DailyOperatorBrief, { userId: "qa" })));
  expect(screen.getByText(copy)).toBeTruthy();
  if (isLoading || count > 0) expect(screen.queryByText("Mission delayed")).toBeNull();
});
