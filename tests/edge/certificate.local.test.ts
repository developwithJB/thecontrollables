// Existing owner certificate paths only: no upload, inference or external network.
const owner = "00000000-0000-4000-8000-000000000001";
for (const [k, v] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
  SUPABASE_ANON_KEY: "synthetic-anon",
}))
  Deno.env.set(k, v);
let handler: (req: Request) => Promise<Response>,
  authorized = true,
  owned = true,
  season = false;
let validDays = true,
  seasonComplete = true;
let calls: { path: string; body: Record<string, unknown>; query: string }[] =
  [];
const originalServe = Deno.serve;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
  return {};
}) as typeof Deno.serve;
globalThis.fetch = async (input, init) => {
  const u = new URL(String(input));
  if (u.hostname !== "synthetic.supabase.invalid")
    throw Error("NETWORK DENIED");
  const body = init?.body ? JSON.parse(String(init.body)) : {};
  calls.push({ path: u.pathname, body, query: u.search });
  let data: unknown = null,
    status = 200;
  if (u.pathname === "/auth/v1/user") {
    data = authorized
      ? { id: owner, email: "synthetic@qa.invalid" }
      : { message: "invalid" };
    status = authorized ? 200 : 401;
  } else if (u.pathname === "/rest/v1/seasons")
    data = owned
      ? {
          id: "season-local",
          user_id: owner,
          status: seasonComplete ? "completed" : "active",
          started_at: "2026-01-01",
          completed_at: "2026-03-01",
        }
      : null;
  else if (u.pathname === "/rest/v1/reset_sessions")
    data = owned
      ? {
          id: "session-local",
          user_id: owner,
          status: "completed",
          start_date: "2026-01-01",
        }
      : null;
  else if (u.pathname === "/rest/v1/daily_resets")
    data = Array.from({ length: 7 }, (_, i) => ({
      day_number: validDays ? i + 1 : 1,
    }));
  else if (u.pathname === "/rest/v1/profiles")
    data = { display_name: "Synthetic QA" };
  else if (u.pathname === "/rest/v1/certificates")
    data = {
      id: "cert-local",
      certificate_url: "old-public-url",
      reflection_text: "private owner reflection",
    };
  else if (u.pathname.startsWith("/storage/v1/object/sign/certificates/"))
    data = {
      signedURL:
        "/object/sign/certificates/" +
        owner +
        "/" +
        (season ? "season-" : "") +
        "cert-local.svg?token=synthetic",
    };
  else throw Error("UNMOCKED NETWORK DENIED " + u.pathname);
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });
};
await import("../../supabase/functions/generate-certificate/index.ts");
Deno.serve = originalServe;
const assert = (v: unknown) => {
  if (!v) throw Error("assertion failed");
};
function request() {
  return new Request("http://localhost/generate-certificate", {
    method: "POST",
    headers: {
      Authorization: "Bearer synthetic-owner",
      "content-type": "application/json",
    },
    body: JSON.stringify(
      season
        ? { type: "season", season_id: "season-local" }
        : { reset_session_id: "session-local" },
    ),
  });
}
for (const kind of ["snapshot", "season"])
  Deno.test(
    kind + " existing certificate signs owner path for five minutes",
    async () => {
      authorized = true;
      owned = true;
      season = kind === "season";
      calls = [];
      const r = await handler(request());
      assert(r.status === 200);
      const result = await r.json();
      assert(
        result.certificate_url.includes(
          "/object/sign/certificates/" + owner + "/",
        ),
      );
      const signing = calls.find((c) => c.path.includes("/object/sign/"))!;
      assert(signing.body.expiresIn === 300);
      assert(
        calls
          .find((c) => c.path === "/rest/v1/certificates")!
          .query.includes("user_id=eq." + owner),
      );
    },
  );
Deno.test("foreign season cannot obtain a certificate signature", async () => {
  authorized = true;
  owned = false;
  season = true;
  calls = [];
  const r = await handler(request());
  assert(r.status === 404);
  assert(!calls.some((c) => c.path.includes("/storage/")));
});
Deno.test("invalid auth cannot read or sign certificates", async () => {
  authorized = false;
  owned = true;
  calls = [];
  assert((await handler(request())).status === 401);
  assert(
    !calls.some(
      (c) => c.path.includes("/rest/") || c.path.includes("/storage/"),
    ),
  );
});

Deno.test(
  "duplicate day rows cannot satisfy seven distinct completed days",
  async () => {
    authorized = true;
    owned = true;
    season = false;
    validDays = false;
    calls = [];
    const r = await handler(request());
    if (r.status !== 400 || calls.some((c) => c.path.includes("/storage/")))
      throw Error("Distinct days required");
    validDays = true;
  },
);
Deno.test(
  "an active season cannot issue a completed-season certificate",
  async () => {
    authorized = true;
    owned = true;
    season = true;
    seasonComplete = false;
    calls = [];
    const r = await handler(request());
    if (r.status !== 409 || calls.some((c) => c.path.includes("/storage/")))
      throw Error("Completed season required");
    seasonComplete = true;
  },
);
