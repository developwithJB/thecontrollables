/** No prompts, credentials, or provider responses are persisted in this ledger.
 * Reserve a conservative upper bound, including tool schemas and reasoning output,
 * BEFORE any paid call. Retain reservations on ALL outcomes; never retry upstream.
 * Model: Gemini 3.1 Flash Lite, standard $0.25/M input, $1.50/M output.
 * Reserve at the higher $0.30/M and $2.50/M rates, plus 25% safety margin.
 * Unsupported media/tools/models cannot create an unbounded invoice.
 */
export const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
export interface BudgetRpc {
  (
    name: string,
    args: Record<string, unknown>,
  ): PromiseLike<{ data: unknown; error: unknown }>;
}
export function boundedHostedRequest(raw: string): {
  body: string;
  costMicros: number;
  inputTokenLimit: number;
  outputTokenLimit: number;
} {
  const input = JSON.parse(raw);
  if (
    !Array.isArray(input.messages) ||
    input.messages.length < 1 ||
    input.messages.length > 60
  )
    throw new Error("invalid_hosted_messages");
  let imageTokens = 0;
  const messages = input.messages.map((message: Record<string, unknown>) => {
    if (!["system", "user", "assistant", "tool"].includes(String(message.role)))
      throw new Error("invalid_hosted_role");
    if (
      Object.keys(message).some(
        (key) =>
          !["role", "content", "tool_call_id", "tool_calls", "name"].includes(
            key,
          ),
      )
    )
      throw new Error("unsupported_hosted_message");
    if (!Array.isArray(message.content)) {
      if (message.content !== null && typeof message.content !== "string")
        throw new Error("invalid_hosted_content");
      return message;
    }
    return {
      ...message,
      content: message.content.map((part: Record<string, unknown>) => {
        if (part.type === "text" && typeof part.text === "string") return part;
        if (part.type !== "image_url" || imageTokens)
          throw new Error("unsupported_hosted_media");
        const url = (part.image_url as { url?: string })?.url;
        if (
          typeof url !== "string" ||
          !/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(url) ||
          url.length > 2_800_000
        )
          throw new Error("unsupported_hosted_image");
        // Gemini images are tiled. Reject dimensions over 1024, reserve 16,384
        // input tokens, independent of file size.
        const bytes = Uint8Array.from(atob(url.split(",")[1]), (c) =>
          c.charCodeAt(0),
        );
        const [width, height] = imageDimensions(bytes);
        if (width < 1 || height < 1 || width > 1024 || height > 1024)
          throw new Error("hosted_image_too_large");
        imageTokens = 16_384;
        return { ...part, image_url: { url, detail: "low" } };
      }),
    };
  });
  if (
    input.tools &&
    (!Array.isArray(input.tools) ||
      input.tools.some((t: { type: string }) => t.type !== "function"))
  )
    throw new Error("unsupported_hosted_tools");
  const body = {
    model: "google/gemini-3.1-flash-lite",
    messages,
    max_tokens: Math.min(
      1000,
      Math.max(1, Number.isInteger(input.max_tokens) ? input.max_tokens : 1000),
    ),
    stream: false,
    ...(input.tools ? { tools: input.tools } : {}),
    ...(input.tool_choice ? { tool_choice: input.tool_choice } : {}),
    ...(input.response_format
      ? { response_format: input.response_format }
      : {}),
    // No paid search, audio/video, agents, automatic retries, or model fallback.
  };
  const accounting = {
    ...body,
    messages: messages.map((m: Record<string, unknown>) => ({
      ...m,
      content: Array.isArray(m.content)
        ? m.content.map((p: Record<string, unknown>) =>
            p.type === "image_url" ? { type: "image_url" } : p,
          )
        : m.content,
    })),
  };
  // UTF-8 bytes conservatively bound text tokens, with 2048 framing tokens.
  const bytes = new TextEncoder().encode(JSON.stringify(accounting)).length;
  if (bytes > 16_384) throw new Error("hosted_context_too_large");
  const costMicros = Math.ceil(
    ((bytes + 2048 + imageTokens) * 0.3 + body.max_tokens * 2.5) * 1.25,
  );
  return {
    body: JSON.stringify(body),
    costMicros,
    inputTokenLimit: bytes + 2048 + imageTokens,
    outputTokenLimit: body.max_tokens,
  };
}
function imageDimensions(b: Uint8Array): [number, number] {
  if (
    b[0] === 137 &&
    b[1] === 80 &&
    b[2] === 78 &&
    b[3] === 71 &&
    b.length >= 24
  ) {
    const view = new DataView(b.buffer);
    return [view.getUint32(16), view.getUint32(20)];
  }
  if (b[0] === 255 && b[1] === 216) {
    for (let i = 2; i + 8 < b.length;) {
      if (b[i] !== 255) break;
      const marker = b[i + 1],
        size = (b[i + 2] << 8) + b[i + 3];
      if ([192, 193, 194].includes(marker))
        return [(b[i + 7] << 8) + b[i + 8], (b[i + 5] << 8) + b[i + 6]];
      if (size < 2) break;
      i += 2 + size;
    }
  }
  throw new Error("invalid_hosted_image");
}
export function createBudgetedGateway(
  userId: string,
  feature: string,
  rpc: BudgetRpc,
  request: typeof fetch = fetch,
): typeof fetch {
  const chatRequestId = feature === "ai-chat" ? crypto.randomUUID() : null;
  return async (url, init) => {
    if (
      String(url) !== GATEWAY_URL ||
      !init ||
      !("method" in init) ||
      init.method !== "POST" ||
      !("body" in init) ||
      typeof init.body !== "string"
    )
      throw new Error("invalid_hosted_request");
    const bounded = boundedHostedRequest(init.body);
    const { data, error } = await rpc("reserve_hosted_ai", {
      p_user_id: userId,
      p_feature: feature,
      p_cost_micros: bounded.costMicros,
      p_chat_request_id: chatRequestId,
    });
    const reservation = data as { allowed?: boolean; code?: string } | null;
    if (error || !reservation) throw new Error("hosted_ai_budget_unavailable");
    if (reservation.allowed !== true)
      return Response.json(
        { error: reservation.code ?? "hosted_ai_limit", limitReached: true },
        { status: 429 },
      );
    const response = await request(url, {
      ...init,
      body: bounded.body,
      redirect: "error",
      signal: AbortSignal.timeout(25_000),
    });
    if (response.ok) {
      const result = await response
        .clone()
        .json()
        .catch(() => null);
      const usage = result?.usage;
      const model = String(result?.model ?? "")
        .replace(/^google\//, "")
        .replace(/^models\//, "");
      if (
        model !== "gemini-3.1-flash-lite" ||
        !Number.isInteger(usage?.prompt_tokens) ||
        !Number.isInteger(usage?.completion_tokens) ||
        usage.prompt_tokens < 0 ||
        usage.completion_tokens < 0 ||
        usage.prompt_tokens > bounded.inputTokenLimit ||
        usage.completion_tokens > bounded.outputTokenLimit
      ) {
        // An unexpected model/rate or token contract stops further reservations.
        // This RPC cannot be invoked by an app user. Never log provider content.
        await rpc("disable_hosted_ai_after_mismatch", {});
        await response.body?.cancel();
        return Response.json(
          { error: "hosted_ai_provider_contract_mismatch", limitReached: true },
          { status: 429 },
        );
      }
    }
    return response;
  };
}

/** A paid tool checks current authority before reading data or returning caches.
 * The later budget reservation still independently gates every provider call. */
export async function paidHostedFeatureDenial(rpc:BudgetRpc,userId:string):Promise<{status:number;code:string}|null> {
 const {data,error}=await rpc('hosted_ai_plan',{p_user_id:userId});
 if(error || typeof data!=='string' || !['free','plus','pro','premium','lifetime'].includes(data))
  return {status:503,code:'hosted_ai_authority_unavailable'};
 return data==='free' ? {status:403,code:'hosted_ai_requires_paid'} : null;
}
