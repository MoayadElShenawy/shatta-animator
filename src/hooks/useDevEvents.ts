import { useEffect, useState } from "react";
import { setMood } from "@/hooks/usePetMood";
import {
  EMPTY_CONTEXT,
  hasDevBridge,
  lineForEvent,
  moodForEvent,
  type DevContext,
  type DevEvent,
} from "@/lib/dev-context";

/**
 * Opt-in developer context. Does absolutely nothing until `enabled` is true,
 * and only works where the desktop bridge exists (the Electron shell).
 */
export function useDevEvents(enabled: boolean, onLine?: (text: string) => void) {
  const [context, setContext] = useState<DevContext>(EMPTY_CONTEXT);
  const [available] = useState(() => hasDevBridge());

  useEffect(() => {
    if (!available) return;
    window.shatta?.setDevContext?.(enabled);
    if (!enabled) {
      setContext(EMPTY_CONTEXT);
      return;
    }

    const off = window.shatta?.onDevEvent?.(({ context: ctx, event }) => {
      setContext(ctx);
      if (!event) return;
      applyEvent(event, onLine);
    });
    return () => {
      off?.();
      window.shatta?.setDevContext?.(false);
    };
    // onLine is a stable-enough callback from the caller; re-subscribing on it would thrash
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [available, enabled]);

  return { context, available };
}

function applyEvent(event: DevEvent, onLine?: (text: string) => void) {
  setMood(moodForEvent(event), true);
  onLine?.(lineForEvent(event));
}
