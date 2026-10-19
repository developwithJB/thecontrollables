import { describe, expect, it } from "vitest";
import {
  changesForState,
  decodeState,
  encodeState,
  normalizers,
  type BookRecord,
} from "@/data/bookLoop/model";
import {
  collectLocalBookRecords,
  fingerprintImport,
} from "@/data/bookLoop/local";
import { createProofEntry } from "@/lib/myControllables";
import { createDexProofEntry } from "@/lib/controllablesDex";
import { getFeatureFlags } from "@/lib/featureFlags";

function storage(items: Record<string, string>): Storage {
  const map = new Map(Object.entries(items));
  return {
    get length() {
      return map.size;
    },
    key: (i) => [...map.keys()][i] ?? null,
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => {
      map.set(k, v);
    },
    removeItem: (k) => {
      map.delete(k);
    },
    clear: () => map.clear(),
  };
}
describe("book-loop serialization and import", () => {
  it("defaults ON after backend verification and accepts an explicit rollback flag", () => {
    expect(getFeatureFlags().server_book_loop_enabled).toBe(true);
    expect(
      getFeatureFlags({ server_book_loop_enabled: "false" })
        .server_book_loop_enabled,
    ).toBe(false);
  });
  it("separates promises by day and round-trips the private profile", () => {
    const profile = normalizers.profile(undefined);
    profile.proofEntries = [
      createProofEntry({
        controllable: "habit",
        promise: "Private promise",
        kind: "kept_promise",
      }),
    ];
    const rows = encodeState("profile", "current", profile).map((r) => ({
      ...r,
      revision: 8,
    }));
    expect(rows.map((r) => r.kind)).toEqual(["profile", "promise"]);
    expect(decodeState("profile", "current", rows)).toEqual(profile);
  });
  it("updates only changed entries and includes the observed revision", () => {
    const entry = createDexProofEntry({
      id: "p1",
      missionId: "m1",
      targetControllable: "perspective",
      imageUrl: "data:image/jpeg;base64,abc",
    });
    const rows: BookRecord[] = [
      { kind: "dex", record_key: "p1", payload: entry, revision: 71 },
    ];
    expect(
      changesForState("dex", "current", rows, { entries: [entry] }),
    ).toEqual([]);
    expect(changesForState("dex", "current", rows, { entries: [] })).toEqual([
      expect.objectContaining({
        record_key: "p1",
        expected_revision: 71,
        delete: true,
      }),
    ]);
  });
  it("isolates dated notes and keeps other days untouched", () => {
    const rows: BookRecord[] = [
      {
        kind: "crm",
        record_key: "2026-10-06",
        payload: normalizers.crm({ control: "Yesterday" }),
        revision: 3,
      },
    ];
    const changes = changesForState(
      "crm",
      "2026-10-07",
      rows,
      normalizers.crm({ move: "Today" }),
    );
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({
      record_key: "2026-10-07",
      expected_revision: 0,
    });
  });
  it("imports only this account and guest data, with account conflicts preferred", async () => {
    const local = storage({
      formation_selected_track_guest: "charge_40",
      formation_selected_track_alice: "read_along",
      formation_selected_track_bob: "fully_charged_75",
      control_release_move_alice_2026_ignored: "{}",
      control_release_move_alice_2026_10_07: "{}",
      "control_release_move_alice_2026-10-07": '{"move":"private"}',
    });
    const records = collectLocalBookRecords(local, "alice");
    expect(records).toHaveLength(2);
    expect(records.find((r) => r.kind === "track")?.payload).toBe("read_along");
    const first = await fingerprintImport(records);
    expect(first).toMatch(/^[a-f0-9]{64}$/);
    expect(
      await fingerprintImport(collectLocalBookRecords(local, "alice")),
    ).toBe(first);
    expect(local.length).toBe(6);
  });
  it("retains stable Dex ids on repeat import and never deletes local records", () => {
    const entry = createDexProofEntry({
      id: "stable",
      missionId: "m",
      targetControllable: "wellness",
      imageUrl: "data:image/jpeg;base64,abc",
    });
    const local = storage({
      controllables_dex_alice: JSON.stringify({ entries: [entry] }),
    });
    expect(collectLocalBookRecords(local, "alice")).toEqual(
      collectLocalBookRecords(local, "alice"),
    );
    expect(local.getItem("controllables_dex_alice")).toContain("stable");
  });
  it("rejects malformed JSON without changing the browser copy", () => {
    const local = storage({ my_controllables_profile_alice: "broken" });
    expect(() => collectLocalBookRecords(local, "alice")).toThrow();
    expect(local.getItem("my_controllables_profile_alice")).toBe("broken");
  });
});
