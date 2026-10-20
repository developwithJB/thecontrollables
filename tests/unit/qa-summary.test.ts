import { createElement } from "react";
import { act, create } from "react-test-renderer";
import { expect, it, vi } from "vitest";
import { FormationPracticeSummary } from "@/components/formation/FormationPracticeSummary";
import { useFormationPracticeSummary } from "@/hooks/useFormationPracticeSummary";
vi.mock("@/hooks/useFormationPracticeSummary",()=>({useFormationPracticeSummary:vi.fn()}));
it("shows formation records beside unchanged empty legacy figures and does not claim zero on errors",()=>{
 vi.mocked(useFormationPracticeSummary).mockReturnValue({total:5,days:1,perCircuit:{},isLoading:false,error:null});
 let tree:ReturnType<typeof create>; act(()=>{tree=create(createElement(FormationPracticeSummary,{userId:"qa",legacyEmpty:true}));});
 expect(JSON.stringify(tree!.toJSON())).toContain("Formation practices recorded: "); expect(JSON.stringify(tree!.toJSON())).toContain("Formation practices are counted separately.");
 vi.mocked(useFormationPracticeSummary).mockReturnValue({total:0,days:0,perCircuit:{},isLoading:false,error:new Error("offline")});
 act(()=>tree!.update(createElement(FormationPracticeSummary,{userId:"qa",legacyEmpty:true})));
 expect(JSON.stringify(tree!.toJSON())).toContain("Unavailable"); act(()=>tree!.unmount());
});
