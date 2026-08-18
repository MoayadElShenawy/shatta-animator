/**
 * Shatta voice output.
 * Server-rendered speech via the /api/speak route, with the browser's built-in
 * speech synthesis as a graceful fallback. Never autoplays unless the user opted in.
 */

import { shatta } from "@/characters/shatta/personality";

let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;

export type SpeakResult = { ok: true } | { ok: false; error: string };

export function isSpeaking() {
  return (
    Boolean(audio && !audio.paused) ||
    (typeof window !== "undefined" && window.speechSynthesis?.speaking) ||
    false
  );
}

export function stopSpeaking() {
  if (audio) {
    audio.pause();
    audio.src = "";
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
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
  // Cartoon-cat voice: prefer a bright/young voice, then push pitch up.
  const voices = window.speechSynthesis.getVoices?.() ?? [];
  const cute = voices.find((v) =>
    /(samantha|zira|karen|google uk english female|female|kid|child)/i.test(v.name),
  );
  if (cute) utterance.voice = cute;
  utterance.volume = volume;
  utterance.rate = shatta.voice.rate;
  utterance.pitch = shatta.voice.pitch;
  utterance.onend = () => onEnd?.();
  utterance.onerror = () => onEnd?.();
  window.speechSynthesis.speak(utterance);
  return { ok: true };
}

/** Speak `text`. Resolves once playback has started (or failed). */
export async function speak(text: string, volume: number, onEnd?: () => void): Promise<SpeakResult> {
  stopSpeaking();
  const clean = text.replace(/```[\s\S]*?```/g, " code block ").trim();
  if (!clean) return { ok: false, error: "Nothing to say." };

  try {
    const res = await fetch("/api/speak", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: clean.slice(0, 2000) }),
    });
    if (!res.ok) throw new Error(String(res.status));
    const blob = await res.blob();
    objectUrl = URL.createObjectURL(blob);
    audio = new Audio(objectUrl);
    audio.volume = Math.min(1, Math.max(0, volume));
    // Slight speed-up without pitch correction = cute cartoon-cat timbre.
    type PitchyAudio = HTMLAudioElement & { preservesPitch?: boolean; mozPreservesPitch?: boolean };
    const a = audio as PitchyAudio;
    a.preservesPitch = false;
    a.mozPreservesPitch = false;
    audio.playbackRate = shatta.voice.rate;
    audio.onended = () => {
      onEnd?.();
      stopSpeaking();
    };
    await audio.play();
    return { ok: true };
  } catch {
    return fallbackSpeak(clean, volume, onEnd);
  }
}

export function setVolume(volume: number) {
  if (audio) audio.volume = Math.min(1, Math.max(0, volume));
}
