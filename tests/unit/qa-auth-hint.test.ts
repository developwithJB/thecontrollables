// @vitest-environment jsdom
import { createElement } from "react";
import { act,create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { it,expect,vi } from "vitest";
import Auth from "@/pages/Auth";
vi.mock("@/hooks/useFormationEntryStatus",()=>({useFormationEntryStatus:()=>({data:{strictReady:false}})}));
vi.mock("@/hooks/useAnalytics",()=>({usePageViewTracking:()=>{},useAnalytics:()=>({trackEvent:vi.fn()})}));
vi.mock("@/hooks/useOnboardingAnalytics",()=>({useOnboardingAnalytics:()=>({trackOnboardingEvent:vi.fn()})}));
vi.mock("@/lib/growthEvents",()=>({trackGrowthEvent:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:{getSession:async()=>({data:{session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})}}}));
it.each(["signin","signup"])("password guidance is conditional in %s",async mode=>{
 let tree:ReturnType<typeof create>; await act(async()=>{tree=create(createElement(MemoryRouter,{initialEntries:[`/auth?mode=${mode}`]},createElement(Auth)));});
 expect(tree!.root.findAllByProps({id:"password-help"})).toHaveLength(mode==="signup"?1:0);
 const input=tree!.root.findAllByType("input").find(n=>n.props.id==="password")!;
 expect(input.props["aria-describedby"]).toBe(mode==="signup"?"password-help":undefined); act(()=>tree!.unmount());
});
