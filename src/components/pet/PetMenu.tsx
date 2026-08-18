import { MessageCircle, Mic, Settings, Volume2, VolumeX, X } from "lucide-react";

/** The compact circular action bar that appears next to Shatta. */
export function PetMenu({
  onChat,
  onVoice,
  onToggleSound,
  onSettings,
  onClose,
  soundsOn,
  listening,
}: {
  onChat: () => void;
  onVoice: () => void;
  onToggleSound: () => void;
  onSettings: () => void;
  onClose?: () => void;
  soundsOn: boolean;
  listening: boolean;
}) {
  const item =
    "grid h-10 w-10 place-items-center rounded-full border-2 border-secondary/20 bg-card text-card-foreground shadow-md transition hover:-translate-y-0.5 hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <div className="animate-pop flex items-center gap-2 rounded-full border-2 border-primary/30 bg-card/95 p-1.5 shadow-[0_12px_32px_-14px_var(--shatta-glow)] backdrop-blur">
      <button type="button" className={item} onClick={onChat} aria-label="Chat with Shatta">
        <MessageCircle className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={`${item} ${listening ? "border-primary text-primary" : ""}`}
        onClick={onVoice}
        aria-label={listening ? "Stop listening" : "Talk to Shatta"}
        aria-pressed={listening}
      >
        <Mic className="h-4 w-4" />
      </button>
      <button
        type="button"
        className={item}
        onClick={onToggleSound}
        aria-label={soundsOn ? "Mute sounds" : "Unmute sounds"}
        aria-pressed={soundsOn}
      >
        {soundsOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
      </button>
      <button type="button" className={item} onClick={onSettings} aria-label="Shatta settings">
        <Settings className="h-4 w-4" />
      </button>
      {onClose ? (
        <button type="button" className={item} onClick={onClose} aria-label="Hide menu">
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
