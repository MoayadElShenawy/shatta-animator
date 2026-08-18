import { createFileRoute } from "@tanstack/react-router";
import { shatta } from "@/characters/shatta/personality";

type ChatMessage = { role: "user" | "assistant"; content: string };

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";
const MODEL = "openai/gpt-5.6-sol";
const MAX_TURNS = 20;

function isMessage(value: unknown): value is ChatMessage {
  if (typeof value !== "object" || value === null) return false;
  const m = value as Record<string, unknown>;
  return (m["role"] === "user" || m["role"] === "assistant") && typeof m["content"] === "string";
}

/**
 * Shatta chat endpoint.
 * Streams plain text chunks so the client can render the answer as it arrives.
 * Only the conversation the user typed is sent to the AI service — never project files.
 */
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return Response.json(
            { error: "Shatta's AI is not configured yet (missing LOVABLE_API_KEY)." },
            { status: 503 },
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return Response.json({ error: "Invalid request body." }, { status: 400 });
        }

        const raw = (body as { messages?: unknown } | null)?.messages;
        const messages = Array.isArray(raw) ? raw.filter(isMessage).slice(-MAX_TURNS) : [];
        if (!messages.length) {
          return Response.json({ error: "No messages provided." }, { status: 400 });
        }

        const input = messages.map((m) => ({
          role: m.role,
          content: [
            {
              type: m.role === "assistant" ? "output_text" : "input_text",
              text: m.content,
            },
          ],
        }));

        let upstream: Response;
        try {
          upstream = await fetch(GATEWAY, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": key,
              "X-Lovable-AIG-SDK": "fetch",
            },
            body: JSON.stringify({
              model: MODEL,
              instructions: shatta.systemPrompt,
              input,
              stream: true,
              store: false,
              reasoning: { effort: "low", summary: "auto" },
            }),
          });
        } catch {
          return Response.json({ error: "Couldn't reach the AI service." }, { status: 502 });
        }

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => "");
          const message =
            upstream.status === 429
              ? "Shatta is catching her breath — too many requests. Try again in a moment."
              : upstream.status === 402
                ? "AI credits are exhausted. Add credits to keep chatting with Shatta."
                : `AI request failed (${upstream.status}). ${detail.slice(0, 300)}`;
          return Response.json({ error: message }, { status: upstream.status });
        }

        const decoder = new TextDecoder();
        const encoder = new TextEncoder();
        let buffer = "";

        const stream = new ReadableStream<Uint8Array>({
          async start(controller) {
            const reader = upstream.body!.getReader();
            try {
              for (;;) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  if (!line.startsWith("data:")) continue;
                  const payload = line.slice(5).trim();
                  if (!payload || payload === "[DONE]") continue;
                  try {
                    const event = JSON.parse(payload) as { type?: string; delta?: string };
                    if (event.type === "response.output_text.delta" && event.delta) {
                      controller.enqueue(encoder.encode(event.delta));
                    }
                  } catch {
                    // ignore malformed keep-alive frames
                  }
                }
              }
            } catch {
              controller.enqueue(encoder.encode("\n\n(the stream was interrupted)"));
            } finally {
              controller.close();
            }
          },
        });

        return new Response(stream, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "no-store",
          },
        });
      },
    },
  },
});
