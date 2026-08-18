/**
 * Shatta's sound set — small, bright, slightly chaotic chiptune blips.
 * Bound to the shared audio engine; no audio files are shipped.
 */

import { createSoundPlayer, type SoundBank } from "@/lib/pet-audio";

export const SHATTA_SOUNDS: SoundBank = {
  hover: [{ f: 1240, t: 0, d: 0.045, gain: 0.03 }],
  click: [
    { f: 920, t: 0, d: 0.06 },
    { f: 1420, t: 0.055, d: 0.07 },
  ],
  happy: [
    { f: 784, t: 0, d: 0.07 },
    { f: 1047, t: 0.065, d: 0.07 },
    { f: 1397, t: 0.13, d: 0.12 },
  ],
  surprised: [
    { f: 1568, t: 0, d: 0.05, type: "square", gain: 0.045 },
    { f: 1046, t: 0.05, d: 0.09, type: "square", gain: 0.04 },
  ],
  walk: [{ f: 320, t: 0, d: 0.035, type: "sine", gain: 0.025 }],
  celebrate: [
    { f: 659, t: 0, d: 0.06 },
    { f: 880, t: 0.055, d: 0.06 },
    { f: 1175, t: 0.11, d: 0.06 },
    { f: 1661, t: 0.17, d: 0.16 },
  ],
  sleep: [
    { f: 440, t: 0, d: 0.14, type: "sine", gain: 0.045 },
    { f: 262, t: 0.12, d: 0.24, type: "sine", gain: 0.045 },
  ],
  wake: [
    { f: 523, t: 0, d: 0.07, type: "sine" },
    { f: 831, t: 0.065, d: 0.12, type: "sine" },
  ],
  speak: [{ f: 1100, t: 0, d: 0.04, type: "sine", gain: 0.028 }],
};

export const playSound = createSoundPlayer(SHATTA_SOUNDS);
