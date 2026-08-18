/**
 * Companion audio engine (character-agnostic).
 *
 * Tiny synthesized pixel-game blips — no audio assets, no network, ~0 CPU when
 * idle. The AudioContext is created lazily on the first user gesture.
 * A character package supplies its own sound bank; the engine plays it.
 */

import type { SoundName } from "@/characters/types";

export type Note = { f: number; t: number; d: number; type?: OscillatorType; gain?: number };
export type SoundBank = Record<SoundName, Note[]>;

let ctx: AudioContext | null = null;
let master: GainNode | null = null;

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

/** Play a raw note sequence. Silently no-ops when audio is unavailable. */
export function playNotes(notes: readonly Note[]) {
  try {
    const audio = ensureContext();
    if (!audio || !master) return;
    const now = audio.currentTime;
    for (const note of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = note.type ?? "triangle";
      osc.frequency.setValueAtTime(note.f, now + note.t);
      const peak = note.gain ?? 0.06;
      gain.gain.setValueAtTime(0.0001, now + note.t);
      gain.gain.exponentialRampToValueAtTime(peak, now + note.t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + note.t + note.d);
      osc.connect(gain).connect(master);
      osc.start(now + note.t);
      osc.stop(now + note.t + note.d + 0.02);
    }
  } catch {
    // audio is a nicety, never a failure path
  }
}

/** Bind a sound bank to a `playSound(name)` function. */
export function createSoundPlayer(bank: SoundBank) {
  return (name: SoundName) => playNotes(bank[name]);
}

export type { SoundName };
