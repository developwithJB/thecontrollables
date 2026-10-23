// @vitest-environment jsdom
import { createElement } from "react";
import { renderHook, waitFor, act, cleanup } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { afterEach, expect, it, vi } from "vitest";
import type { FormationCircuitEntry } from "@/domain/formation/circuits";
import { createEmptyCircuitDraft } from "@/domain/formation/circuits";
const mocks=vi.hoisted(()=>({history:[] as FormationCircuitEntry[]}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{}}));
vi.mock("@/lib/devMockAuth",()=>({isDevMockAuthEnabled:()=>true}));
vi.mock("@/data/formation/circuitRepository",()=>({loadFormationCircuitHistory:async(_id:string,track:string)=>mocks.history.filter(e=>e.track===track),saveFormationCircuit:async(input:FormationCircuitEntry)=>{const entry={...input,userId:"qa",updatedAt:"2026-10-23",completedActionIds:["honest_truth_saved"],completionState:"recorded"};mocks.history=[entry] as FormationCircuitEntry[];return entry;}}));
import { useFormationCircuits } from "@/hooks/useFormationCircuits";
import { useFormationPracticeSummary } from "@/hooks/useFormationPracticeSummary";
afterEach(cleanup);
it("refreshes an already-mounted summary after a save without navigation or reload",async()=>{
 mocks.history=[];
 const client=new QueryClient({defaultOptions:{queries:{retry:false}}});
 const wrapper=({children}:{children:React.ReactNode})=>createElement(QueryClientProvider,{client},children);
 const result=renderHook(()=>({circuits:useFormationCircuits("qa","read_along"),summary:useFormationPracticeSummary("qa")}),{wrapper});
 await waitFor(()=>expect(result.result.current.summary.isLoading).toBe(false));
 expect(result.result.current.summary.total).toBe(0);
 await act(async()=>{await result.result.current.circuits.saveCircuit({localDate:"2026-10-23",circuit:"awareness",draft:createEmptyCircuitDraft()});});
 await waitFor(()=>expect(result.result.current.summary.total).toBe(1));
 expect(result.result.current.summary.byDate["2026-10-23"]).toBe(1);
});
