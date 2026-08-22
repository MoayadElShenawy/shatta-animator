import { useCallback, useEffect, useLayoutEffect, useState, type RefObject } from "react";

/**
 * Viewport-aware popover placement.
 *
 * Given an anchor element (Shatta herself) and the panel element, this returns
 * fixed viewport coordinates for the panel: below the anchor when there is
 * room, flipped above when there isn't, and always clamped inside the viewport
 * with a small margin. Recomputed on resize, scroll and whenever the anchor
 * moves (`watch`).
 */

const MARGIN = 10;
const GAP = 10;

export type Placement = { left: number; top: number; side: "top" | "bottom" };

export function useSmartPlacement(
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
  open: boolean,
  /** Changes here (e.g. Shatta's position or the active panel) trigger a recompute. */
  watch: unknown,
): Placement | null {
  const [placement, setPlacement] = useState<Placement | null>(null);

  const compute = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;

    const a = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    if (!width || !height) return;

    const roomBelow = window.innerHeight - a.bottom - GAP - MARGIN;
    const roomAbove = a.top - GAP - MARGIN;

    let side: "top" | "bottom";
    if (height <= roomBelow) side = "bottom";
    else if (height <= roomAbove) side = "top";
    else side = roomAbove > roomBelow ? "top" : "bottom";

    let top = side === "bottom" ? a.bottom + GAP : a.top - GAP - height;
    const maxTop = Math.max(MARGIN, window.innerHeight - height - MARGIN);
    top = Math.min(Math.max(MARGIN, top), maxTop);

    let left = a.left + a.width / 2 - width / 2;
    const maxLeft = Math.max(MARGIN, window.innerWidth - width - MARGIN);
    left = Math.min(Math.max(MARGIN, left), maxLeft);

    setPlacement((prev) =>
      prev && prev.left === left && prev.top === top && prev.side === side
        ? prev
        : { left, top, side },
    );
  }, [anchorRef, panelRef]);

  useLayoutEffect(() => {
    if (!open) {
      setPlacement(null);
      return;
    }
    compute();
  }, [open, watch, compute]);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(() => compute()) : null;
    if (panel && ro) ro.observe(panel);
    window.addEventListener("resize", compute);
    window.addEventListener("scroll", compute, true);
    return () => {
      ro?.disconnect();
      window.removeEventListener("resize", compute);
      window.removeEventListener("scroll", compute, true);
    };
  }, [open, compute, panelRef]);

  return placement;
}
