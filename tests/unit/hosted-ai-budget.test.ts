import { describe, it, expect, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import {
  boundedHostedRequest,
  createBudgetedGateway,
  GATEWAY_URL,
} from "../../supabase/functions/_shared/hostedAiBudget";
const body = JSON.stringify({
  model: "expensive-model",
  messages: [{ role: "user", content: "Hello" }],
  max_tokens: 900000,
  stream: true,
  web_search_options: {},
});
describe("shared hosted inference budget", () => {
  it("fixes model, caps output and removes streaming, paid search and caller overrides", () => {
    const request = boundedHostedRequest(body);
    const parsed = JSON.parse(request.body);
    expect(parsed.model).toBe("google/gemini-3.1-flash-lite");
    expect(parsed.max_tokens).toBe(1000);
    expect(parsed.stream).toBe(false);
    expect(parsed.web_search_options).toBeUndefined();
    expect(request.costMicros).toBeGreaterThan(3125);
  });
  it("counts Unicode bytes and tool schemas, and rejects oversized contexts before spending", () => {
    const request = {
      messages: [{ role: "user", content: "🦉".repeat(5000) }],
    };
    expect(() => boundedHostedRequest(JSON.stringify(request))).toThrow(
      "hosted_context_too_large",
    );
    expect(() =>
      boundedHostedRequest(
        JSON.stringify({
          messages: [{ role: "user", content: "hi" }],
          tools: [
            { type: "function", function: { description: "x".repeat(17000) } },
          ],
        }),
      ),
    ).toThrow("hosted_context_too_large");
  });
  it.each(["https://private.example/image.jpg", "data:audio/wav;base64,AAAA"])(
    "rejects unsupported media %s",
    (url) => {
      expect(() =>
        boundedHostedRequest(
          JSON.stringify({
            messages: [
              {
                role: "user",
                content: [{ type: "image_url", image_url: { url } }],
              },
            ],
          }),
        ),
      ).toThrow("unsupported_hosted_image");
    },
  );
  it("bounds image dimensions and reserves image tokens independently from compression", () => {
    const png = Buffer.alloc(24);
    png.set([137, 80, 78, 71]);
    png.writeUInt32BE(1024, 16);
    png.writeUInt32BE(1024, 20);
    const request = () =>
      JSON.stringify({
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${png.toString("base64")}`,
                },
              },
            ],
          },
        ],
      });
    expect(boundedHostedRequest(request()).costMicros).toBeGreaterThan(9000);
    png.writeUInt32BE(10000, 16);
    expect(() => boundedHostedRequest(request())).toThrow(
      "hosted_image_too_large",
    );
  });
  it.each([
    { data: null, error: Error("db down") },
    { data: { allowed: false, code: "hosted_ai_budget_reached" }, error: null },
  ])(
    "never contacts a paid provider when authority is unavailable or rejects",
    async (result) => {
      const upstream = vi.fn();
      const gateway = createBudgetedGateway(
        "owner",
        "ai-chat",
        vi.fn().mockResolvedValue(result),
        upstream,
      );
      await gateway(GATEWAY_URL, { method: "POST", body }).catch(
        () => undefined,
      );
      expect(upstream).not.toHaveBeenCalled();
    },
  );
  it("reserves before each pass, shares one chat ID, retains failures and never retries", async () => {
    const calls: string[] = [];
    const rpc = vi.fn(async () => {
      calls.push("reserve");
      return { data: { allowed: true }, error: null };
    });
    const upstream = vi.fn(async () => {
      calls.push("fetch");
      throw Error("timeout");
    });
    const gateway = createBudgetedGateway("owner", "ai-chat", rpc, upstream);
    await expect(
      gateway(GATEWAY_URL, { method: "POST", body }),
    ).rejects.toThrow("timeout");
    await expect(
      gateway(GATEWAY_URL, { method: "POST", body }),
    ).rejects.toThrow("timeout");
    expect(calls).toEqual(["reserve", "fetch", "reserve", "fetch"]);
    expect(rpc.mock.calls[0][1].p_chat_request_id).toEqual(
      rpc.mock.calls[1][1].p_chat_request_id,
    );
    expect(upstream).toHaveBeenCalledTimes(2);
  });
  it("rejects cross-provider URLs and unbounded input before reservations", async () => {
    const rpc = vi.fn();
    const gateway = createBudgetedGateway("owner", "ai-chat", rpc, vi.fn());
    await expect(
      gateway("https://elsewhere.example", { method: "POST", body }),
    ).rejects.toThrow();
    expect(rpc).not.toHaveBeenCalled();
  });
  it("passes verified fixed-model responses and stops the rollout on a provider contract mismatch", async () => {
    for (const model of [
      "google/gemini-3.1-flash-lite",
      "google/expensive-model",
    ]) {
      const rpc = vi.fn(async () => ({ data: { allowed: true }, error: null }));
      const gateway = createBudgetedGateway(
        "owner",
        "ai-chat",
        rpc,
        vi.fn(async () =>
          Response.json({
            model,
            usage: { prompt_tokens: 100, completion_tokens: 100 },
            choices: [],
          }),
        ),
      );
      const result = await gateway(GATEWAY_URL, { method: "POST", body });
      expect(result.status).toBe(model.includes("expensive") ? 429 : 200);
      expect(rpc).toHaveBeenCalledTimes(model.includes("expensive") ? 2 : 1);
      if (model.includes("expensive"))
        expect(rpc).toHaveBeenLastCalledWith(
          "disable_hosted_ai_after_mismatch",
          {},
        );
    }
  });
  it("keeps every gateway call behind the budget and requires authoritative IDs", () => {
    for (const dir of readdirSync("supabase/functions", {
      withFileTypes: true,
    }).filter((d) => d.isDirectory() && d.name !== "_shared")) {
      let source = "";
      try {
        source = readFileSync(
          `supabase/functions/${dir.name}/index.ts`,
          "utf8",
        );
      } catch {
        continue;
      }
      expect(source, dir.name).not.toMatch(
        /\bfetch\(\s*["']https:\/\/ai\.gateway/,
      );
      if (source.includes("ai.gateway.lovable.dev"))
        expect(source, dir.name).toContain("hostedGateway(");
    }
    const chat = readFileSync("supabase/functions/ai-chat/index.ts", "utf8");
    expect(chat).toContain(
      "credential ? fetch : hostedGateway(userId, 'ai-chat')",
    );
    expect(chat).not.toContain("checkAndUpdateDailyUsage");
  });
});
