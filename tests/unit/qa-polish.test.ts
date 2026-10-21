import { createElement, useContext, type ReactNode } from "react";
import { act,create } from "react-test-renderer";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe,it,expect,vi } from "vitest";
import { BookLink } from "@/components/BookLink";
import { BOOK_URL } from "@/lib/bookLinks";
import { trackGrowthEvent } from "@/lib/growthEvents";
import { ProfileMenu } from "@/components/layout/ProfileMenu";
import { BottomNav } from "@/components/layout/BottomNav";
import { FormationBookBoundary } from "@/components/formation/FormationBookBoundary";
import { BookLoopContext } from "@/hooks/useBookLoopState";
import { renderToStaticMarkup } from "react-dom/server";
import { WhyStartSection } from "@/components/landing/WhyStartSection";
import { TrustDisclosure } from "@/components/landing/TrustDisclosure";
import { AIOperatorIntro } from "@/components/dashboard/AIOperatorIntro";
import { OnboardingWelcome } from "@/components/onboarding/OnboardingWelcome";
vi.mock("@/lib/devMockAuth",()=>({isDevMockAuthEnabled:()=>false}));
vi.mock("@/lib/featureFlags",()=>({getFeatureFlag:()=>true,formationCircuitsEnabled:()=>true}));
vi.mock("@/lib/growthEvents",()=>({trackGrowthEvent:vi.fn()}));
vi.mock("@/components/BookLoopProvider",()=>({BookLoopProvider:()=>createElement("p",null,"Loading book data")}));
vi.mock("@/components/ui/dropdown-menu",()=>{const Box=({children,...props}:{children:ReactNode})=>createElement("div",props,children); return {DropdownMenu:Box,DropdownMenuTrigger:Box,DropdownMenuContent:Box,DropdownMenuItem:Box};});
describe("QA polish boundaries",()=>{
 it("describes AI as optional assistance without claiming model training",()=>{
  const html=renderToStaticMarkup(createElement("div",null,createElement(TrustDisclosure),createElement(AIOperatorIntro,{onDismiss:()=>{}})));
  expect(html).toContain("Optional AI coaching.");
  expect(html).toContain("AI responses can be wrong.");
  expect(html).not.toMatch(/trained on|not generic chatbots/i);
 });

 it.each(["formation_today","formation_circuit"] as const)("tracks the shared book destination at %s",placement=>{
  let tree:ReturnType<typeof create>; act(()=>{tree=create(createElement(BookLink,{placement,children:"Get the book"}));});
  const link=tree!.root.findByType("a"); expect(link.props.href).toBe(BOOK_URL); act(()=>link.props.onClick()); expect(trackGrowthEvent).toHaveBeenCalledWith("book_link_click",{placement}); act(()=>tree!.unmount());
 });
 it("exposes sign out in profile menu and mobile navigation without settings",()=>{
  const signOut=vi.fn(),settings=vi.fn(); let tree:ReturnType<typeof create>;
  act(()=>{tree=create(createElement(MemoryRouter,null,createElement(ProfileMenu,{onSignOut:signOut,onSettings:settings}),createElement(BottomNav,{onSignOut:signOut})));});
  const menu=tree!.root.findAllByType("div").find(n=>n.props.onSelect===signOut)!; act(()=>menu.props.onSelect());
  const mobile=tree!.root.findAllByType("button").find(n=>n.props.onClick===signOut)!; act(()=>mobile.props.onClick());
  expect(signOut).toHaveBeenCalledTimes(2); expect(settings).not.toHaveBeenCalled(); act(()=>tree!.unmount());
 });
 it("renders Formation immediately with authenticated book context, keeping other routes on their book boundary",()=>{
  const client=new QueryClient(); function Child(){return createElement("p",null,`Formation ${useContext(BookLoopContext)}`);}
  let tree:ReturnType<typeof create>; const render=(formation:boolean)=>createElement(QueryClientProvider,{client},createElement(FormationBookBoundary,{userId:"alice",formation,children:createElement(Child)}));
  act(()=>{tree=create(render(true));}); expect(JSON.stringify(tree!.toJSON())).toContain("Formation alice"); expect(JSON.stringify(tree!.toJSON())).not.toContain("Loading book data");
  act(()=>tree!.update(render(false))); expect(JSON.stringify(tree!.toJSON())).toContain("Loading book data"); act(()=>tree!.unmount());client.clear();
 });
 it("renders clear welcome copy without implementation jargon",()=>{
  const html=renderToStaticMarkup(createElement("div",null,createElement(WhyStartSection),createElement(OnboardingWelcome,{onContinue:()=>{},onSkip:()=>{}})));
  expect(html).not.toMatch(/Life OS|idempotent/i); expect(html).toContain("The Dashboard will suggest");
 });
});
