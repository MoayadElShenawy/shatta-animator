import { createFileRoute } from "@tanstack/react-router";

/** Speech-to-text for Shatta's microphone button. Audio is forwarded once and never stored. */
export const Route = createFileRoute("/api/transcribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return Response.json({ error: "Voice input is not configured yet." }, { status: 503 });
        }

        const form = await request.formData().catch(() => null);
        const file = form?.get("audio");
        if (!(file instanceof File)) {
          return Response.json({ error: "No audio received." }, { status: 400 });
        }
        if (file.size > 20 * 1024 * 1024) {
          return Response.json({ error: "That recording is too long." }, { status: 413 });
        }

        const upstreamForm = new FormData();
        upstreamForm.append("file", file, file.name || "speech.webm");
        upstreamForm.append("model", "openai/gpt-4o-transcribe");

        const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/transcriptions", {
          method: "POST",
          headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
          body: upstreamForm,
        }).catch(() => null);

        if (!res || !res.ok) {
          const detail = res ? await res.text().catch(() => "") : "";
          return Response.json(
            { error: `Couldn't transcribe that. ${detail.slice(0, 200)}` },
            { status: res?.status ?? 502 },
          );
        }

        const data = (await res.json()) as { text?: string };
        return Response.json({ text: data.text ?? "" });
      },
    },
  },
});
