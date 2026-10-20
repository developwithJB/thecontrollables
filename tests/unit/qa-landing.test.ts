// @vitest-environment jsdom
import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { it, expect, vi } from "vitest";
import Landing from "@/pages/Landing";
import { useFormationEntryStatus } from "@/hooks/useFormationEntryStatus";
vi.mock("@/hooks/useFormationEntryStatus", () => ({ useFormationEntryStatus: vi.fn() }));
vi.mock("@/hooks/useAnalytics", () => ({ usePageViewTracking: () => {}, useAnalytics: () => ({ trackEvent: vi.fn() }) }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }) } } }));
vi.mock("@/components/onboarding/FormationAvailability", () => ({ FormationAvailability: () => null }));
vi.mock("@/components/onboarding/ScripturePractice", () => ({ ScripturePractice: () => null }));
it.each([false,true,undefined])("landing chooses safe primary CTA when strictReady=%s", async ready => {
  vi.mocked(useFormationEntryStatus).mockReturnValue({ data: ready === undefined ? undefined : { strictReady:ready }, error: ready === undefined ? new Error("offline") : null } as ReturnType<typeof useFormationEntryStatus>);
  let tree: ReturnType<typeof create>;
  await act(async () => { tree = create(createElement(MemoryRouter, null, createElement(Landing))); await new Promise(r=>setTimeout(r,5)); });
  const cta = tree!.root.findAllByType("a").find(a=>a.props["data-testid"] === "cta-get-started")!;
  expect(cta.props.href).toContain(ready ? "fully_charged_75" : "read_along");
  expect(JSON.stringify(cta.children.map(c=>typeof c === "string" ? c : ""))).toContain(ready ? "Begin my covenant" : "Start with Read Along");
  act(()=>tree!.unmount());
});
