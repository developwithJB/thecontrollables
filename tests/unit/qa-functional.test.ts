import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { describe, it, expect, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { FirstWeekPanel } from "@/components/formation/FirstWeekPanel";
import { CIRCUIT_TYPES, createEmptyCircuitDraft, type FormationCircuitEntry } from "@/domain/formation/circuits";
import { evaluateCircuit } from "@/domain/formation/circuitRules";
import { summarizeFormationPractices } from "@/hooks/useFormationPracticeSummary";
import { hasMeaningfulLocalProgress, importProgressTitle } from "@/data/bookLoop/local";
import { normalizers, encodeState } from "@/data/bookLoop/model";
vi.mock("@/components/AIChat", () => ({ AIChat: () => null }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: {} }));
const strictClose = vi.fn();
vi.mock("@/hooks/useFullyChargedJourney", () => ({ useFullyChargedJourney: () => ({ closeDay: strictClose }) }));
const history: FormationCircuitEntry[] = CIRCUIT_TYPES.map((circuit, i) => ({ id: circuit, userId: "qa", localDate: "2026-10-19", track: "read_along", circuit, draft: { ...createEmptyCircuitDraft(), actions: { [ ["scripture_opened", "prayer_practiced", "main_promise_completed", "sleep_preparation", "service_completed"][i] ]: true } }, completedActionIds: [ ["scripture_opened", "prayer_practiced", "main_promise_completed", "sleep_preparation", "service_completed"][i] ], updatedAt: "2026-10-19", localOnly: false } as FormationCircuitEntry));
describe("functional QA regressions", () => {
  it("finds no next circuit at five recorded practices", () => {
    expect(history.find(e => !evaluateCircuit(e.track,e.circuit,e.draft).isSatisfiedForTrack)).toBeUndefined();
    expect(evaluateCircuit("read_along", "awareness", history[0].draft).statusLabel).toBe("Practice recorded ✓");
  });
  it.each(["read_along", "charge_40"] as const)("renders and acknowledges a %s receipt without strict mutation", track => {
    const storage = new Map(); vi.stubGlobal("localStorage", { getItem: (key: string) => storage.get(key), setItem: (key: string,value: string) => storage.set(key,value) });
    let tree: ReturnType<typeof create>;
    act(() => { tree = create(createElement(MemoryRouter, null, createElement(FirstWeekPanel, { history: history.map(e => ({...e,track})), userId: "qa", journey: null, track, today: "2026-10-19", nextCircuit: null, canPractice: true }))); });
    expect(JSON.stringify(tree!.toJSON())).toContain("Day complete");
    expect(JSON.stringify(tree!.toJSON())).not.toContain('"Continue"');
    const close = tree!.root.findAllByType("button").find(b => b.children.includes("Close today"))!;
    act(() => close.props.onClick());
    expect(storage.get("formation-day-ack:qa:2026-10-19")).toBe("acknowledged");
    expect(strictClose).not.toHaveBeenCalled(); act(() => tree!.unmount()); vi.unstubAllGlobals();
  });
  it("counts unique saved practices, days and circuits, excluding empty entries", () => {
    const empty = { ...history[0], localDate: "2026-10-18", draft: createEmptyCircuitDraft(), completedActionIds: [] };
    expect(summarizeFormationPractices([...history, history[0], empty])).toEqual({ total: 5, byDate: { [history[0].localDate]: 5 }, days: 1, perCircuit: { awareness: 1, perspective: 1, habit: 1, wellness: 1, environment: 1 } });
  });
  it("ignores setup choices and empty normalized payloads, retaining real reading progress", () => {
    expect(hasMeaningfulLocalProgress([{kind:"track",record_key:"current",payload:"charge_40"}, ...encodeState("profile", "current", normalizers.profile(undefined)), ...encodeState("reading", "current", normalizers.reading(undefined))])).toBe(false);
    expect(hasMeaningfulLocalProgress([{kind:"crm",record_key:"2026-10-19",payload:normalizers.crm({control:"One thing"})}])).toBe(true);
    const emptyReading = normalizers.reading({ startedAt: "2000-01-01T00:00:00Z" });
    expect(hasMeaningfulLocalProgress(encodeState("reading","current",emptyReading))).toBe(false);
    expect(hasMeaningfulLocalProgress(encodeState("reading","current",{...emptyReading,completedSectionIds:["awareness"]}))).toBe(true);
    expect(hasMeaningfulLocalProgress([{kind:"dex",record_key:"proof",payload:{id:"proof"}}])).toBe(true);
    expect(importProgressTitle(1)).toBe("Import 1 saved item from this browser?"); expect(importProgressTitle(3)).toBe("Import 3 saved items from this browser?");
  });
});
