import { X } from "lucide-react";
import type { PetSettings } from "@/hooks/usePetSettings";

type Toggle = { key: keyof PetSettings; label: string; hint: string };

const TOGGLES: Toggle[] = [
  { key: "sounds", label: "Sound effects", hint: "Little chip-tune blips when Shatta reacts." },
  { key: "bubbles", label: "Speech bubbles", hint: "Let Shatta comment on things out loud." },
  { key: "idleAnimations", label: "Idle antics", hint: "Stretching, grooming, wandering, napping." },
  { key: "reduceMotion", label: "Reduce motion", hint: "Freeze secondary motion and frame cycling." },
  { key: "aiChat", label: "AI chat", hint: "Ask Shatta anything from the quick composer." },
  { key: "voiceInput", label: "Voice input", hint: "Dictate with the microphone button." },
  { key: "voiceOutput", label: "Voice output", hint: "Read answers out loud. Never autoplays without this." },
  { key: "devContext", label: "Developer context", hint: "Desktop only: branch + changed-file count. Never your code." },
];

/** Preferences panel for the companion. Pure presentation over usePetSettings. */
export function SettingsPanel({
  settings,
  onChange,
  onReset,
  onClose,
  devAvailable,
}: {
  settings: PetSettings;
  onChange: (patch: Partial<PetSettings>) => void;
  onReset: () => void;
  onClose: () => void;
  devAvailable?: boolean;
}) {
  return (
    <div className="animate-pop w-[22rem] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border-2 border-primary/40 bg-card/95 text-card-foreground shadow-[0_24px_60px_-24px_var(--shatta-glow)] backdrop-blur">
      <header className="flex items-center justify-between border-b border-border px-4 py-2">
        <span className="font-display text-sm font-bold tracking-wide text-primary">Shatta settings</span>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close settings"
          className="rounded-full p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </header>

      <div className="max-h-[22rem] space-y-1 overflow-y-auto p-2">
        {TOGGLES.map((t) => {
          const disabled = t.key === "devContext" && devAvailable === false;
          const checked = Boolean(settings[t.key]);
          return (
            <label
              key={t.key}
              className={`flex cursor-pointer items-start gap-3 rounded-2xl px-3 py-2 transition hover:bg-muted ${
                disabled ? "cursor-not-allowed opacity-50" : ""
              }`}
            >
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 accent-[var(--color-primary)]"
                checked={checked}
                disabled={disabled}
                onChange={(e) => onChange({ [t.key]: e.target.checked } as Partial<PetSettings>)}
              />
              <span className="min-w-0">
                <span className="block text-sm font-medium">{t.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {disabled ? "Available in the desktop app." : t.hint}
                </span>
              </span>
            </label>
          );
        })}

        <div className="rounded-2xl px-3 py-2">
          <label htmlFor="shatta-volume" className="block text-sm font-medium">
            Voice volume
          </label>
          <input
            id="shatta-volume"
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={settings.volume}
            onChange={(e) => onChange({ volume: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--color-primary)]"
          />
        </div>
      </div>

      <footer className="border-t border-border p-2">
        <button
          type="button"
          onClick={onReset}
          className="w-full rounded-full border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          Reset to defaults
        </button>
      </footer>
    </div>
  );
}
