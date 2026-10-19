import { createElement } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BookLoopContext, useBookLoopState } from "@/hooks/useBookLoopState";
import { bookQueryKey, type BookRecord } from "@/data/bookLoop/model";
import { loadBookRecords, saveBookChanges } from "@/data/bookLoop/repository";
import { useMyControllablesProfile } from "@/hooks/useMyControllablesProfile";
import { useControllablesDex } from "@/hooks/useControllablesDex";
import { useReadAlongProgress } from "@/hooks/useReadAlongProgress";
import { updateFormationTrack } from "@/lib/formationEnrollment";
import { useFormationTrack } from "@/hooks/useFormationTrack";
import { useLocalMissionDrop } from "@/hooks/useLocalMissionDrop";

vi.mock("@/data/bookLoop/repository", () => ({
  loadBookRecords: vi.fn(),
  saveBookChanges: vi.fn(),
}));
vi.mock("@/lib/formationEnrollment", () => ({ updateFormationTrack: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }) } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn() } }));
let renderer: ReactTestRenderer;
let client: QueryClient;
let values: Map<string, string>;
const storage = {
  getItem: (k: string) => values.get(k) ?? null,
  setItem: (k: string, v: string) => {
    values.set(k, v);
  },
};
async function settle() {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 15));
  });
}
function mount<T>(
  hook: () => T,
  account: string | null,
): { get: () => T; account: (id: string | null) => void } {
  let latest: T;
  function Probe() {
    latest = hook();
    return null;
  }
  const tree = (id: string | null) =>
    createElement(
      QueryClientProvider,
      { client },
      createElement(
        BookLoopContext.Provider,
        { value: id },
        createElement(Probe),
      ),
    );
  act(() => {
    renderer = create(tree(account));
  });
  return {
    get: () => latest,
    account: (id) => {
      act(() => renderer.update(tree(id)));
    },
  };
}
beforeEach(() => {
  vi.clearAllMocks();
  values = new Map();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", new EventTarget());
  vi.stubGlobal("navigator", { onLine: true });
  client = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
  vi.mocked(loadBookRecords).mockResolvedValue([]);
  vi.mocked(saveBookChanges).mockResolvedValue();
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  client.clear();
  vi.unstubAllGlobals();
});

