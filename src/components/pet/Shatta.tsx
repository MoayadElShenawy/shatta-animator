import { useCallback, useEffect, useRef, useState } from "react";

import { Sprite } from "@/components/pet/Sprite";
import { SpeechBubble } from "@/components/pet/SpeechBubble";
import { PetMenu } from "@/components/pet/PetMenu";
import { QuickChat } from "@/components/pet/QuickChat";
import { SettingsPanel } from "@/components/pet/SettingsPanel";
import { useSmartPlacement } from "@/components/pet/useSmartPlacement";

import { usePetSettings } from "@/hooks/usePetSettings";
import { usePetLife } from "@/pet/usePetState";
import { useAmbientChatter } from "@/pet/useAmbientChatter";
import { REACTIONS, notifyInteraction, requestReaction } from "@/pet/behavior";
import { getShattaContext, shattaContext } from "@/pet/context";
import { useShattaChat } from "@/hooks/useShattaChat";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { useDevEvents } from "@/hooks/useDevEvents";
import { setMood } from "@/hooks/usePetMood";
import { playSound } from "@/characters/shatta/sounds";
import { speak, stopSpeaking } from "@/lib/voice-output";

/**
 * The companion container.
 *
 * Owns placement, pointer interactions (click / double-click / drag / ignore),
 * and wires the life loop, chat, voice and settings together. It renders the
 * character through the character-agnostic <Sprite /> contract, so swapping in
 * the final artwork only means replacing the files behind the sprite sheet.
 */

const SIZE = 128;
const BUBBLE_MS = 4200;

