import { useCallback, useRef, useState } from "react";
import { setMood } from "@/hooks/usePetMood";
import { shattaContext } from "@/pet/context";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

const uid = () => Math.random().toString(36).slice(2);

/**
 * Shatta conversation state: one conversation, kept in memory for the session.
 * Streams plain-text chunks from /api/chat and drives the companion state
 * machine (thinking -> speaking -> idle) while it works.
 */
export function useShattaChat(opts: { onAnswer?: (text: string) => void } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const onAnswerRef = useRef(opts.onAnswer);
  onAnswerRef.current = opts.onAnswer;

  const run = useCallback(async (history: ChatMessage[]) => {
    const lastUser = [...history].reverse().find((m) => m.role === "user")?.content ?? null;
    shattaContext.chatStarted(lastUser ?? undefined);
    setError(null);
    setStatus("thinking");
    setMood("thinking", true);
    const controller = new AbortController();
    abort.current = controller;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      if (!res.ok || !res.body) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(data?.error ?? "Shatta couldn't answer right now.");
      }

      const id = uid();
      setMessages((m) => [...m, { id, role: "assistant", content: "" }]);
      setStatus("streaming");
      setMood("speaking", true);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, content: full } : msg)));
      }

      if (!full.trim()) {
        setMessages((m) =>
          m.map((msg) =>
            msg.id === id
              ? { ...msg, content: "Mrrp. I came back empty-pawed. Ask me again?" }
              : msg,
          ),
        );
      }
      setStatus("idle");
      setMood("happy", true);
      if (full.trim()) {
        shattaContext.chatResponded(lastUser, full);
        onAnswerRef.current?.(full);
      } else {
        shattaContext.chatEnded();
      }
    } catch (e) {
      shattaContext.chatEnded();
      if ((e as Error).name === "AbortError") {
        setStatus("idle");
        setMood("idle", true);
        return;
      }
      setStatus("error");
      setError(e instanceof Error ? e.message : "Something went wrong.");
      setMood("annoyed", true);
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const content = text.trim();
      if (!content || status === "thinking" || status === "streaming") return;
      const next: ChatMessage[] = [...messages, { id: uid(), role: "user", content }];
      setMessages(next);
      void run(next);
    },
    [messages, run, status],
  );

  const retry = useCallback(() => {
    const history = [...messages];
    while (history.length && history[history.length - 1]?.role === "assistant") history.pop();
    if (!history.length) return;
    setMessages(history);
    void run(history);
  }, [messages, run]);

  const clear = useCallback(() => {
    abort.current?.abort();
    shattaContext.chatEnded();
    setMessages([]);
    setStatus("idle");
    setError(null);
    setMood("idle", true);
  }, []);

  const stop = useCallback(() => abort.current?.abort(), []);

  return { messages, status, error, send, retry, clear, stop };
}
