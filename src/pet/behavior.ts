/**
 * Lightweight behaviour layer: spontaneous chatter + short reactions.
 *
 * Deterministic and dependency-free. All timing lives in BEHAVIOR below — the
 * one obvious place to tune how alive (or how quiet) Shatta feels. Nothing here
 * touches sprites, scaling, locomotion, placement or voice.
 */

import { getMood, setMood } from "@/hooks/usePetMood";
import type { PetState } from "@/characters/types";

export const BEHAVIOR = {
  /** Random window between two spontaneous bubble attempts. */
  spontaneousMinMs: 50_000,
  spontaneousMaxMs: 120_000,
  /** Hard floor between any two bubbles (state lines included). */
  bubbleCooldownMs: 35_000,
  /** Stay quiet for this long after the user interacts. */
  interactionQuietMs: 8_000,
  /** Minimum gap between two reactions. */
  reactionCooldownMs: 1_200,
  /** How many recent lines are remembered to avoid repeats. */
  recentLineMemory: 6,
  /** Idle time after which the bored pool becomes eligible. */
  boredAfterMs: 90_000,
} as const;

/** Curated pool — mixed moods, not all interior design. */
export const SPONTANEOUS_LINES: readonly string[] = [
  "هممم... هو المخدة دي مكانها هنا فعلًا؟ 👀",
  "أنا حاسة إن المكان ده ناقصه حاجة...",
  "هو إحنا هنشتغل ولا هنلعب؟",
  "استنى... أنا عندي فكرة!",
  "الكوشن الأزرق ده كان أحلى على الشمال، بصراحة.",
  "بصي، النور اللي جاي من الشمال ده بيغير كل الألوان.",
  "أنا قاعدة على حاجة دافية، متقوميني بلاش.",
  "الكرسي ده شكله مريح... هجرّبه بالنيابة عنك.",
  "لو الحيطة دي كانت بيج فاتح، كانت هتنور المكان.",
  "شوفتي الخيط اللي هنا؟ مش أنا اللي سحبته.",
  "أنا كنت هرتب حاجة، بعدين نسيت.",
  "تعالي بصي كده... خلاص روحي، مش مهم.",
];

export const BORED_LINES: readonly string[] = [
  "مياو... أنا زهقت شوية 😼",
  "المكان ساكت أوي كده.",
  "أنا هنا لو حابة تكلميني.",
];

/** Reaction states — existing states only, no new assets or motion. */
export const REACTIONS = {
  poke: ["curious", "happy"] as const,
  menu: "surprised" as const,
  success: "happy" as const,
};

const REACTION_ALLOWED_FROM: readonly PetState[] = [
  "idle",
  "blink",
  "stretching",
  "grooming",
  "curious",
  "happy",
  "sleepy",
  "sleeping",
  "walking",
  "mischievous",
];

let lastBubbleAt = 0;
let lastReactionAt = 0;
let lastInteractionAt = 0;
let recent: string[] = [];

export function notifyInteraction() {
  lastInteractionAt = Date.now();
}

export function msSinceInteraction() {
  return Date.now() - lastInteractionAt;
}

/** Bubble gate: cooldown + no interrupting an active interaction. */
export function canSpeak(now = Date.now()) {
  if (now - lastBubbleAt < BEHAVIOR.bubbleCooldownMs) return false;
  if (now - lastInteractionAt < BEHAVIOR.interactionQuietMs) return false;
  return true;
}

export function markSpoken(line: string) {
  lastBubbleAt = Date.now();
  recent = [line, ...recent].slice(0, BEHAVIOR.recentLineMemory);
}

/** Pick a line that was not used recently. */
export function pickFresh(pool: readonly string[]): string | null {
  const fresh = pool.filter((l) => !recent.includes(l));
  const from = fresh.length ? fresh : pool;
  if (!from.length) return null;
  return from[Math.floor(Math.random() * from.length)] ?? null;
}

/**
 * Request a short reaction. Returns false when a reaction is already running or
 * the cooldown is still hot — repeated clicks reuse the active one instead of
 * stacking. Reactions never move her: the state machine auto-returns to idle.
 */
export function requestReaction(state: PetState, now = Date.now()) {
  notifyInteraction();
  if (now - lastReactionAt < BEHAVIOR.reactionCooldownMs) return false;
  const mood = getMood();
  if (!REACTION_ALLOWED_FROM.includes(mood)) return false;
  lastReactionAt = now;
  setMood(state, true);
  return true;
}

export function nextSpontaneousDelay() {
  const { spontaneousMinMs: min, spontaneousMaxMs: max } = BEHAVIOR;
  return min + Math.random() * (max - min);
}

/** Test helper. */
export function __resetBehavior() {
  lastBubbleAt = 0;
  lastReactionAt = 0;
  lastInteractionAt = 0;
  recent = [];
}
