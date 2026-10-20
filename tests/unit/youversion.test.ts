import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import {
  fetchYouVersionPassage,
  gospelPassageId,
  sourceRetryDelay,
  verifyScriptureQuote,
  youVersionReady,
} from "../../supabase/functions/_shared/youversion";
import { createScriptureHandler } from "../../supabase/functions/scripture-passage/handler";
import { createCoachProvider } from "../../supabase/functions/_shared/coachProvider";
import {
  SCRIPTURE_QUOTE_FALLBACK,
  withholdUnverifiedScripture,
} from "../../supabase/functions/_shared/scriptureQuoteGuard";

// Deliberately synthetic words, not Bible text or a real available translation.
const config = {
  enabled: true,
  commercialApproval: "synthetic-approval-fixture",
  aiAppApproval: "synthetic-ai-app-approval-fixture",
  appKey: "synthetic-app-key",
  bibleId: "999999",
};
const metadata = {
  id: 999999,
  abbreviation: "TEST",
  copyright: "Synthetic test fixture; no Scripture content.",
  books: ["JHN"],
};
const upstream = {
  id: "JHN.13.1-2",
  reference: "John 13:1-2",
  content: "Synthetic source words. Second fixture sentence.",
};
const mockSource = () =>
  vi.fn(async (url: string | URL | Request) =>
    Response.json(String(url).includes("/passages/") ? upstream : metadata),
  );
const request = (body: unknown, authorization = "Bearer synthetic-token") =>
  new Request("http://local.invalid/scripture-passage", {
    method: "POST",
    headers: { Authorization: authorization },
    body: JSON.stringify(body),
  });
