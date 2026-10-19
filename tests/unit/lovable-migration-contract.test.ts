import {readFileSync} from "node:fs";
import {describe,expect,it} from "vitest";
const files=["20261020000100_strict_sabbath_rest.sql","20261020000200_coach_provider_settings.sql","20261020000300_hosted_coach_entitlement.sql"];
describe("Lovable release schema contract",()=>{
  it("uses the verified profile cascade for new coach tables",()=>{
    for(const name of files.slice(1)) {
      const sql=readFileSync(`supabase/migrations/${name}`,"utf8");
      expect(sql).not.toContain("REFERENCES auth.users");
      expect(sql).toContain("REFERENCES public.profiles(id) ON DELETE CASCADE");
    }
  });
  it("grants only intended service/client access before enabling RLS",()=>{
    for(const name of files) {
      const sql=readFileSync(`supabase/migrations/${name}`,"utf8");
      const tables=[...sql.matchAll(/CREATE TABLE public\.(\w+) \(/g)].map(m=>m[1]);
      for(const table of tables) {
        const start=sql.indexOf(`CREATE TABLE public.${table} (`);
        const rls=sql.indexOf(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY`,start);
        const grant=sql.indexOf(`ON public.${table} TO service_role`,start);
        expect(grant,table).toBeGreaterThan(start);expect(grant,table).toBeLessThan(rls);
      }
    }
  });
});
