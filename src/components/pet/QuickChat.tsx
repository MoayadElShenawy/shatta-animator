import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Send, Square, Trash2, X } from "lucide-react";
import type { ChatConfirmation, ChatMessage } from "@/hooks/useShattaChat";
import type { MicStatus } from "@/hooks/useVoiceInput";

/** Compact "Ask Shatta anything..." composer + transcript. */
export function QuickChat({
  messages,
  status,
  error,
  onSend,
  onClear,
  onClose,
  confirmation,
  onApprove,
  onDecline,
  mic,
}: {
  messages: ChatMessage[];
  status: "idle" | "thinking" | "streaming" | "error";
  error: string | null;
  onSend: (text: string) => void;
  onClear: () => void;
  onClose: () => void;
  confirmation?: ChatConfirmation | null;
  onApprove?: () => void;
  onDecline?: () => void;
  mic: {
    status: MicStatus;
    supported: boolean;
    error: string | null;
    start: () => void;
    stop: () => void;
  };
}) {
  const [value, setValue] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const busy = status === "thinking" || status === "streaming";
  const listening = mic.status === "recording";

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim() || busy) return;
    onSend(value);
    setValue("");
  };

  return (
    <div className="animate-pop w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border-2 border-primary/40 bg-card/95 shadow-[0_24px_60px_-24px_var(--shatta-glow)] backdrop-blur">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-display text-sm font-bold tracking-wide text-primary">Shatta</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onClear}
            aria-label="Clear conversation"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close chat"
            className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {messages.length > 0 ? (
        <div ref={scrollRef} className="max-h-64 space-y-2 overflow-y-auto px-3 py-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm leading-relaxed ${
                m.role === "user"
                  ? "ml-8 bg-primary text-primary-foreground"
                  : "mr-4 bg-muted text-foreground"
              }`}
            >
              {m.content || "…"}
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-4 text-sm text-muted-foreground">
          Ask me about an error, a snippet, or literally anything. I get bored fast.
        </p>
      )}

      {error || mic.error ? (
        <p className="px-4 pb-2 text-xs text-destructive">{error ?? mic.error}</p>
      ) : null}

      {confirmation ? (
        <div className="mx-3 mb-2 rounded-2xl border-2 border-destructive/50 bg-destructive/10 px-3 py-2" dir="rtl">
          <p className="text-sm font-semibold text-destructive">
            {confirmation.destructive ? "⚠️ " : ""}
            {confirmation.destructive ? "دي حركة مش بترجع تاني" : "محتاجة موافقتك"}
          </p>
          <p className="mt-1 text-xs leading-relaxed text-foreground">
            {confirmation.capability === "file_delete"
              ? `أنت متأكد من حذف ${confirmation.target ?? "الملف"}؟`
              : `أنت متأكد من: ${confirmation.description}؟`}
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={onApprove}
              className="rounded-full bg-destructive px-4 py-1.5 text-xs font-bold text-destructive-foreground"
            >
              نعم
            </button>
            <button
              type="button"
              onClick={onDecline}
              className="rounded-full border border-border px-4 py-1.5 text-xs font-medium text-muted-foreground"
            >
              لا
            </button>
          </div>
        </div>
      ) : null}

      <form onSubmit={submit} className="flex items-center gap-2 border-t border-border p-2">
        <input
          ref={inputRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask Shatta anything..."
          aria-label="Ask Shatta anything"
          className="min-w-0 flex-1 rounded-full bg-muted px-4 py-2 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
        />
        {mic.supported ? (
          <button
            type="button"
            onClick={listening ? mic.stop : mic.start}
            aria-label={listening ? "Stop recording" : "Dictate a message"}
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full transition ${
              listening ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-border"
            }`}
          >
            {mic.status === "transcribing" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : listening ? (
              <Square className="h-3.5 w-3.5" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
          </button>
        ) : null}
        <button
          type="submit"
          disabled={busy || !value.trim()}
          aria-label="Send message"
          className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-primary-foreground transition disabled:opacity-40"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </button>
      </form>
    </div>
  );
}
