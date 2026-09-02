import type { ShattaContext } from "@/pet/context";

export type AskShattaMessage = { role: "user" | "assistant"; content: string };

export type AskShattaOptions = {
  /** Full conversation history, oldest first. The latest user message is already included. */
  messages: AskShattaMessage[];
  /** Interaction context snapshot, read by the caller via getShattaContext(). */
  context?: ShattaContext;
  /** Called with each streamed text chunk as it arrives. */
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
};

/**
 * The single AI adapter for Shatta.
 *
 * Every chat request goes through here: it talks to the existing /api/chat
 * endpoint (which owns the model, personality prompt and streaming), forwards
 * the interaction context, and streams plain-text chunks back to the caller.
 * Nothing is persisted; the context is passed through in memory only.
 */
export async function askShatta(opts: AskShattaOptions): Promise<string> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    ...(opts.signal ? { signal: opts.signal } : {}),
    body: JSON.stringify({
      messages: opts.messages.map((m) => ({ role: m.role, content: m.content })),
      ...(opts.context ? { context: opts.context } : {}),
    }),
  });

  if (!res.ok || !res.body) {
    const data = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(data?.error ?? "Shatta couldn't answer right now.");
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let full = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = decoder.decode(value, { stream: true });
    if (!chunk) continue;
    full += chunk;
    opts.onChunk?.(full);
  }
  return full;
}
