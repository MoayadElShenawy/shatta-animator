/**
 * Shatta voice output.
 *
 * Server-rendered speech via the /api/speak route, with the browser's built-in
 * speech synthesis as a graceful fallback. Never autoplays unless the user opted in.
 *
 * Long replies are spoken as breath-sized chunks played back to back: each chunk
 * gets its own sentence melody (instead of one long monotone block) and playback
 * starts as soon as the first chunk is ready.
 */

import { shatta } from "@/characters/shatta/personality";
import { chunkForSpeech, hasArabic, toSpeakable } from "@/lib/speech-text";

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let session = 0;

export type SpeakResult = { ok: true } | { ok: false; error: string };

export function isSpeaking() {
  return (
    Boolean(audio && !audio.paused) ||
    (typeof window !== "undefined" && window.speechSynthesis?.speaking) ||
    false
  );
}

function releaseAudio() {
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
}

export function stopSpeaking() {
  session += 1;
  releaseAudio();
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // ignore
  }
}

function fallbackSpeak(text: string, volume: number, onEnd?: () => void): SpeakResult {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    return { ok: false, error: "Your browser can't play voice output." };
  }
  const utterance = new SpeechSynthesisUtterance(text);
  // Cute cartoon-cat voice: prefer a bright/young voice, matching the language.
  const voices = window.speechSynthesis.getVoices?.() ?? [];
  const wantArabic = hasArabic(text);
  const pool = wantArabic
    ? voices.filter((v) => /^ar/i.test(v.lang))
    : voices.filter((v) => !/^ar/i.test(v.lang));
  const cute =
    (wantArabic ? pool.find((v) => /(egypt|eg[-_]|salma|hoda|female)/i.test(`${v.name} ${v.lang}`)) : null) ??
    pool.find((v) => /(samantha|zira|karen|google uk english female|female|kid|child)/i.test(v.name)) ??
    pool[0];
  if (cute) utterance.voice = cute;
  if (wantArabic) utterance.lang = cute?.lang ?? "ar-EG";
  utterance.volume = volume;
  utterance.rate = shatta.voice.rate;
  utterance.pitch = shatta.voice.pitch;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

async function fetchChunk(text: string): Promise<Blob> {
  const res = await fetch("/api/speak", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(String(res.status));
  return res.blob();
}

function playBlob(blob: Blob, volume: number): Promise<void> {
  return new Promise((resolve, reject) => {
    releaseAudio();
    objectUrl = URL.createObjectURL(blob);
    const el = new Audio(objectUrl);
    audio = el;
    el.volume = Math.min(1, Math.max(0, volume));
    // No playbackRate trickery: resampling is what made her sound robotic.
    el.onended = () => resolve();
    el.onerror = () => reject(new Error("playback failed"));
    void el.play().catch(reject);
  });
}

/** Speak `text`. Resolves once playback has finished (or failed). */
export async function speak(text: string, volume: number, onEnd?: () => void): Promise<SpeakResult> {
  stopSpeaking();
  const mine = session;
  const clean = toSpeakable(text);
  if (!clean) return { ok: false, error: "Nothing to say." };

  const chunks = chunkForSpeech(clean.slice(0, 4000));

  try {
    // Prefetch the next chunk while the current one plays: no dead air between
    // sentences, so the delivery stays conversational.
    let next: Promise<Blob> | null = fetchChunk(chunks[0]!);
    for (let i = 0; i < chunks.length; i++) {
      const current = next!;
      next = i + 1 < chunks.length ? fetchChunk(chunks[i + 1]!) : null;
      const blob = await current;
      if (session !== mine) return { ok: true };
      await playBlob(blob, volume);
      if (session !== mine) return { ok: true };
    }
    onEnd?.();
    releaseAudio();
    return { ok: true };
  } catch {
    if (session !== mine) return { ok: true };
    return fallbackSpeak(clean, volume, onEnd);
  }
}

export function setVolume(volume: number) {
  if (audio) audio.volume = Math.min(1, Math.max(0, volume));
}
