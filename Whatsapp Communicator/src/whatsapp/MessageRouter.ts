export type ReplyDecision = { shouldReply: true; replyText: string } | { shouldReply: false };

export class MessageRouter {
  decideReply(inboundText: string | undefined | null): ReplyDecision {
    const text = (inboundText ?? '').trim();
    if (!text) return { shouldReply: false };

    // Command 1: "hi" (case-insensitive) -> "hello"
    if (text.toLowerCase() === 'hi') {
      return { shouldReply: true, replyText: 'hello' };
    }

    // Command 2: Arabic "how are you" -> reply "كيف حالك؟"
    // Still restricted to this single phrase (optionally with Arabic question mark).
    if (text === 'كيف حالك' || text === 'كيف حالك؟') {
      return { shouldReply: true, replyText: 'كيف حالك؟' };
    }

    return { shouldReply: false };
  }
}
