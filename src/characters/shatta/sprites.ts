/**
 * Shatta's sprite sheet.
 *
 * Every state maps to one or more transparent PNG frames. Multi-frame states
 * (walking) are cycled by the renderer at `frameMs`. Frames are all authored at
 * the same canvas size so the character never jumps between states.
 */

import type { PetState } from "@/characters/types";

import idle from "@/assets/shatta/idle.png";
import happy from "@/assets/shatta/happy.png";
import curious from "@/assets/shatta/curious.png";
import silly from "@/assets/shatta/silly.png";
import annoyed from "@/assets/shatta/annoyed.png";
import surprised from "@/assets/shatta/surprised.png";
import mischievous from "@/assets/shatta/mischievous.png";
import thinking from "@/assets/shatta/thinking.png";
import speaking from "@/assets/shatta/speaking.png";
import sleeping from "@/assets/shatta/sleeping.png";
import walk1 from "@/assets/shatta/walk-1.png";
import walk2 from "@/assets/shatta/walk-2.png";

export type SpriteEntry = { frames: readonly string[]; frameMs: number };

export const SHATTA_SPRITES: Record<PetState, SpriteEntry> = {
  idle: { frames: [idle], frameMs: 0 },
  blink: { frames: [idle], frameMs: 0 },
  curious: { frames: [curious], frameMs: 0 },
  happy: { frames: [happy], frameMs: 0 },
  silly: { frames: [silly], frameMs: 0 },
  annoyed: { frames: [annoyed], frameMs: 0 },
  surprised: { frames: [surprised], frameMs: 0 },
  mischievous: { frames: [mischievous], frameMs: 0 },
  thinking: { frames: [thinking], frameMs: 0 },
  speaking: { frames: [speaking, idle], frameMs: 220 },
  sleepy: { frames: [sleeping], frameMs: 0 },
  sleeping: { frames: [sleeping], frameMs: 0 },
  walking: { frames: [walk1, walk2], frameMs: 260 },
  dragging: { frames: [surprised], frameMs: 0 },
  celebrating: { frames: [happy], frameMs: 0 },
  stretching: { frames: [curious], frameMs: 0 },
  grooming: { frames: [silly], frameMs: 0 },
};

/** Every frame, for preloading. */
export const ALL_SHATTA_FRAMES: readonly string[] = Array.from(
  new Set(Object.values(SHATTA_SPRITES).flatMap((s) => s.frames)),
);

export const SHATTA_PORTRAIT = idle;
