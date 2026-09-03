import { useCallback, useRef, useState } from "react";
import { setMood } from "@/hooks/usePetMood";
import { shattaContext } from "@/pet/context";
import { askPet, type BrainFlags } from "@/pet/brain";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

const uid = () => Math.random().toString(36).slice(2);

/**
 * Shatta conversation state: one conversation, kept in memory for the session.
 * Talks to the pet brain (which composes character + context + capabilities and
 * calls the AI adapter) — never to a network endpoint directly. Drives the
 * companion state machine (thinking -> speaking -> idle) while it works.
 */
export function useShattaChat(
  opts: { onAnswer?: (text: string) => void; flags?: Partial<BrainFlags> } = {},
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const onAnswerRef = useRef(opts.onAnswer);
  onAnswerRef.current = opts.onAnswer;
  const flagsRef = useRef(opts.flags);
  flagsRef.current = opts.flags;

  const run = useCallback(async (history: ChatMessage[]) => {
    const lastIndex = [...history].map((m) => m.role).lastIndexOf("user");
    const lastUser = lastIndex >= 0 ? (history[lastIndex]?.content ?? null) : null;
    shattaContext.chatStarted(lastUser ?? undefined);
    setError(null);
    setStatus("thinking");
    setMood("thinking", true);
    const controller = new AbortController();
    abort.current = controller;

    // The brain appends the current user message itself — send everything
    // before it as history so the latest turn is never duplicated.
    const prior = (lastIndex >= 0 ? history.slice(0, lastIndex) : history).map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const id = uid();
    let started = false;
    let full = "";

    const response = await askPet({
      message: lastUser ?? "",
      history: prior,
      ...(flagsRef.current ? { flags: flagsRef.current } : {}),
      signal: controller.signal,
      onChunk: (chunk) => {
        full += chunk;
        if (!started) {
          started = true;
          setMessages((m) => [...m, { id, role: "assistant", content: full }]);
          setStatus("streaming");
          setMood("speaking", true);
        } else {
          setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, content: full } : msg)));
        }
      },
    });

    if (!response.success) {
      shattaContext.chatEnded();
      if (response.error === "aborted" || controller.signal.aborted) {
        setStatus("idle");
        setMood("idle", true);
        return;
      }
      setStatus("error");
      setError(response.error ?? "Something went wrong.");
      setMood("annoyed", true);
      return;
    }

    const text = response.text;
    if (!started) {
      setMessages((m) => [...m, { id, role: "assistant", content: text }]);
    } else if (text && text !== full) {
      setMessages((m) => m.map((msg) => (msg.id === id ? { ...msg, content: text } : msg)));
    }

    if (!text.trim()) {
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
    if (text.trim()) {
      shattaContext.chatResponded(lastUser, text);
      onAnswerRef.current?.(text);
    } else {
      shattaContext.chatEnded();
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
