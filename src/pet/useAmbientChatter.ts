import { useEffect, useRef } from "react";

import { getMood } from "@/hooks/usePetMood";
import {
  BEHAVIOR,
  BORED_LINES,
  SPONTANEOUS_LINES,
  canSpeak,
  markSpoken,
  msSinceInteraction,
  nextSpontaneousDelay,
  pickFresh,
} from "@/pet/behavior";
import { getShattaContext, shattaContext } from "@/pet/context";

/**
 * Occasional spontaneous bubbles.
 *
 * One randomized timer, one bubble at a time, gated by the shared cooldowns in
 * behavior.ts so user interaction always wins. Purely additive: it only calls
 * onSay, so bubble styling and the rest of the pipeline stay untouched.
 */
export function useAmbientChatter({
  enabled,
  onSay,
}: {
  enabled: boolean;
  onSay: (text: string) => void;
}) {
  const sayRef = useRef(onSay);
  sayRef.current = onSay;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;

    const loop = () => {
      timer = setTimeout(() => {
        const mood = getMood();
        const quiet =
          mood === "idle" ||
          mood === "blink" ||
          mood === "stretching" ||
          mood === "grooming" ||
          mood === "sleepy" ||
          mood === "sleeping";
        const ctx = getShattaContext();
        if (quiet && !ctx.interacting && canSpeak()) {
          const bored = msSinceInteraction() > BEHAVIOR.boredAfterMs;
          const line = pickFresh(bored ? [...BORED_LINES, ...SPONTANEOUS_LINES] : SPONTANEOUS_LINES);
          if (line) {
            markSpoken(line);
            shattaContext.spontaneous();
            sayRef.current(line);
          }
        }
        loop();
      }, nextSpontaneousDelay());
    };

    loop();
    return () => clearTimeout(timer);
  }, [enabled]);
}
