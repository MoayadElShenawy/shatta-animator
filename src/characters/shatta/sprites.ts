/**
 * Shatta's sprite sheet.
 *
 * Every state maps to one or more transparent PNG frames. Multi-frame states
 * (walking) are cycled by the renderer at `frameMs`. Frames are all authored at
 * the same canvas size so the character never jumps between states.
 */

import type { PetState } from "@/characters/types";

import idle from "@/assets/shatta/idle.png";
import blink from "@/assets/shatta/blink.png";
import happy from "@/assets/shatta/happy.png";
import curious from "@/assets/shatta/curious.png";
import silly from "@/assets/shatta/silly.png";
import annoyed from "@/assets/shatta/annoyed.png";
import surprised from "@/assets/shatta/surprised.png";
import mischievous from "@/assets/shatta/mischievous.png";
import thinking from "@/assets/shatta/thinking.png";
import speaking from "@/assets/shatta/speaking.png";
import sleepy from "@/assets/shatta/sleepy.png";
import sleeping from "@/assets/shatta/sleeping.png";
import stretch from "@/assets/shatta/stretch.png";
import grooming from "@/assets/shatta/grooming.png";
import celebrate from "@/assets/shatta/celebrate.png";
import drag from "@/assets/shatta/drag.png";
import walk1 from "@/assets/shatta/walk-1.png";
import walk2 from "@/assets/shatta/walk-2.png";
import walk3 from "@/assets/shatta/walk-3.png";
import walk4 from "@/assets/shatta/walk-4.png";
import walk5 from "@/assets/shatta/walk-5.png";

/**
 * `scale` is a *uniform* display correction, not a stylistic choice.
 *
 * Each frame was padded to the shared 768x768 canvas independently, so the
 * drawing itself ended up at a slightly different scale per frame (poses with
 * spread paws/tail were fit tighter). Rendering every frame at the same box
 * size therefore made the body read as bigger/smaller — i.e. subtly squashed —
 * between states. These factors are measured per frame against `idle` and
 * restore one consistent character size. Aspect ratio is never touched.
 */
export type SpriteEntry = { frames: readonly string[]; frameMs: number; scale?: number };

export const SHATTA_SPRITES: Record<PetState, SpriteEntry> = {
  idle: { frames: [idle], frameMs: 0, scale: 1 },
  blink: { frames: [blink], frameMs: 0, scale: 0.999 },
  curious: { frames: [curious], frameMs: 0, scale: 1.006 },
  happy: { frames: [happy], frameMs: 0, scale: 0.995 },
  silly: { frames: [silly], frameMs: 0, scale: 1.034 },
  annoyed: { frames: [annoyed], frameMs: 0, scale: 1.033 },
  surprised: { frames: [surprised], frameMs: 0, scale: 0.906 },
  mischievous: { frames: [mischievous], frameMs: 0, scale: 1.009 },
  thinking: { frames: [thinking], frameMs: 0, scale: 1.031 },
  speaking: { frames: [speaking, idle], frameMs: 220, scale: 0.999 },
  sleepy: { frames: [sleepy], frameMs: 0, scale: 1.064 },
  sleeping: { frames: [sleeping], frameMs: 0, scale: 0.976 },
  walking: { frames: [walk1, walk2, walk3, walk4, walk5], frameMs: 130, scale: 0.943 },
  dragging: { frames: [drag], frameMs: 0, scale: 0.962 },
  celebrating: { frames: [celebrate], frameMs: 0, scale: 1.061 },
  stretching: { frames: [stretch], frameMs: 0, scale: 0.98 },
  grooming: { frames: [grooming], frameMs: 0, scale: 0.998 },
};

/** Every frame, for preloading. */
export const ALL_SHATTA_FRAMES: readonly string[] = Array.from(
  new Set(Object.values(SHATTA_SPRITES).flatMap((s) => s.frames)),
);

export const SHATTA_PORTRAIT = idle;
