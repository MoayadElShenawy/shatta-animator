/**
 * Character-agnostic companion contract.
 *
 * The engine (src/pet/*) never knows *which* character it is rendering — it only
 * knows this contract. A character package (e.g. src/characters/shatta) supplies
 * the states, sprites, sounds and personality.
 */

/** Every state the companion state machine can be in. */
export type PetState =
  | "idle"
  | "blink"
  | "curious"
  | "happy"
  | "silly"
  | "annoyed"
  | "surprised"
  | "mischievous"
  | "thinking"
  | "speaking"
  | "sleepy"
  | "sleeping"
  | "walking"
  | "dragging"
  | "celebrating"
  | "stretching"
  | "grooming";

export const PET_STATES: readonly PetState[] = [
  "idle",
  "blink",
  "curious",
  "happy",
  "silly",
  "annoyed",
  "surprised",
  "mischievous",
  "thinking",
  "speaking",
  "sleepy",
  "sleeping",
  "walking",
  "dragging",
  "celebrating",
  "stretching",
  "grooming",
];

/** Reactions the audio engine can play. */
export type SoundName =
  | "click"
  | "hover"
  | "happy"
  | "surprised"
  | "walk"
  | "sleep"
  | "wake"
  | "celebrate"
  | "speak";

/** Secondary motion applied on top of the frame animation. */
export type SecondaryMotion = "breathe" | "bob" | "hop" | "float" | "wiggle" | "walk" | "talk" | "none";

export type StateConfig = {
  /** Frames are resolved by the character's sprite sheet, keyed by state. */
  motion: SecondaryMotion;
  /** Optional blip played once when entering the state. */
  sound?: SoundName;
  /** Lines the character may say when entering the state. */
  lines: readonly string[];
  /** Auto-return to idle after N ms (0 = stay until changed). */
  autoIdleMs: number;
  /** Priority — a lower-priority state cannot interrupt a higher one. */
  priority: number;
};

export type CharacterDefinition = {
  id: string;
  name: string;
  states: Record<PetState, StateConfig>;
  systemPrompt: string;
  /** Voice-output tuning for the TTS route. */
  voice: {
    /** Voice-direction prompt used for Latin-script (English) speech. */
    instructions: string;
    /** Voice-direction prompt used when the line is Egyptian Arabic. */
    arabicInstructions: string;
    /** TTS voice id. */
    name: string;
    /** Speaking speed passed to the TTS model (1 = natural). */
    speed: number;
    /** Playback rate for the browser fallback voice. */
    rate: number;
    /** Pitch for the browser fallback voice. */
    pitch: number;
  };
};

/** Can `next` take over from `current`? */
export function canTransition(
  states: Record<PetState, StateConfig>,
  current: PetState,
  next: PetState,
): boolean {
  if (current === next) return false;
  if (next === "idle") return true;
  return states[next].priority >= states[current].priority;
}

export function lineFor(states: Record<PetState, StateConfig>, state: PetState): string | null {
  const lines = states[state].lines;
  if (!lines.length) return null;
  return lines[Math.floor(Math.random() * lines.length)] ?? null;
}
