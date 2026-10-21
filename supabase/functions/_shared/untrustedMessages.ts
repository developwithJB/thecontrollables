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
