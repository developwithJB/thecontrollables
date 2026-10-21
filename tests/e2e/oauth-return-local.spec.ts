import { test, expect } from "@playwright/test";
const owner = "00000000-0000-4000-8000-000000000001";
const user = {
  id: owner,
  email: "oauth-local@qa.invalid",
  aud: "authenticated",
  role: "authenticated",
  email_confirmed_at: "2026-10-21T00:00:00Z",
  app_metadata: { provider: "email" },
  user_metadata: {},
};
const headers = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "*",
  "access-control-allow-methods": "POST,GET,OPTIONS",
};
let requests: Record<string, unknown>[] = [];
test.beforeEach(async ({ page }) => {
  requests = [];
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (["localhost", "127.0.0.1"].includes(url.hostname))
      return route.continue();
    if (url.hostname.endsWith(".supabase.co")) {
      if (route.request().method() === "OPTIONS")
        return route.fulfill({ headers, body: "" });
      if (url.pathname.endsWith("/auth/v1/user"))
        return route.fulfill({ headers, json: user });
      if (url.pathname.endsWith("/functions/v1/wearable-oauth-callback")) {
        requests.push(route.request().postDataJSON());
        return route.fulfill({ headers, json: { provider: "fitbit" } });
      }
      return route.fulfill({ headers, json: [] });
    }
    return route.abort(); // No real provider, analytics or production traffic.
  });
});
async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/pricing");
  await page.evaluate(async (user) => {
    const path = "/src/integrations/supabase/client.ts";
    const { supabase } = await import(/* @vite-ignore */ path);
    const exp = Math.floor(Date.now() / 1000) + 86400;
    const token = [
      { alg: "HS256", typ: "JWT" },
      { sub: user.id, exp, role: "authenticated" },
      "synthetic",
    ]
      .map((p) =>
        btoa(typeof p === "string" ? p : JSON.stringify(p))
          .replace(/=/g, "")
          .replace(/\+/g, "-")
          .replace(/\//g, "_"),
      )
      .join(".");
    const { error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: "synthetic-local",
    });
    if (error) throw error;
  }, user);
}
const code = "synthetic-provider-code",
  state = "a".repeat(64),
  fragment = new URLSearchParams({ oauth_return: "wearable", code, state });
test("authenticated return strips code before rendering and finalizes once", async ({
  page,
}) => {
  await signIn(page);
  await page.goto("about:blank");
  await page.goto("/pricing#" + fragment);
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(
    page.getByText("Connection verified.", { exact: true }),
  ).toBeVisible();
  expect(requests).toEqual([{ code, state }]);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Start free. Choose your support." }),
  ).toBeVisible();
  expect(requests).toHaveLength(1);
});
test("signed-out return cannot exchange a provider code", async ({ page }) => {
  await page.goto("/pricing#" + fragment);
  await expect(page).toHaveURL(/\/pricing$/);
  await expect(
    page.getByText("Sign in, then restart the connection.", { exact: true }),
  ).toBeVisible();
  expect(requests).toHaveLength(0);
});
