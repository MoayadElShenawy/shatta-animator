import type { ShattaContext } from "@/pet/context";

/**
 * Provider-agnostic AI boundary.
 *
 * UI/behaviour code talks to `AiProvider` only — it never knows which model or
 * vendor answers. Later providers (OpenAI direct, search-augmented, tool
 * calling) implement this same interface without touching Shatta's UI.
 */

export type AiMessage = { role: "user" | "assistant"; content: string };

export type AiRequest = {
  /** The message the user just sent. */
  message: string;
  /** Prior turns, supplied by the caller. This layer stores nothing. */
  history?: readonly AiMessage[];
  /** Live runtime context snapshot (state, interaction source, idle time...). */
  context?: ShattaContext | null;
  /** Who is speaking — supplied by the brain, never hard-coded in providers. */
  character?: { id: string; name: string; persona?: unknown };
  /** Capabilities allowed for this turn (descriptors only, no handlers). */
  capabilities?: readonly unknown[];
  /** Optional stream of text chunks as they arrive. */
  onChunk?: (chunk: string) => void;
  signal?: AbortSignal;
};


/** The only response shape the rest of the app has to understand. */
export type AiResponse = {
  text: string;
  success: boolean;
  error?: string;
};

export type AiProvider = {
  id: string;
  send: (request: AiRequest) => Promise<AiResponse>;
};
