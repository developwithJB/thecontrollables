const originalServe = Deno.serve;
let handler: (req: Request) => Promise<Response>;
Deno.serve = ((fn: typeof handler) => {
  handler = fn;
  return {};
}) as typeof Deno.serve;
for (const [k, v] of Object.entries({
  SUPABASE_URL: "https://synthetic.supabase.invalid",
  SUPABASE_ANON_KEY: "synthetic-anon",
  SUPABASE_SERVICE_ROLE_KEY: "synthetic-service",
}))
  Deno.env.set(k, v);
let role = false;
let writes = 0;
globalThis.fetch = async (input, init) => {
  const u = new URL(String(input));
  if (u.hostname !== "synthetic.supabase.invalid")
    throw Error("NETWORK DENIED");
  if (init?.method && init.method !== "GET") writes++;
  const data =
    u.pathname === "/auth/v1/user"
      ? {
          id: "00000000-0000-4000-8000-000000000001",
          email: "developwithjb@gmail.com",
        }
      : u.pathname === "/rest/v1/user_roles"
        ? role
          ? { role: "admin" }
          : null
        : null;
  return new Response(JSON.stringify(data), {
    headers: { "content-type": "application/json" },
  });
};
await import("../../supabase/functions/admin-users/index.ts");
Deno.serve = originalServe;
Deno.test(
  "an auto-confirmed bootstrap email can never self-assign admin",
  async () => {
    role = false;
    writes = 0;
    const r = await handler(
      new Request("http://localhost/admin-users?action=verify_admin", {
        headers: { Authorization: "Bearer synthetic-user" },
      }),
    );
    if (r.status !== 403 || writes !== 0)
      throw Error("Email bootstrap must be forbidden");
  },
);
Deno.test("existing UUID admin role remains authorized", async () => {
  role = true;
  writes = 0;
  const r = await handler(
    new Request("http://localhost/admin-users?action=verify_admin", {
      headers: { Authorization: "Bearer synthetic-user" },
    }),
  );
  if (r.status !== 200 || (await r.json()).isAdmin !== true || writes !== 0)
    throw Error("Existing admin role must be retained");
});
