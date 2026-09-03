import type { AiProvider, AiRequest, AiResponse } from "@/ai/types";

/**
 * Wraps the EXISTING chat implementation (`/api/chat`, server-side key) behind
 * the provider boundary. No keys or model ids live in client code here.
 */
export const lovableChatProvider: AiProvider = {
  id: "lovable-chat",
  async send({ message, history = [], context, character, capabilities, onChunk, signal }: AiRequest): Promise<AiResponse> {
    const messages = [
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: "user" as const, content: message },
    ];

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        ...(signal ? { signal } : {}),
        // Extra fields are forwarded for future use; the route ignores unknown fields.
        body: JSON.stringify({
          messages,
          context: context ?? null,
          character: character ?? null,
          capabilities: capabilities ?? [],
        }),
      });


      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        return { text: "", success: false, error: data?.error ?? "Shatta couldn't answer right now." };
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        full += chunk;
        onChunk?.(chunk);
      }

      if (!full.trim()) {
        return { text: "", success: false, error: "Empty response from the AI provider." };
      }
      return { text: full, success: true };
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        return { text: "", success: false, error: "aborted" };
      }
      return { text: "", success: false, error: "Couldn't reach the AI service." };
    }
  },
};
