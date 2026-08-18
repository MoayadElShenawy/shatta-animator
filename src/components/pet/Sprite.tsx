import { useEffect, useState } from "react";
import { SHATTA_SPRITES } from "@/characters/shatta/sprites";
import { shatta } from "@/characters/shatta/personality";
import type { PetState } from "@/characters/types";

/**
 * Frame renderer. Character-agnostic: it draws whichever frames the sprite
 * sheet supplies for the current state, cycling multi-frame states, and applies
 * the state's secondary motion as a CSS class.
 */
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

  useEffect(() => {
    setFrame(0);
    if (entry.frames.length < 2 || entry.frameMs <= 0 || reduceMotion) return;
    const id = setInterval(() => setFrame((f) => (f + 1) % entry.frames.length), entry.frameMs);
    return () => clearInterval(id);
  }, [state, entry, reduceMotion]);

  const motion = reduceMotion ? "none" : shatta.states[state].motion;
  const src = entry.frames[frame % entry.frames.length]!;

  return (
    <div
      className={`motion-${motion} ${className}`}
      style={{ width: size, height: size, willChange: "transform" }}
    >
      <img
        key={src}
        src={src}
        alt=""
        aria-hidden="true"
        draggable={false}
        width={size}
        height={size}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          transform: facing === -1 ? "scaleX(-1)" : undefined,
          filter: "drop-shadow(0 10px 14px rgba(0,0,0,0.28))",
          userSelect: "none",
        }}
      />
    </div>
  );
}
