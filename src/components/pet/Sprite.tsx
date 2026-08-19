import { useEffect, useMemo, useRef, useState } from "react";
import { SHATTA_SPRITES } from "@/characters/shatta/sprites";
import { shatta } from "@/characters/shatta/personality";
import type { PetState } from "@/characters/types";

/**
 * Frame renderer. Character-agnostic: it draws whichever frames the sprite
 * sheet supplies for the current state, cycling multi-frame states, and applies
 * the state's secondary motion as a CSS class.
 *
 * Phase 2 adds *continuity* on top of Phase 1's geometry:
 *  - a short crossfade between the outgoing and incoming frame, so states blend
 *    instead of snapping from one image to another,
 *  - a brief weight-shift lead-in when walking starts (the walk cycle still
 *    begins at frame 0 and keeps its 650ms stride), and a settle when it ends,
 *  - randomised phase/tempo on the idle breathe loop so it never reads as a
 *    perfectly mechanical repeat.
 * All transition motion is uniform (translate / uniform scale only) and keeps
 * the bottom edge anchored, so nothing squashes or lifts off the ground.
 */

/** Crossfade length for ordinary state changes. */
const FADE_MS = 160;
/** Held before the walk cycle starts cycling, while the weight shift plays. */
const WALK_LEAD_IN_MS = 120;
/** Settle length when walking ends. */
const WALK_OUT_MS = 200;

type Layer = { src: string; drawn: number; facing: 1 | -1 };

function transitionClass(from: PetState | null, to: PetState): string {
  if (!from || from === to) return "";
  if (to === "walking") return "shift-walk-in";
  if (from === "walking") return "shift-walk-out";
  if (to === "sleeping" || to === "sleepy") return "shift-settle-slow";
  if (from === "sleeping" || from === "sleepy") return "shift-wake";
  return "shift-settle";
}

export function Sprite({
  state,
  size,
  facing = 1,
  reduceMotion = false,
  className = "",
}: {
  state: PetState;
  size: number;
  /** 1 = facing right, -1 = facing left */
  facing?: 1 | -1;
  reduceMotion?: boolean;
  className?: string;
}) {
  const entry = SHATTA_SPRITES[state];
  const [frame, setFrame] = useState(0);

  // ------------------------------ frame cycling ----------------------------
  useEffect(() => {
    setFrame(0);
    if (entry.frames.length < 2 || entry.frameMs <= 0 || reduceMotion) return;
    // Walking holds its first contact pose for the lead-in, so the step starts
    // from the weight shift rather than mid-stride. The stride itself is
    // unchanged (frameMs per frame).
    let interval: ReturnType<typeof setInterval> | null = null;
    const start = () => {
      interval = setInterval(
        () => setFrame((f) => (f + 1) % entry.frames.length),
        entry.frameMs,
      );
    };
    const delay = state === "walking" ? WALK_LEAD_IN_MS : 0;
    const lead = delay > 0 ? setTimeout(start, delay) : (start(), null);
    return () => {
      if (lead) clearTimeout(lead);
      if (interval) clearInterval(interval);
    };
  }, [state, entry, reduceMotion]);

  const motion = reduceMotion ? "none" : shatta.states[state].motion;
  const src = entry.frames[frame % entry.frames.length]!;
  // Uniform per-state correction: the same value feeds width and height, so the
  // frame's natural aspect ratio is preserved; only its size is normalised.
  const drawn = Math.round(size * (entry.scale ?? 1));

  // ------------------------------- transitions -----------------------------
  const prevState = useRef<PetState | null>(null);
  const lastLayer = useRef<Layer | null>(null);
  const [outgoing, setOutgoing] = useState<Layer | null>(null);
  const [shift, setShift] = useState("");
  const [from, setFrom] = useState<PetState | null>(null);

  useEffect(() => {
    const from = prevState.current;
    prevState.current = state;
    if (from === null || from === state || reduceMotion) return;

    const previous = lastLayer.current;
    const kind = transitionClass(from, state);
    setShift(kind);
    setFrom(from);
    if (previous) setOutgoing(previous);

    const fade = from === "walking" ? WALK_OUT_MS : FADE_MS;
    const clearFade = setTimeout(() => setOutgoing(null), fade);
    const clearShift = setTimeout(() => setShift(""), 420);
    return () => {
      clearTimeout(clearFade);
      clearTimeout(clearShift);
    };
  }, [state, reduceMotion]);

  lastLayer.current = { src, drawn, facing };

  // Slight per-entry variation so the idle loop is not perfectly mechanical.
  const idleVariance = useMemo(
    () => ({ delay: -Math.random() * 3, duration: 3.2 + Math.random() * 1.2 }),
    [state],
  );

  const imgStyle = (layer: Layer): React.CSSProperties => ({
    position: "absolute",
    left: "50%",
    bottom: 0,
    display: "block",
    width: layer.drawn,
    height: layer.drawn,
    // Frames are square; contain + bottom anchoring keeps proportions
    // uniform and the feet on the same ground line across every frame.
    objectFit: "contain",
    objectPosition: "center bottom",
    transform: `translateX(-50%)${layer.facing === -1 ? " scaleX(-1)" : ""}`,
    transformOrigin: "50% 100%",
    filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.28))",
    userSelect: "none",
  });

  return (
    <div
      className={`motion-${motion} ${className}`}
      style={{
        width: size,
        height: size,
        aspectRatio: "1 / 1",
        willChange: "transform",
        position: "relative",
        ...(motion === "breathe"
          ? {
              animationDelay: `${idleVariance.delay}s`,
              animationDuration: `${idleVariance.duration}s`,
            }
          : null),
      }}
    >
      <div className={shift} style={{ position: "relative", width: "100%", height: "100%" }}>
      {outgoing ? (
        <img
          key={`out-${outgoing.src}`}
          src={outgoing.src}
          alt=""
          aria-hidden="true"
          draggable={false}
          width={outgoing.drawn}
          height={outgoing.drawn}
          className={from === "walking" ? "layer-fade-out-slow" : "layer-fade-out"}
          style={imgStyle(outgoing)}
        />
      ) : null}
      <img
        key={src}
        className={shift ? "layer-fade-in" : undefined}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={drawn}
        height={drawn}
        style={imgStyle({ src, drawn, facing })}
      />
      </div>
    </div>
  );
}
