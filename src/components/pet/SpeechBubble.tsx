/** Shatta's little speech bubble. Pure presentation. */
export function SpeechBubble({
  text,
  side = "right",
}: {
  text: string;
  side?: "left" | "right";
}) {
  return (
    <div
      className={`animate-pop pointer-events-none max-w-[15rem] rounded-2xl border-2 border-primary bg-card px-3.5 py-2 text-sm leading-snug text-card-foreground shadow-[0_10px_30px_-12px_var(--shatta-glow)] ${
        side === "left" ? "rounded-br-sm" : "rounded-bl-sm"
      }`}
    >
      {text}
    </div>
  );
}
