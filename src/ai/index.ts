import { lovableChatProvider } from "@/ai/providers/lovable";
import { getShattaContext } from "@/pet/context";
import type { AiProvider, AiRequest, AiResponse } from "@/ai/types";

export type { AiProvider, AiRequest, AiResponse, AiMessage } from "@/ai/types";

/**
 * The single entry point for AI calls. Swap the provider here later (model
 * selection, tool calling, search) without touching UI or behaviour code.
 */
let provider: AiProvider = lovableChatProvider;

export function setAiProvider(next: AiProvider) {
  provider = next;
}

export function getAiProvider(): AiProvider {
  return provider;
}

/** Send a message; always resolves with the normalized response shape. */
export async function askShatta(request: AiRequest): Promise<AiResponse> {
  try {
    return await provider.send({
      ...request,
      context: request.context ?? getShattaContext(),
    });
  } catch {
    return { text: "", success: false, error: "The AI adapter failed unexpectedly." };
  }
}
