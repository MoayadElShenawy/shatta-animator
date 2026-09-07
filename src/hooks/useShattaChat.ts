import { useCallback, useRef, useState } from "react";
import { setMood } from "@/hooks/usePetMood";
import { shattaContext } from "@/pet/context";
import { askPet, decideTurn, executeDecision, type BrainFlags } from "@/pet/brain";
import { approveConfirmation, denyConfirmation } from "@/permissions/confirmations";

export type ChatMessage = { id: string; role: "user" | "assistant"; content: string };

/** A capability waiting for an explicit yes/no from the user. */
export type ChatConfirmation = {
  id: string;
  capability: string;
  description: string;
  destructive: boolean;
  target: string | null;
};

const uid = () => Math.random().toString(36).slice(2);

function summariseCapability(id: string, result: Awaited<ReturnType<typeof executeDecision>>): string {
  if (!result) return `Capability "${id}" did not run.`;
  if (result.ok) {
    try {
      return `Capability "${id}" succeeded with: ${JSON.stringify(result.data)}`;
    } catch {
      return `Capability "${id}" succeeded.`;
    }
  }
  return `Capability "${id}" failed (${result.reason}): ${result.error}`;
}

/**
 * Shatta conversation state: one conversation, kept in memory for the session.
 * Talks to the pet brain (which composes character + context + capabilities and
 * calls the AI adapter) — never to a network endpoint directly. Drives the
 * companion state machine (thinking -> speaking -> idle) while it works.
 *
 * Destructive capabilities never run from here: the hook surfaces a pending
 * confirmation and only executes after the user explicitly approves it.
 */
export function useShattaChat(
  opts: { onAnswer?: (text: string) => void; flags?: Partial<BrainFlags> } = {},
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<"idle" | "thinking" | "streaming" | "error">("idle");
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<ChatConfirmation | null>(null);
  const abort = useRef<AbortController | null>(null);
  const onAnswerRef = useRef(opts.onAnswer);
  onAnswerRef.current = opts.onAnswer;
  const flagsRef = useRef(opts.flags);
  flagsRef.current = opts.flags;

  /** Talk to the AI with an optional structured capability result attached. */
  const runAi = useCallback(
    async (history: ChatMessage[], capabilityNote: string | null) => {
      const lastIndex = [...history].map((m) => m.role).lastIndexOf("user");
      const lastUser = lastIndex >= 0 ? (history[lastIndex]?.content ?? null) : null;
      setError(null);
      setStatus("thinking");
      setMood("thinking", true);
      const controller = new AbortController();
      abort.current = controller;

      const prior = (lastIndex >= 0 ? history.slice(0, lastIndex) : history).map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const id = uid();
      let started = false;
      let full = "";

      const enrichedMessage = capabilityNote
        ? `${lastUser ?? ""}\n\n[Capability result for the assistant, do not reveal literally:] ${capabilityNote}`
        : (lastUser ?? "");

      const response = await askPet({
        message: enrichedMessage,
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
    },
    [],
  );

  const run = useCallback(
    async (history: ChatMessage[]) => {
      const lastIndex = [...history].map((m) => m.role).lastIndexOf("user");
      const lastUser = lastIndex >= 0 ? (history[lastIndex]?.content ?? null) : null;
      shattaContext.chatStarted(lastUser ?? undefined);

      // Capability routing: if this turn asks for a real capability we run it
      // first and hand the structured result to the AI as extra context. When
      // the capability needs confirmation we stop here and ask the user.
      let capabilityNote: string | null = null;
      const request = {
        message: lastUser ?? "",
        ...(flagsRef.current ? { flags: flagsRef.current } : {}),
      };
      const decision = decideTurn(request);
      if (decision.route === "capability") {
        if (decision.permission?.outcome === "needs_confirmation" && decision.confirmation) {
          setConfirmation({
            id: decision.confirmation.id,
            capability: decision.confirmation.capability,
            description: decision.confirmation.description,
            destructive: decision.confirmation.destructive === true,
            target: decision.confirmation.target ?? null,
          });
          pendingRef.current = { decision, request };
          setStatus("idle");
          setMood("idle", true);
          return;
        }
        if (decision.permission?.outcome === "allowed") {
          const result = await executeDecision(decision, request);
          capabilityNote = summariseCapability(decision.intent.capability!, result);
        } else if (decision.permission?.outcome === "unavailable") {
          capabilityNote = `Capability "${decision.intent.capability}" is unavailable: ${decision.permission.message}`;
        }
      }

      await runAi(history, capabilityNote);
    },
    [runAi],
  );

  const pendingRef = useRef<{
    decision: ReturnType<typeof decideTurn>;
    request: Parameters<typeof executeDecision>[1];
  } | null>(null);
  const historyRef = useRef<ChatMessage[]>([]);
  historyRef.current = messages;

  /** The user pressed "yes". Approves that one operation and runs it. */
  const approve = useCallback(async () => {
    const pending = pendingRef.current;
    const current = confirmation;
    setConfirmation(null);
    pendingRef.current = null;
    if (!pending || !current) return;
    approveConfirmation(current.id);
    const request = { ...pending.request, confirmationId: current.id };
    const decision = decideTurn(request);
    const result = await executeDecision(decision, request);
    const note = summariseCapability(current.capability, result);
    await runAi(historyRef.current, note);
  }, [confirmation, runAi]);

  /** The user pressed "no". Nothing touches the filesystem. */
  const decline = useCallback(() => {
    const current = confirmation;
    pendingRef.current = null;
    setConfirmation(null);
    if (current) denyConfirmation(current.id);
    setStatus("idle");
    setMood("idle", true);
    setMessages((m) => [
      ...m,
      { id: uid(), role: "assistant", content: "تمام، سيبتها زي ما هي — مش هعمل حاجة. 🐾" },
    ]);
    shattaContext.chatEnded();
  }, [confirmation]);

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
    if (confirmation) denyConfirmation(confirmation.id);
    pendingRef.current = null;
    setConfirmation(null);
    setMessages([]);
    setStatus("idle");
    setError(null);
    setMood("idle", true);
  }, [confirmation]);

  const stop = useCallback(() => abort.current?.abort(), []);

  return { messages, status, error, confirmation, approve, decline, send, retry, clear, stop };
}
