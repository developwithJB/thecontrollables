// Ephemeral release helper: invokes send-daily-nudge with service-role auth.
// Deployed and deleted as part of PR #37 production release.
Deno.serve(async (req) => {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const body = await req.text();
  const resp = await fetch(`${url}/functions/v1/send-daily-nudge`, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${key}`,
      "Content-Type": "application/json",
      "apikey": key,
    },
    body,
  });
  const text = await resp.text();
  return new Response(text, {
    status: resp.status,
    headers: { "Content-Type": "application/json" },
  });
});
