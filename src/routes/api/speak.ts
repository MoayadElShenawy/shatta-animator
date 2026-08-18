import { createFileRoute } from "@tanstack/react-router";
import { shatta } from "@/characters/shatta/personality";

/** Text-to-speech so Shatta can read an answer out loud. Only runs when the user enables it. */
export const Route = createFileRoute("/api/speak")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return Response.json({ error: "Voice output is not configured yet." }, { status: 503 });
        }

        const body = (await request.json().catch(() => null)) as { text?: unknown } | null;
        const text = typeof body?.text === "string" ? body.text.trim().slice(0, 2000) : "";
        if (!text) return Response.json({ error: "Nothing to say." }, { status: 400 });

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Lovable-API-Key": key,
            "X-Lovable-AIG-SDK": "fetch",
          },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            voice: "shimmer",
            input: text,
            response_format: "mp3",
            instructions: shatta.voice.instructions,
          }),
        }).catch(() => null);

        if (!res || !res.ok) {
          const detail = res ? await res.text().catch(() => "") : "";
          return Response.json(
            { error: `Voice output failed. ${detail.slice(0, 200)}` },
            { status: res?.status ?? 502 },
          );
        }

        return new Response(res.body, {
          headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