export function Shatta({
  variant = "page",
  initial = { x: 0.5, y: 0.7 },
}: {
  /** "overlay" = transparent desktop window, "page" = inside the website. */
  variant?: "overlay" | "page";
  /** Starting position as a fraction of the viewport. */
  initial?: { x: number; y: number };
}) {
  const { settings, update, reset, hydrated } = usePetSettings();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [facing, setFacing] = useState<1 | -1>(1);
  const [bubble, setBubble] = useState<string | null>(null);
  const [panel, setPanel] = useState<"none" | "menu" | "chat" | "settings">("none");
  const dragging = useRef(false);
  const moved = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const bubbleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const placement = useSmartPlacement(
    anchorRef,
    panelRef,
    panel !== "none",
    `${panel}:${Math.round(pos?.x ?? 0)}:${Math.round(pos?.y ?? 0)}`,
  );

  /* ------------------------------- speaking ------------------------------ */

  const say = useCallback(
    (text: string) => {
      if (!text) return;
      setBubble(text);
      if (bubbleTimer.current) clearTimeout(bubbleTimer.current);
      bubbleTimer.current = setTimeout(() => setBubble(null), BUBBLE_MS);
    },
    [],
  );

  const maybeSay = useCallback(
    (text: string) => {
      if (settings.bubbles) say(text);
    },
    [say, settings.bubbles],
  );

  /* ------------------------------ engine hooks --------------------------- */

  const { mood, touch } = usePetLife({
    enabled: hydrated,
    idleAnimations: settings.idleAnimations,
    sounds: settings.sounds,
    onSay: maybeSay,
  });

  const chat = useShattaChat({
    onAnswer: (text) => {
      notifyInteraction();
      maybeSay(text.length > 160 ? `${text.slice(0, 157)}...` : text);
      if (settings.voiceOutput) void speak(text, settings.volume);
      requestReaction(REACTIONS.success);
    },
  });

  useAmbientChatter({ enabled: hydrated && settings.bubbles, onSay: say });

  const mic = useVoiceInput((text) => chat.send(text));
  const { available: devAvailable } = useDevEvents(settings.devContext, maybeSay);


  useEffect(() => () => stopSpeaking(), []);

  // Keep the interaction context aware of the open panel, and expose a read-only
  // snapshot for debugging / future AI consumers. Observation only.
  useEffect(() => {
    shattaContext.menu(panel !== "none");
  }, [panel]);

  useEffect(() => {
    (window as unknown as { shattaContextSnapshot?: () => unknown }).shattaContextSnapshot =
      () => getShattaContext();
  }, []);

  useEffect(() => {
    if (!settings.voiceOutput) stopSpeaking();
  }, [settings.voiceOutput]);

  /* ------------------------------- placement ----------------------------- */

  useEffect(() => {
    if (typeof window === "undefined") return;
    setPos({
      x: window.innerWidth * initial.x - SIZE / 2,
      y: window.innerHeight * initial.y - SIZE / 2,
    });
    // position is seeded once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!dragging.current) return;
      moved.current = true;
      const x = Math.min(Math.max(0, e.clientX - offset.current.x), window.innerWidth - SIZE);
      const y = Math.min(Math.max(0, e.clientY - offset.current.y), window.innerHeight - SIZE);
      setPos((p) => {
        if (p) setFacing(x > p.x ? 1 : x < p.x ? -1 : facing);
        return { x, y };
      });
    };
    const onUp = () => {
      if (!dragging.current) return;
      dragging.current = false;
      setMood(moved.current ? "surprised" : "idle", true);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [facing]);

  /* ------------------------------ locomotion ----------------------------- */

  // While the walk cycle plays, the entity position actually travels. Speed is
  // tuned to the stride: 5 frames x 130ms = 650ms per cycle, ~52px of ground
  // covered per cycle, so the feet read as planted instead of sliding.
  const WALK_PX_PER_SEC = 80;

  useEffect(() => {
    if (mood !== "walking" || dragging.current || settings.reduceMotion) return;
    let raf = 0;
    let last = performance.now();
    let dir: 1 | -1 = Math.random() < 0.5 ? -1 : 1;
    setFacing(dir);

    const step = (now: number) => {
      const dt = Math.min(now - last, 64) / 1000;
      last = now;
      setPos((p) => {
        if (!p) return p;
        const max = Math.max(0, window.innerWidth - SIZE);
        let x = p.x + dir * WALK_PX_PER_SEC * dt;
        if (x <= 0) {
          x = 0;
          dir = 1;
          setFacing(1);
        } else if (x >= max) {
          x = max;
          dir = -1;
          setFacing(-1);
        }
        return { x, y: p.y };
      });
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [mood, settings.reduceMotion]);

  /* -------------------------- desktop click-through ---------------------- */

  const setInteractive = useCallback((value: boolean) => {
    if (variant !== "overlay") return;
    window.shatta?.setInteractive?.(value);
    // variant never changes for a mounted instance
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [variant]);

  useEffect(() => {
    if (variant !== "overlay") return;
    // Panels are interactive surfaces — keep the window clickable while open.
    if (panel !== "none") window.shatta?.setInteractive?.(true);
  }, [panel, variant]);

  /* ------------------------------ interactions --------------------------- */

  const onPointerDown = (e: React.PointerEvent) => {
    touch();
    notifyInteraction();
    dragging.current = true;
    moved.current = false;
    offset.current = { x: e.clientX - (pos?.x ?? 0), y: e.clientY - (pos?.y ?? 0) };
    setMood("dragging", true);
  };

  // Taps are detected from pointerup rather than click/dblclick: the sprite's
  // frame images are swapped while cycling, which can eat the synthetic click.
  const onTap = () => {
    if (moved.current) return;
    touch();
    if (settings.sounds) playSound("click");
    if (clickTimer.current) {
      // second tap inside the window = double click: brief startle, then menu.
      clearTimeout(clickTimer.current);
      clickTimer.current = null;
      shattaContext.doubleClick();
      requestReaction(REACTIONS.menu);
      setPanel((p) => (p === "none" ? "menu" : "none"));
      return;
    }
    clickTimer.current = setTimeout(() => {
      clickTimer.current = null;
      shattaContext.click();
      // Single click = she noticed you. Cooldown-gated so repeated pokes reuse
      // the running reaction instead of stacking new ones.
      const pokes = REACTIONS.poke;
      requestReaction(pokes[Math.floor(Math.random() * pokes.length)]!);
    }, 260);
  };


  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onTap();
    }
    if (e.key === "m") setPanel((p) => (p === "menu" ? "none" : "menu"));
  };

  const closePanel = () => setPanel("none");

  if (!pos) return null;

  const bubbleSide = pos.x > (typeof window !== "undefined" ? window.innerWidth / 2 : 600) ? "left" : "right";

  return (
    <div
      className="pointer-events-none fixed inset-0 z-50"
      style={variant === "overlay" ? { background: "transparent" } : undefined}
    >
      {/* The anchor box is exactly the sprite box: nothing else participates in
          its layout, so bubbles and panels can never push the character around.
          `pos` stays the single source of truth for her world position. */}
      <div
        className="pointer-events-auto absolute"
        style={{ left: pos.x, top: pos.y, width: SIZE, height: SIZE }}
        onPointerEnter={() => setInteractive(true)}
        onPointerLeave={() => panel === "none" && setInteractive(false)}
      >
        {bubble && settings.bubbles ? (
          <div
            className="pointer-events-none absolute max-w-[16rem]"
            style={{
              bottom: SIZE + 8,
              left: "50%",
              transform: "translateX(-50%)",
              width: "max-content",
            }}
          >
            <SpeechBubble text={bubble} side={bubbleSide} />
          </div>
        ) : null}

        <div
          ref={anchorRef}
          role="button"
          tabIndex={0}
          aria-label="Shatta, your desktop cat. Click to poke, double-click for the menu, drag to move."
          className="cursor-grab select-none active:cursor-grabbing focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          style={{ width: SIZE, height: SIZE }}
          onPointerDown={onPointerDown}
          onPointerUp={onTap}
          onKeyDown={onKeyDown}
          onMouseEnter={() => settings.sounds && playSound("hover")}
        >
          <Sprite state={mood} size={SIZE} facing={facing} reduceMotion={settings.reduceMotion} />
        </div>
      </div>

      {panel !== "none" ? (
        <div
          ref={panelRef}
          className="pointer-events-auto fixed"
          style={{
            left: placement?.left ?? 0,
            top: placement?.top ?? 0,
            opacity: placement ? 1 : 0,
            width: "max-content",
          }}
          onPointerEnter={() => setInteractive(true)}
        >
          {panel === "menu" ? (
            <PetMenu
              soundsOn={settings.sounds}
              listening={mic.status === "recording"}
              onChat={() => setPanel("chat")}
              onVoice={() => {
                if (!settings.voiceInput || !mic.supported) return;
                setPanel("chat");
                void mic.start();
              }}
              onToggleSound={() => update({ sounds: !settings.sounds })}
              onSettings={() => setPanel("settings")}
              onClose={closePanel}
            />
          ) : null}

          {panel === "chat" && settings.aiChat ? (
            <QuickChat
              messages={chat.messages}
              status={chat.status}
              error={chat.error}
              onSend={chat.send}
              onClear={chat.clear}
              onClose={closePanel}
              mic={{
                status: mic.status,
                supported: mic.supported && settings.voiceInput,
                error: mic.error,
                start: () => void mic.start(),
                stop: mic.stop,
              }}
            />
          ) : null}

          {panel === "settings" ? (
            <SettingsPanel
              settings={settings}
              onChange={update}
              onReset={reset}
              onClose={closePanel}
              devAvailable={devAvailable}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
