import { useEffect, useRef } from "react";
import { getMood, setMood, usePetMood } from "@/hooks/usePetMood";
import { shatta } from "@/characters/shatta/personality";
import { playSound } from "@/characters/shatta/sounds";
import { lineFor, type PetState } from "@/characters/types";
import { canSpeak, markSpoken } from "@/pet/behavior";

/**
 * The life loop.
 *
 * Everything ambient the companion does on its own lives here: auto-return to
 * idle, blinking, random idle behaviours (stretch, groom, wander, mischief),
 * and falling asleep when nobody has touched her for a while. UI components
 * only *request* states; this hook owns the timing.
 */

const BLINK_MIN = 2600;
const BLINK_MAX = 7000;
const IDLE_ACTION_MIN = 9000;
const IDLE_ACTION_MAX = 22000;
const SLEEP_AFTER = 90_000;

const IDLE_ACTIONS: PetState[] = ["stretching", "grooming", "curious", "mischievous", "walking"];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(items: readonly T[]): T => items[Math.floor(Math.random() * items.length)]!;

export type PetLifeOptions = {
  enabled: boolean;
  idleAnimations: boolean;
  sounds: boolean;
  /** Called whenever the companion wants to say something out of her own head. */
  onSay?: (text: string) => void;
};

export function usePetLife({ enabled, idleAnimations, sounds, onSay }: PetLifeOptions) {
  const { mood } = usePetMood();
  const lastInteraction = useRef(Date.now());
  const sayRef = useRef(onSay);
  sayRef.current = onSay;

  /** Call from any user interaction to keep her awake. */
  const touch = useRef(() => {
    lastInteraction.current = Date.now();
    if (getMood() === "sleeping" || getMood() === "sleepy") {
      setMood("surprised", true);
      if (sounds) playSound("wake");
    }
  });

  // Auto-return to idle + entry sound + entry line.
  useEffect(() => {
    const config = shatta.states[mood];
    if (sounds && config.sound && mood !== "idle") playSound(config.sound);

    // State lines share the spontaneous-bubble gate: cooldown + never on top of
    // an active interaction, so reactions stay visual instead of chatty.
    const line = lineFor(shatta.states, mood);
    if (line && canSpeak()) {
      markSpoken(line);
      sayRef.current?.(line);
    }

    if (config.autoIdleMs <= 0) return;
    const t = setTimeout(() => setMood("idle", true), config.autoIdleMs);
    return () => clearTimeout(t);
  }, [mood, sounds]);

  // Blink.
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        if (getMood() === "idle") {
          setMood("blink", true);
          setTimeout(() => getMood() === "blink" && setMood("idle", true), 180);
        }
        loop();
      }, rand(BLINK_MIN, BLINK_MAX));
    };
    loop();
    return () => clearTimeout(timer);
  }, [enabled]);

  // Random idle behaviour + sleeping.
  useEffect(() => {
    if (!enabled || !idleAnimations) return;
    let timer: ReturnType<typeof setTimeout>;
    const loop = () => {
      timer = setTimeout(() => {
        const asleepFor = Date.now() - lastInteraction.current;
        const current = getMood();
        if (current === "idle" || current === "blink") {
          if (asleepFor > SLEEP_AFTER) {
            setMood("sleepy", true);
            setTimeout(() => getMood() === "sleepy" && setMood("sleeping", true), 2200);
          } else {
            setMood(pick(IDLE_ACTIONS), true);
            if (getMood() === "walking") setTimeout(() => setMood("idle", true), rand(3000, 6000));
          }
        }
        loop();
      }, rand(IDLE_ACTION_MIN, IDLE_ACTION_MAX));
    };
    loop();
    return () => clearTimeout(timer);
  }, [enabled, idleAnimations]);

  return { mood, touch: touch.current };
}
