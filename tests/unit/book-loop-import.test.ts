import { createElement, useContext, type ReactNode } from "react";
import { act, create, type ReactTestRenderer } from "react-test-renderer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { BookLoopProvider } from "@/components/BookLoopProvider";
import { BookLoopContext } from "@/hooks/useBookLoopState";
import { importBookRecords, loadBookRecords } from "@/data/bookLoop/repository";
import { getFeatureFlag } from "@/lib/featureFlags";
import { isDevMockAuthEnabled } from "@/lib/devMockAuth";
import { importDecisionKey } from "@/data/bookLoop/local";

vi.mock("@/data/bookLoop/repository", () => ({
  loadBookRecords: vi.fn(),
  importBookRecords: vi.fn(),
}));
vi.mock("@/lib/featureFlags", () => ({ getFeatureFlag: vi.fn() }));
vi.mock("@/lib/devMockAuth", () => ({ isDevMockAuthEnabled: vi.fn() }));
vi.mock("@/components/ui/dialog", () => {
  const Box = ({ children, ...props }: { children: ReactNode }) =>
    createElement("div", props, children);
  return {
    Dialog: Box,
    DialogContent: Box,
    DialogDescription: Box,
    DialogHeader: Box,
    DialogTitle: Box,
    DialogFooter: Box,
  };
});
vi.mock("@/components/ui/button", () => ({
  Button: ({ children, ...props }: { children: ReactNode }) =>
    createElement("button", props, children),
}));
let renderer: ReactTestRenderer;
let client: QueryClient;
let values: Map<string, string>;
let renderedUser: string | null | undefined;
const storage = {
  get length() {
    return values.size;
  },
  key: (i: number) => [...values.keys()][i] ?? null,
  getItem: (k: string) => values.get(k) ?? null,
  setItem: (k: string, v: string) => {
    values.set(k, v);
  },
  removeItem: (k: string) => {
    values.delete(k);
  },
};
const settle = async () => {
  await act(async () => {
    await new Promise((r) => setTimeout(r, 15));
  });
};
function start(userId: string | null = "alice") {
  function Child() {
    renderedUser = useContext(BookLoopContext);
    return createElement("p", null, "Book page");
  }
  act(() => {
    renderer = create(
      createElement(
        QueryClientProvider,
        { client },
        createElement(BookLoopProvider, {
          userId,
          children: createElement(Child),
        }),
      ),
    );
  });
}
async function click(label: string) {
  const button = renderer.root
    .findAllByType("button")
    .find((node) => node.children.join("") === label)!;
  expect(button).toBeDefined();
  await act(async () => {
    button.props.onClick();
    await new Promise((r) => setTimeout(r, 20));
  });
}
beforeEach(() => {
  vi.clearAllMocks();
  values = new Map([["formation_selected_track_alice", "charge_40"], ["control_release_move_alice_2026-10-19", JSON.stringify({ control: "My response" })]]);
  renderedUser = undefined;
  vi.stubGlobal("localStorage", storage);
  vi.mocked(getFeatureFlag).mockReturnValue(true);
  vi.mocked(isDevMockAuthEnabled).mockReturnValue(false);
  vi.mocked(loadBookRecords).mockResolvedValue([]);
  vi.mocked(importBookRecords).mockResolvedValue();
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
});
afterEach(() => {
  if (renderer) act(() => renderer.unmount());
  client.clear();
  vi.unstubAllGlobals();
});

describe("book-loop import confirmation", () => {
  it("mounts children but never imports before explicit confirmation", async () => {
    start();
    await settle();
    expect(importBookRecords).not.toHaveBeenCalled();
    expect(renderedUser).toBe("alice");
    await click("Import browser progress");
    expect(importBookRecords).toHaveBeenCalledWith(
      "alice",
      expect.stringMatching(/^[a-f0-9]{64}$/),
      expect.arrayContaining([{ kind: "track", record_key: "current", payload: "charge_40" }]),
    );
    expect(values.get("formation_selected_track_alice")).toBe("charge_40");
    expect(values.get(importDecisionKey("alice"))).toBe("imported");
    expect(renderedUser).toBe("alice");
  });
  it("declines without transferring data or deleting the browser backup", async () => {
    start();
    await settle();
    await click("Use server data without importing");
    expect(importBookRecords).not.toHaveBeenCalled();
    expect(values.get("formation_selected_track_alice")).toBe("charge_40");
    expect(values.get(importDecisionKey("alice"))).toBe("declined");
    expect(renderedUser).toBe("alice");
  });
  it("retries a failed import with the same id, retaining data and withholding success", async () => {
    vi.mocked(importBookRecords).mockRejectedValueOnce(new Error("offline"));
    start();
    await settle();
    await click("Import browser progress");
    expect(values.has(importDecisionKey("alice"))).toBe(false);
    expect(renderedUser).toBe("alice");
    expect(values.get("formation_selected_track_alice")).toBe("charge_40");
    await click("Import browser progress");
    expect(vi.mocked(importBookRecords).mock.calls[0]).toEqual(
      vi.mocked(importBookRecords).mock.calls[1],
    );
    expect(renderedUser).toBe("alice");
  });
  it("dismisses for later without writing a decision", async () => {
    start(); await settle();
    const dialog = renderer.root.findAllByType("div").find(node => node.props.onOpenChange);
    act(() => dialog!.props.onOpenChange(false));
    expect(values.has(importDecisionKey("alice"))).toBe(false);
    expect(renderedUser).toBe("alice");
  });
  it("does not interrupt setup-only accounts", async () => {
    values.delete("control_release_move_alice_2026-10-19");
    start(); await settle();
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(values.get(importDecisionKey("alice"))).toBe("empty");
  });
  it("logs storage errors and continues without asking", async () => {
    vi.spyOn(storage, "getItem").mockImplementationOnce(() => { throw new Error("blocked"); });
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    start(); await settle();
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(renderedUser).toBe("alice"); expect(warn).toHaveBeenCalled();
    vi.restoreAllMocks();
  });
  it("does not ask again after a saved import decision", async () => {
    values.set(importDecisionKey("alice"), "imported");
    start();
    await settle();
    expect(renderer.root.findAllByType("button")).toHaveLength(0);
    expect(renderedUser).toBe("alice");
    expect(importBookRecords).not.toHaveBeenCalled();
  });
  it("never uses another account's import decision", async () => {
    values.set(importDecisionKey("bob"), "imported");
    start();
    await settle();
    expect(renderedUser).toBe("alice");
    expect(renderer.root.findAllByType("button")).toHaveLength(2);
  });
  it("does not load server data or ask to import when disabled", async () => {
    vi.mocked(getFeatureFlag).mockReturnValue(false);
    start();
    await settle();
    expect(loadBookRecords).not.toHaveBeenCalled();
    expect(renderedUser).toBeNull();
  });
  it("keeps mock-auth sessions local even with the flag enabled", async () => {
    vi.mocked(isDevMockAuthEnabled).mockReturnValue(true);
    start();
    await settle();
    expect(loadBookRecords).not.toHaveBeenCalled();
    expect(renderedUser).toBeNull();
  });
  it("keeps signed-out sessions local", async () => {
    start(null);
    await settle();
    expect(loadBookRecords).not.toHaveBeenCalled();
    expect(renderedUser).toBeNull();
  });
  it("blocks cloud editing on a failed initial load instead of silently falling back", async () => {
    vi.mocked(loadBookRecords).mockRejectedValue(
      new Error("missing migration"),
    );
    start();
    await settle();
    expect(renderedUser).toBe("alice");
    expect(importBookRecords).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({ role: "alert" })).toHaveLength(1);
  });
});
