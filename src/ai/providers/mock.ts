import type { AiProvider } from "@/ai/types";

/** DEVELOPMENT PLACEHOLDER ONLY — never used unless explicitly selected. */
export const mockProvider: AiProvider = {
  id: "mock",
  async send({ message, onChunk }) {
    const text = `(mock) You said: ${message}`;
    onChunk?.(text);
    return { text, success: true };
  },
};
