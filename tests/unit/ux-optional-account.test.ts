// @vitest-environment jsdom
import { renderHook, act, waitFor, cleanup } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
const mocks=vi.hoisted(()=>({getSession:vi.fn(),onAuthStateChange:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{auth:mocks}}));
import { useOptionalAccount } from "@/hooks/useOptionalAccount";
afterEach(()=>{cleanup();vi.clearAllMocks();});
it("loads the current session on a public page without redirecting or mutating it",async()=>{
 const unsubscribe=vi.fn();mocks.onAuthStateChange.mockReturnValue({data:{subscription:{unsubscribe}}});mocks.getSession.mockResolvedValue({data:{session:{user:{id:"synthetic-owner"}}}});
 const hook=renderHook(useOptionalAccount);await waitFor(()=>expect(hook.result.current.isLoading).toBe(false));expect(hook.result.current.user?.id).toBe("synthetic-owner");hook.unmount();expect(unsubscribe).toHaveBeenCalledOnce();
});
it("does not restore a stale initial owner after a newer sign-out event",async()=>{
 let finish!:(value:unknown)=>void;let changed!:(_event:string,session:null)=>void;
 mocks.getSession.mockImplementation(()=>new Promise(resolve=>finish=resolve));mocks.onAuthStateChange.mockImplementation(callback=>{changed=callback;return {data:{subscription:{unsubscribe:vi.fn()}}};});
 const hook=renderHook(useOptionalAccount);act(()=>changed("SIGNED_OUT",null));await act(async()=>finish({data:{session:{user:{id:"previous-owner"}}}}));expect(hook.result.current.user).toBeNull();expect(hook.result.current.isLoading).toBe(false);
});
