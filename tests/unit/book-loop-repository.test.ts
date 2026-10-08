import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  loadBookRecords,
  saveBookChanges,
  importBookRecords,
} from "@/data/bookLoop/repository";
import { supabase } from "@/integrations/supabase/client";
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { rpc: vi.fn(), from: vi.fn() },
}));
beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(supabase.rpc).mockResolvedValue({
    data: null,
    error: null,
  } as never);
});
describe("book-loop repository", () => {
  it("binds every save and import to the expected authenticated account", async () => {
    const changes = [
      {
        kind: "track" as const,
        record_key: "current",
        payload: "read_along",
        expected_revision: 0,
      },
    ];
    await saveBookChanges("alice", changes);
    await importBookRecords("alice", "a".repeat(64), []);
    expect(supabase.rpc).toHaveBeenNthCalledWith(1, "save_book_loop_changes", {
      p_user_id: "alice",
      p_changes: changes,
    });
    expect(supabase.rpc).toHaveBeenNthCalledWith(2, "import_book_loop", {
      p_user_id: "alice",
      p_import_id: "a".repeat(64),
      p_records: [],
    });
  });
  it("propagates import/server conflicts to callers and never treats them as success", async () => {
    vi.mocked(supabase.rpc).mockResolvedValue({
      data: null,
      error: { message: "book_loop_conflict" },
    } as never);
    await expect(
      importBookRecords("alice", "a".repeat(64), []),
    ).rejects.toMatchObject({ message: "book_loop_conflict" });
    await expect(
      saveBookChanges("alice", [
        {
          kind: "track",
          record_key: "current",
          payload: "charge_40",
          expected_revision: 1,
        },
      ]),
    ).rejects.toMatchObject({ message: "book_loop_conflict" });
  });
  it("paginates owner-scoped reads instead of truncating large archives", async () => {
    const range = vi
      .fn()
      .mockResolvedValueOnce({
        data: Array.from({ length: 500 }, (_, i) => ({
          kind: "dex",
          record_key: String(i),
          payload: {},
          revision: i + 1,
        })),
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            kind: "track",
            record_key: "current",
            payload: "read_along",
            revision: 501,
          },
        ],
        error: null,
      });
    const builder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range,
    };
    vi.mocked(supabase.from).mockReturnValue(builder as never);
    expect(await loadBookRecords("alice")).toHaveLength(501);
    expect(builder.eq).toHaveBeenCalledWith("user_id", "alice");
    expect(range.mock.calls).toEqual([
      [0, 499],
      [500, 999],
    ]);
  });
  it("does not issue an RPC for a no-op save", async () => {
    await saveBookChanges("alice", []);
    expect(supabase.rpc).not.toHaveBeenCalled();
  });
});