describe("approval-gated YouVersion source boundary", () => {
  it("accepts bounded Gospel references and rejects path injection, reversed ranges and invalid chapters", () => {
    expect(gospelPassageId("John 13:1-2")).toBe("JHN.13.1-2");
    expect(gospelPassageId("Mark 1:1-1")).toBe("MRK.1.1");
    for (const ref of [
      "John 22:1",
      "Mark 17:1",
      "John 13:9-1",
      "Matthew 1:1-99",
      "John 1:100",
      "John 1:1?key=x",
      "../../secrets",
      "Romans 1:1",
      null,
    ])
      expect(() => gospelPassageId(ref)).toThrow("invalid_gospel_reference");
  });
  it.each([
    {},
    { enabled: false },
    { commercialApproval: "" },
    { aiAppApproval: "" },
    { appKey: "" },
    { bibleId: "" },
    { bibleId: "1/../../" },
  ])(
    "refuses source requests before every deployment prerequisite exists: %j",
    async (override) => {
      const local = Object.keys(override).length
        ? { ...config, ...override }
        : {
            enabled: false,
            appKey: "",
            commercialApproval: "",
            aiAppApproval: "",
            bibleId: "",
          };
      const fetcher = mockSource();
      expect(youVersionReady(local)).toBe(false);
      await expect(
        fetchYouVersionPassage(local, "John 13:1-2", fetcher),
      ).rejects.toThrow("scripture_reader_unavailable");
      expect(fetcher).not.toHaveBeenCalled();
    },
  );
  it("uses the fixed API and exact licensed ID, fetches attribution, requests only plain text, and refuses redirects", async () => {
    const fetcher = mockSource();
    const passage = await fetchYouVersionPassage(
      config,
      "John 13:1-2",
      fetcher,
    );
    expect(passage).toMatchObject({
      text: upstream.content,
      version: "TEST",
      copyright: metadata.copyright,
      bibleId: "999999",
    });
    expect(fetcher.mock.calls.map((c) => c[0])).toEqual([
      "https://api.youversion.com/v1/bibles/999999",
      "https://api.youversion.com/v1/bibles/999999/passages/JHN.13.1-2?format=text",
    ]);
    const options = (
      fetcher.mock.calls[0] as unknown as [string, RequestInit]
    )[1];
    expect(options.redirect).toBe("error");
    expect(options.headers).toEqual({
      "X-YVP-App-Key": config.appKey,
      Accept: "application/json",
    });
  });
  it.each([
    { ...metadata, copyright: "" },
    { ...metadata, id: 116 },
    { ...metadata, books: ["MAT"] },
  ])(
    "requires matching version, supported book and attribution: %j",
    async (meta) => {
      const fetcher = vi.fn(async () => Response.json(meta));
      await expect(
        fetchYouVersionPassage(config, "John 13:1-2", fetcher),
      ).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );
  it("uses promotional attribution when copyright is absent and refreshes metadata on every read", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) =>
      Response.json(
        String(url).includes("/passages/")
          ? upstream
          : {
              ...metadata,
              copyright: " ",
              promotional_content: "Synthetic publisher notice",
            },
      ),
    );
    for (let i = 0; i < 2; i++) {
      const passage = await fetchYouVersionPassage(
        config,
        "John 13:1-2",
        fetcher,
      );
      expect(passage.copyright).toBe("Synthetic publisher notice");
    }
    expect(fetcher).toHaveBeenCalledTimes(4);
  });
  it("handles an empty 204 without trying to parse JSON or inventing text", async () => {
    const empty = new Response(null, { status: 204 });
    const read = vi.spyOn(empty, "text");
    const fetcher = vi.fn(async () => empty);
    await expect(
      fetchYouVersionPassage(config, "John 13:1-2", fetcher),
    ).rejects.toMatchObject({
      code: "scripture_no_content",
      status: 404,
    });
    expect(read).not.toHaveBeenCalled();
  });
  it.each([
    [401, "scripture_source_key_unavailable", 503],
    [403, "scripture_license_unavailable", 503],
    [404, "scripture_passage_not_found", 404],
  ])(
    "classifies passage status %s safely; successful metadata alone never proves a license",
    async (status, code, resultStatus) => {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(Response.json(metadata))
        .mockResolvedValueOnce(
          new Response("private upstream diagnostic", { status }),
        );
      const handler = createScriptureHandler({
        config,
        request: fetcher,
        authenticate: async () => true,
      });
      const result = await handler(
        request({ operation: "passage", reference: "John 13:1-2" }),
      );
      expect(result.status).toBe(resultStatus);
      expect(await result.json()).toEqual({ error: code });
      expect(fetcher).toHaveBeenCalledTimes(2);
    },
  );
  it("uses valid Retry-After values with safe defaults for malformed headers", () => {
    const clock = vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 9, 20));
    try {
      expect(sourceRetryDelay("30")).toBe(30);
      expect(sourceRetryDelay("7200")).toBe(7200);
      expect(sourceRetryDelay("0")).toBe(1);
      expect(sourceRetryDelay("Tue, 20 Oct 2026 00:02:00 GMT")).toBe(120);
      expect(sourceRetryDelay("invalid")).toBe(60);
      expect(sourceRetryDelay(null, 5)).toBe(5);
    } finally {
      clock.mockRestore();
    }
  });
  it.each([429, 503])(
    "respects upstream %s cooldown before another request and never parses its plain-text error",
    async (status) => {
      let now = Date.UTC(2026, 9, 20);
      const clock = vi.spyOn(Date, "now").mockImplementation(() => now);
      try {
        const fetcher = vi
          .fn()
          .mockResolvedValueOnce(
            new Response("private diagnostic", {
              status,
              headers: { "Retry-After": "120" },
            }),
          )
          .mockResolvedValueOnce(Response.json(metadata))
          .mockResolvedValueOnce(Response.json(upstream));
        const log = vi.fn();
        const handler = createScriptureHandler({
          config,
          request: fetcher,
          authenticate: async () => true,
          onSourceFailure: log,
        });
        const body = { operation: "passage", reference: "John 13:1-2" };
        const first = await handler(request(body));
        expect(first.status).toBe(status);
        expect(first.headers.get("Retry-After")).toBe("120");
        now += 1000;
        const second = await handler(request(body));
        expect(second.status).toBe(429);
        expect(second.headers.get("Retry-After")).toBe("119");
        expect(fetcher).toHaveBeenCalledTimes(1);
        expect(log).toHaveBeenCalledWith(
          status === 429
            ? "scripture_source_rate_limited"
            : "scripture_source_unavailable",
        );
        now += 119000;
        expect((await handler(request(body))).status).toBe(200);
        expect(fetcher).toHaveBeenCalledTimes(3);
      } finally {
        clock.mockRestore();
      }
    },
  );
  it("rejects wrong returned references, malformed source data and unavailable upstream without inventing a fallback translation", async () => {
    for (const response of [
      Response.json({ ...upstream, id: "JHN.3.16" }),
      Response.json({ ...upstream, content: "" }),
      new Response("synthetic secret echo", { status: 403 }),
    ]) {
      const fetcher = vi
        .fn()
        .mockResolvedValueOnce(Response.json(metadata))
        .mockResolvedValueOnce(response);
      await expect(
        fetchYouVersionPassage(config, "John 13:1-2", fetcher),
      ).rejects.toThrow();
      expect(fetcher).toHaveBeenCalledTimes(2);
    }
  });
  it("compares the complete exact source with whitespace normalization; negation, punctuation, case and excerpts never pass", async () => {
    const passage = await fetchYouVersionPassage(
      config,
      "John 13:1-2",
      mockSource(),
    );
    expect(
      verifyScriptureQuote(
        "  Synthetic source words.\nSecond fixture sentence. ",
        passage,
        "John 13:1-2",
        "999999",
      ),
    ).toBe("exact");
    for (const quote of [
      "Synthetic source words.",
      upstream.content.toLowerCase(),
      upstream.content.replace(".", "!"),
      upstream.content.replace("source", "not source"),
      "",
    ])
      expect(
        verifyScriptureQuote(quote, passage, "John 13:1-2", "999999"),
      ).toBe("not_exact");
    expect(
      verifyScriptureQuote(upstream.content, passage, "John 13:1-2", "116"),
    ).toBe("source_mismatch");
    expect(
      verifyScriptureQuote(upstream.content, passage, "John 13:3", "999999"),
    ).toBe("source_mismatch");
  });
  it("authenticates before availability or source access; browser flags/body cannot enable the server", async () => {
    const fetcher = mockSource();
    const denied = createScriptureHandler({
      config,
      request: fetcher,
      authenticate: async () => false,
    });
    expect((await denied(request({ operation: "status" }))).status).toBe(401);
    const disabled = createScriptureHandler({
      config: { ...config, enabled: false },
      request: fetcher,
      authenticate: async () => true,
    });
    expect(
      await (await disabled(request({ operation: "status" }))).json(),
    ).toEqual({ available: false });
    expect(
      (
        await disabled(
          request({
            operation: "passage",
            reference: "John 13:1-2",
            enabled: true,
            appKey: "forged",
          }),
        )
      ).status,
    ).toBe(503);
    expect(fetcher).not.toHaveBeenCalled();
  });
  it("checks quotes in the handler without forwarding quotes, identities or private history upstream", async () => {
    const fetcher = mockSource();
    const handler = createScriptureHandler({
      config,
      request: fetcher,
      authenticate: async (token) => token === "synthetic-token",
    });
    const response = await handler(
      request({
        operation: "verify_quote",
        reference: "John 13:1-2",
        quote: upstream.content,
        prayer: "private-prayer",
        userId: "private-owner",
      }),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect((await response.json()).verdict).toBe("exact");
    const transmitted = JSON.stringify(fetcher.mock.calls);
    for (const value of [upstream.content, "private-prayer", "private-owner"])
      expect(transmitted).not.toContain(value);
  });
  it("rejects invalid operations/input and never echoes provider errors or app keys", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response("synthetic-app-key upstream diagnostic", { status: 429 }),
    );
    const handler = createScriptureHandler({
      config,
      request: fetcher,
      authenticate: async () => true,
    });
    for (const body of [
      { operation: "other" },
      { operation: "passage", reference: "../../" },
      { operation: "verify_quote", reference: "John 13:1-2", quote: "" },
      null,
    ])
      expect((await handler(request(body))).status).toBe(400);
    expect(fetcher).not.toHaveBeenCalled();
    const result = await handler(
      request({ operation: "passage", reference: "John 13:1-2" }),
    );
    expect(result.status).toBe(429);
    expect(await result.json()).toEqual({
      error: "scripture_source_rate_limited",
      retryAfterSeconds: 60,
    });
  });
  it("retains JWT verification and does not replace the independent content-review gates", () => {
    expect(readFileSync("supabase/config.toml", "utf8")).toMatch(
      /\[functions.scripture-passage\]\s+verify_jwt = true/,
    );
    const handler = readFileSync(
      "supabase/functions/scripture-passage/handler.ts",
      "utf8",
    );
    expect(handler).not.toContain("close_fully_charged_day");
    expect(handler).not.toContain("publication_status");
    expect(handler).not.toContain("theological_review_status");
  });
});
describe("coach quote boundary (a conservative filter, not semantic verification)", () => {
  it.each([
    "John 13:1 “Synthetic invented words.”",
    "Jesus said synthetic invented words.",
    "A verified Bible quotation: synthetic.",
    "> Synthetic words.\nMatthew 1:1",
  ])("withholds recognizable attributed quotes: %s", (value) => {
    expect(withholdUnverifiedScripture(value)).toBe(SCRIPTURE_QUOTE_FALLBACK);
  });
  it("keeps reference-only guidance and ordinary quoted coaching, without claiming arbitrary prose is verified", () => {
    for (const value of [
      "Read John 13:1-2 in context.",
      "Name the feeling: “fear is present.”",
    ])
      expect(withholdUnverifiedScripture(value)).toBe(value);
  });
  it.each(["lovable_gateway", "openai_compatible", "anthropic"] as const)(
    "applies the output guard at the actual %s provider boundary",
    async (id) => {
      const content = "Jesus said synthetic invented words.";
      const reply =
        id === "anthropic"
          ? { content: [{ type: "text", text: content }] }
          : { choices: [{ message: { role: "assistant", content } }] };
      const provider = createCoachProvider(
        id === "lovable_gateway"
          ? null
          : {
              provider: id,
              baseUrl:
                id === "anthropic"
                  ? "https://api.anthropic.com"
                  : "https://api.openai.com/v1",
              key: "synthetic",
              model: "synthetic",
              tone: "warm",
              depth: "concise",
            },
        "synthetic",
        vi.fn(async () => Response.json(reply)),
      );
      const data = await (
        await provider.complete([{ role: "user", content: "synthetic" }], {
          maxTokens: 50,
        })
      ).json();
      expect(data.choices[0].message.content).toBe(SCRIPTURE_QUOTE_FALLBACK);
    },
  );
});
