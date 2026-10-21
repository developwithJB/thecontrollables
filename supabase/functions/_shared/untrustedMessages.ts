/** Client transcript text is useful context, never authenticated model output. */
export function untrustedConversation(
  messages: readonly { role: string; content: string }[],
) {
  return messages.map((message) => ({
    role: "user" as const,
    content:
      message.role === "user"
        ? message.content
        : JSON.stringify({
            unverifiedTranscriptRole: message.role,
            text: message.content,
          }),
  }));
}

/** Request context is bounded user data, never a system instruction or verified memory. */
export function untrustedCoachContext(body: Record<string, unknown>) {
  const context: Record<string, unknown> = {};
  for (const key of ['challengeContext', 'userContext', 'buildContext', 'patternData']) {
    if (body[key] != null) context[key] = body[key];
  }
  if (!Object.keys(context).length) return [];
  const text = JSON.stringify(context).slice(0, 8000);
  return [{ role: 'user' as const, content: JSON.stringify({ unverifiedClientContext: text }) }];
}
