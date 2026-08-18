import { useCallback, useEffect, useState } from "react";

export type PetSettings = {
  sounds: boolean;
  bubbles: boolean;
  idleAnimations: boolean;
  reduceMotion: boolean;
  /** AI chat companion */
  aiChat: boolean;
  /** Microphone dictation in the quick-chat composer */
  voiceInput: boolean;
  /** Read AI answers out loud (off by default — never autoplays) */
  voiceOutput: boolean;
  /** Playback volume for voice output, 0..1 */
  volume: number;
  /** Opt-in developer context (desktop only): branch + changed-file count */
  devContext: boolean;
};

export const DEFAULT_SETTINGS: PetSettings = {
  sounds: true,
  bubbles: true,
  idleAnimations: true,
  reduceMotion: false,
  aiChat: true,
  voiceInput: true,
  voiceOutput: false,
  volume: 0.8,
  devContext: false,
};

const STORAGE_KEY = "shatta:settings:v1";

function sanitize(input: Partial<PetSettings>): PetSettings {
  const merged = { ...DEFAULT_SETTINGS, ...input };
  const volume = Number(merged.volume);
  return {
    ...merged,
    volume: Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_SETTINGS.volume,
  };
}

function read(): PetSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return sanitize(JSON.parse(raw) as Partial<PetSettings>);
  } catch {
    return DEFAULT_SETTINGS;
  }
}

/** Persisted Shatta preferences. Reads on mount only, so SSR stays stable. */
export function usePetSettings() {
  const [settings, setSettings] = useState<PetSettings>(DEFAULT_SETTINGS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = read();
    const prefersReduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setSettings(prefersReduced ? { ...stored, reduceMotion: true } : stored);
    setHydrated(true);
  }, []);

  const update = useCallback((patch: Partial<PetSettings>) => {
    setSettings((prev) => {
      const next = sanitize({ ...prev, ...patch });
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // storage can be blocked — settings just won't persist
      }
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setSettings(DEFAULT_SETTINGS);
  }, []);

  return { settings, update, reset, hydrated };
}

export const __testing = { sanitize, STORAGE_KEY };
