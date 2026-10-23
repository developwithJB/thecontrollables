import { expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), range: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: mocks.from } }));
import { loadFormationPracticeSummary } from "@/hooks/useFormationPracticeSummary";

it.each(["read_along", "charge_40"])("counts server-shaped %s rows with completion_state and empty action ids", async track => {
  // save_formation_circuit derives action IDs only inside the strict-track branch.
  // This exercises the real snake_case select/mapping path, with local-only mode off.
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.order.mockReturnValue({ range: mocks.range });
  const row = { user_id: "qa", track, local_date: "2026-10-23", circuit_type: "awareness", updated_at: "2026-10-23T10:00:00Z", completed_action_ids: [], completion_state: "recorded" };
  mocks.range.mockResolvedValue({ data: [row, { ...row, circuit_type: "habit", completion_state: "not_started" }], error: null });
  const summary = await loadFormationPracticeSummary("qa", false);
  expect(mocks.from).toHaveBeenCalledWith("formation_circuit_entries");
  expect(mocks.select).toHaveBeenCalledWith("user_id,track,local_date,circuit_type,updated_at,completed_action_ids,completion_state");
  expect(mocks.eq).toHaveBeenCalledWith("user_id", "qa");
  expect(summary).toEqual({ total: 1, completeDays: 0, days: 1, byDate: { "2026-10-23": 1 }, perCircuit: { awareness: 1, perspective: 0, habit: 0, wellness: 0, environment: 0 } });
});