describe("book-loop hooks", () => {
  it("uses local storage only when cloud context is disabled", async () => {
    values.set("formation_selected_track_alice", "charge_40");
    const view = mount(() => useBookLoopState("track", "alice"), null);
    expect(view.get().state).toBe("charge_40");
    await act(async () => {
      expect(await view.get().persist(() => "fully_charged_75")).toBe(true);
    });
    expect(values.get("formation_selected_track_alice")).toBe(
      "fully_charged_75",
    );
    expect(loadBookRecords).not.toHaveBeenCalled();
    expect(saveBookChanges).not.toHaveBeenCalled();
  });
  it("uses the guest key while signed out", async () => {
    const view = mount(() => useBookLoopState("reading", null), null);
    await act(async () => {
      await view.get().persist((p) => ({ ...p, status: "finished" }));
    });
    expect(values.has("read_along_progress_guest")).toBe(true);
    expect(saveBookChanges).not.toHaveBeenCalled();
  });
  it("loads cloud data without reading local data into the account", async () => {
    values.set("formation_selected_track_alice", "charge_40");
    vi.mocked(loadBookRecords).mockResolvedValue([
      {
        kind: "track",
        record_key: "current",
        payload: "read_along",
        revision: 12,
      },
    ]);
    const view = mount(() => useFormationTrack("alice"), "alice");
    await settle();
    expect(view.get().track).toBe("read_along");
    await act(async () => {
      await view.get().setTrack("fully_charged_75");
    });
    expect(updateFormationTrack).toHaveBeenCalledWith("fully_charged_75");
    expect(values.get("formation_selected_track_alice")).toBe("charge_40");
  });
  it("rejects writes until the initial cloud read has succeeded", async () => {
    vi.mocked(loadBookRecords).mockImplementation(() => new Promise(() => {}));
    const view = mount(() => useBookLoopState("track", "alice"), "alice");
    await act(async () => {
      expect(await view.get().persist(() => "charge_40")).toBe(false);
    });
    expect(saveBookChanges).not.toHaveBeenCalled();
  });
  it("reports failed writes instead of success or a silent local fallback", async () => {
    vi.mocked(saveBookChanges).mockRejectedValue(
      new Error("book_loop_conflict"),
    );
    const view = mount(() => useMyControllablesProfile("alice"), "alice");
    await settle();
    await act(async () => {
      expect(
        await view
          .get()
          .logDailyTraining({
            controllable: "habit",
            promise: "Read",
            kind: "kept_promise",
          }),
      ).toBeNull();
    });
    expect(values.size).toBe(0);
  });
  it("persists Dex images with stable ids and confirms before returning success", async () => {
    const view = mount(() => useControllablesDex("alice"), "alice");
    await settle();
    await act(async () => {
      const entry = await view
        .get()
        .addProofEntry({
          id: "proof",
          targetControllable: "wellness",
          missionId: "m",
          imageUrl: "data:image/jpeg;base64,abc",
        });
      expect(entry?.id).toBe("proof");
    });
    expect(saveBookChanges).toHaveBeenCalledWith("alice", [
      expect.objectContaining({
        kind: "dex",
        record_key: "proof",
        expected_revision: 0,
      }),
    ]);
  });
  it("reads updated cloud state shared by all hook instances", async () => {
    const view = mount(() => useReadAlongProgress("alice"), "alice");
    await settle();
    const newer: BookRecord[] = [
      {
        kind: "reading",
        record_key: "current",
        payload: { ...view.get().progress, status: "finished" },
        revision: 20,
      },
    ];
    act(() => client.setQueryData(bookQueryKey("alice"), newer));
    await settle();
    expect(view.get().progress.status).toBe("finished");
  });
  it("persists local mission starts on the server", async () => {
    const view = mount(() => useLocalMissionDrop("alice"), "alice");
    await settle();
    await act(async () => {
      expect(await view.get().startMission("mission-1")).toBe(true);
    });
    expect(saveBookChanges).toHaveBeenCalledWith("alice", [
      expect.objectContaining({
        kind: "missions",
        payload: expect.objectContaining({ startedMissionIds: ["mission-1"] }),
      }),
    ]);
  });
  it("preserves a captured edit's revision after a background refresh", async () => {
    vi.mocked(loadBookRecords).mockResolvedValue([
      {
        kind: "crm",
        record_key: "day",
        payload: { move: "original" },
        revision: 10,
      },
    ]);
    const view = mount(() => useBookLoopState("crm", "alice", "day"), "alice");
    await settle();
    const saveOriginal = view.get().persist;
    act(() =>
      client.setQueryData(bookQueryKey("alice"), [
        {
          kind: "crm",
          record_key: "day",
          payload: { move: "other-device" },
          revision: 11,
        },
      ]),
    );
    await settle();
    await act(async () => {
      await saveOriginal((p) => ({ ...p, move: "my edit" }));
    });
    expect(saveBookChanges).toHaveBeenCalledWith("alice", [
      expect.objectContaining({ expected_revision: 10 }),
    ]);
  });
  it("does not carry another user's state into a switched local account", async () => {
    values.set("formation_selected_track_alice", "charge_40");
    let userId = "alice";
    const view = mount(() => useBookLoopState("track", userId), null);
    expect(view.get().state).toBe("charge_40");
    userId = "bob";
    view.account(null);
    expect(view.get().state).toBe("read_along");
  });
  it("fails an offline save without queueing a later account write", async () => {
    const view = mount(() => useBookLoopState("track", "alice"), "alice");
    await settle();
    vi.stubGlobal("navigator", { onLine: false });
    await act(async () => {
      expect(await view.get().persist(() => "charge_40")).toBe(false);
    });
    expect(saveBookChanges).not.toHaveBeenCalled();
  });
});
