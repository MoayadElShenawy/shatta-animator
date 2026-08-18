import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

import { Shatta } from "@/components/pet/Shatta";

export const Route = createFileRoute("/overlay")({
  head: () => ({
    meta: [
      { title: "Shatta Overlay — Desktop Companion" },
      {
        name: "description",
        content:
          "The transparent desktop overlay for Shatta, the chaotic coding cat. Loaded by the Shatta desktop app.",
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: "Shatta Overlay" },
      { property: "og:description", content: "Transparent desktop overlay for Shatta, the chaotic coding cat." },
    ],
  }),
  component: OverlayPage,
});

function OverlayPage() {
  // The desktop shell renders this page in a transparent, click-through window.
  useEffect(() => {
    const { documentElement, body } = document;
    const prev = [documentElement.style.background, body.style.background] as const;
    documentElement.style.background = "transparent";
    body.style.background = "transparent";
    return () => {
      documentElement.style.background = prev[0];
      body.style.background = prev[1];
    };
  }, []);

  return (
    <main className="h-screen w-screen overflow-hidden bg-transparent">
      <h1 className="sr-only">Shatta desktop overlay</h1>
      <Shatta variant="overlay" initial={{ x: 0.85, y: 0.78 }} />
    </main>
  );
}
