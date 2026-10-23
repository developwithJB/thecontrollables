import React from "react";
import {renderToStaticMarkup} from "react-dom/server";
import {CampaignHtmlPreview} from "../../src/components/admin/CampaignHtmlPreview";
import { test, expect } from "@playwright/test";
test.use({reducedMotion:"reduce"});
test("formation count follows a saved practice across existing surfaces without a reload",async({page})=>{
 await page.route("**/*",route=>{const url=new URL(route.request().url());return ["127.0.0.1","localhost"].includes(url.hostname)?route.continue():route.abort();});
 await page.goto("/my-controllables");
 await expect(page.getByText("Formation practices recorded: 0")).toBeVisible();
 await page.getByRole("button",{name:"Today",exact:true}).click();
 await page.getByRole("button",{name:"Open Awareness",exact:true}).click();
 await page.getByLabel("One honest truth",{exact:true}).fill("Synthetic QA practice for persistence checks.");
 await page.getByRole("button",{name:"Save progress",exact:true}).click();
 await expect(page.getByText("Awareness is recorded for today.")).toBeVisible();
 for(const name of ["My","Train","Reflect","Evidence"]){
   await page.getByRole("navigation").getByRole("button",{name,exact:true}).click();
   await expect(page.getByText("Formation practices recorded: 1")).toBeVisible();
   if(name==="My")await expect(page.getByText("0 XP",{exact:true})).toBeVisible();
   if(name==="Train")await expect(page.getByText("Mission delayed",{exact:true})).toHaveCount(0);
 }
 await settled(page, "h1");
 await page.screenshot({path:"output/ux-2026-10-23/pr-a-count.png"});
});
async function settled(page: import("@playwright/test").Page, selector:string){ await expect.poll(()=>page.locator(selector).evaluate(el=>{let opacity=1;for(let n:Element|null=el;n;n=n.parentElement)opacity*=Number(getComputedStyle(n).opacity);return opacity;})).toBe(1); }
test("mobile non-strict receipt persists only a display acknowledgement and public entry is clean", async ({page}) => {
  const external:string[]=[];
  await page.route("**/*", route => {
    const url=new URL(route.request().url());
    if(url.hostname === "127.0.0.1" || url.protocol === "data:") return route.continue();
    external.push(url.pathname); return route.abort();
  });
  const started=Date.now();
  await page.goto("/formation/today");
  await expect(page.getByRole("heading",{name:"Practice what you can control."})).toBeVisible();
  console.log(`QA Today shell ${Date.now()-started}ms`);
  await page.evaluate(async()=> {
    const circuitPath="/src/domain/formation/circuits.ts", repoPath="/src/data/formation/circuitRepository.ts", authPath="/src/lib/devMockAuth.ts", rulePath="/src/domain/formation/circuitRules.ts";
    const {CIRCUIT_TYPES,createEmptyCircuitDraft}=await import(circuitPath);
    const {saveFormationCircuit}=await import(repoPath); const {DEV_MOCK_USER_ID}=await import(authPath); const {getLocalDate}=await import(rulePath);
    const actions=["scripture_opened","prayer_practiced","main_promise_completed","sleep_preparation","service_completed"];
    for (const [i,circuit] of CIRCUIT_TYPES.entries()) { const draft=createEmptyCircuitDraft(); draft.actions[actions[i]]=true; await saveFormationCircuit({userId:DEV_MOCK_USER_ID,track:"read_along",circuit,localDate:getLocalDate(),draft,localOnly:true}); }
  });
  await page.reload();
  const receipt=page.getByTestId("practice-day-receipt"); await expect(receipt).toContainText("Day complete"); await expect(page.getByTestId("next-practice")).toHaveCount(0);
  await page.getByRole("button",{name:"Close today",exact:true}).click(); await page.reload(); await expect(page.getByRole("button",{name:"Today acknowledged"})).toBeDisabled();
  expect(external.some(path=>path.includes("close_fully_charged_day"))).toBe(false);
  await settled(page,"h1"); await page.screenshot({path:"docs/qa/pr1/today-mobile.png",fullPage:true});
  await page.goto("/my-controllables"); await expect(page.getByText("Formation practices recorded: 5")).toBeVisible(); await expect(page.getByText("0 XP",{exact:true})).toBeVisible();
  await page.goto("/evidence"); await expect(page.getByText("Formation practices recorded: 5")).toBeVisible();
  // Local rendering fixture for an unreviewed server response; production gates are unchanged.
  await page.route("**/src/hooks/useFormationEntryStatus.ts", route => route.fulfill({contentType:"application/javascript",body:'export function useFormationEntryStatus(){return {data:{strictReady:false,reviewedDays:0,emailDeliveryReady:false,sample:null},isLoading:false,error:null};}'}));
  await page.goto("/"); await expect(page.getByTestId("cta-get-started")).toBeVisible(); await expect(page.getByTestId("cta-get-started")).toContainText("Start with Read Along"); await settled(page,'[data-testid="cta-get-started"]'); await page.screenshot({path:"docs/qa/pr1/landing-mobile.png"});
  await page.goto("/auth?mode=signup"); await expect(page.getByTestId("auth-form")).toBeVisible(); await settled(page,'[data-testid="auth-form"]'); await page.screenshot({path:"docs/qa/pr1/auth-mobile.png",fullPage:true});
});

test("legacy daily and weekly surfaces identify personal reports without calling a sender",async({page})=>{
 const outbound:string[]=[];
 await page.route("**/*",route=>{const url=new URL(route.request().url());if(url.hostname==="127.0.0.1"||url.protocol==="data:")return route.continue();outbound.push(url.pathname);return route.abort();});
 for(const path of ["/train","/growth","/reflect"]){
  await page.goto(path);
  await expect(page.getByText("Based on your personal reports. This does not verify effort or award strict 75-day credit.",{exact:true}).first()).toBeVisible();
 }
 expect(outbound.some(path=>path.includes("send-push-nudge")||path.includes("send-daily-nudge"))).toBe(false);
});

test("campaign preview blocks markup scripts and parent-origin access",async({page})=>{
 const attack=`<p>Preview text</p><script>parent.postMessage("campaign-attack","*")</script><img src="/preview-fail" onerror='parent.postMessage("campaign-attack","*")'>`;
 const markup=renderToStaticMarkup(React.createElement(CampaignHtmlPreview,{html:attack}));
 await page.route("**/__campaign-preview-test",route=>route.fulfill({contentType:"text/html",body:'<script>window.__campaignAttack=false;addEventListener("message",e=>{if(e.data==="campaign-attack")window.__campaignAttack=true})</script>'+markup}));
 await page.route("**/preview-fail",route=>route.abort());
 await page.goto("/__campaign-preview-test");
 const frame=page.frameLocator('iframe[title="Campaign email preview"]');await expect(frame.getByText("Preview text",{exact:true})).toBeVisible();
 const child=page.frames().find(f=>f.parentFrame());await child?.waitForLoadState("load");
 expect(await page.evaluate(()=>Reflect.get(window,"__campaignAttack"))).toBe(false);
 expect(await page.locator('iframe').getAttribute('sandbox')).toBe("");
 expect(await page.evaluate(()=>document.querySelector('iframe')?.contentDocument===null)).toBe(true);
});
