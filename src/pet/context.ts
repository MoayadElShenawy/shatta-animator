import { useSyncExternalStore } from "react";

import { getMood, usePetMood } from "@/hooks/usePetMood";
import type { PetState } from "@/characters/types";

/**
 * Interaction context — one in-memory source of truth describing "what is
 * happening right now" around Shatta.
 *
 * It only OBSERVES the existing systems (mood store, behaviour layer, chat,
 * menu) and exposes a small serializable snapshot future AI code can read.
 * Nothing here drives animation, position, timing or voice, and nothing is
 * persisted: the whole thing dies with the tab.
 */

export type ContextState = "idle" | "walking" | "curious" | "happy" | "surprised" | "bored";

export type InteractionSource = "none" | "click" | "double_click" | "chat" | "spontaneous";

export type ShattaContext = {
  state: ContextState;
  interacting: boolean;
  chatActive: boolean;
  menuOpen: boolean;
  lastInteractionAt: number | null;
  lastSpontaneousAt: number | null;
  lastResponseAt: number | null;
  interactionSource: InteractionSource;
  lastUserMessage: string | null;
  lastResponse: string | null;
  /** ms since the last user interaction (0 when there has never been one). */
  idleMs: number;
};

/** Idle time after which the context reports "bored". Mirrors behaviour layer. */
const BORED_AFTER_MS = 90_000;
/** How long an interaction counts as "active" after the last event. */
const INTERACTING_MS = 6_000;

type Snapshot = Omit<ShattaContext, "state" | "interacting" | "idleMs">;

let snapshot: Snapshot = {
  chatActive: false,
  menuOpen: false,
  lastInteractionAt: null,
  lastSpontaneousAt: null,
  lastResponseAt: null,
  interactionSource: "none",
  lastUserMessage: null,
  lastResponse: null,
};

const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function patch(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

/* ------------------------------- events -------------------------------- */

export const shattaContext = {
  click() {
    patch({ interactionSource: "click", lastInteractionAt: Date.now() });
  },
  doubleClick() {
    patch({ interactionSource: "double_click", lastInteractionAt: Date.now() });
  },
  chatStarted(userMessage?: string) {
    patch({
      interactionSource: "chat",
      chatActive: true,
      lastInteractionAt: Date.now(),
      ...(userMessage ? { lastUserMessage: userMessage } : {}),
    });
  },
  chatResponded(userMessage: string | null, response: string) {
    patch({
      chatActive: false,
      lastResponse: response,
      lastResponseAt: Date.now(),
      ...(userMessage ? { lastUserMessage: userMessage } : {}),
    });
  },
  chatEnded() {
    patch({ chatActive: false });
  },
  spontaneous() {
    patch({ interactionSource: "spontaneous", lastSpontaneousAt: Date.now() });
  },
  menu(open: boolean) {
    patch({ menuOpen: open });
  },
  /** Test helper. */
  __reset() {
    snapshot = {
      chatActive: false,
      menuOpen: false,
      lastInteractionAt: null,
      lastSpontaneousAt: null,
      lastResponseAt: null,
      interactionSource: "none",
      lastUserMessage: null,
      lastResponse: null,
    };
    emit();
  },
};

/* ------------------------------- derive -------------------------------- */

export function contextStateFor(mood: PetState, idleMs: number): ContextState {
  if (mood === "walking") return "walking";
  if (mood === "curious" || mood === "mischievous") return "curious";
  if (mood === "happy" || mood === "celebrating") return "happy";
  if (mood === "surprised") return "surprised";
  if (idleMs > BORED_AFTER_MS || mood === "sleepy" || mood === "sleeping") return "bored";
  return "idle";
}

/** Read the full context imperatively (for non-React / future AI callers). */
export function getShattaContext(now = Date.now()): ShattaContext {
  const idleMs = snapshot.lastInteractionAt ? now - snapshot.lastInteractionAt : 0;
  return {
    ...snapshot,
    state: contextStateFor(getMood(), idleMs),
    interacting:
      snapshot.chatActive ||
      snapshot.menuOpen ||
      (snapshot.lastInteractionAt !== null && now - snapshot.lastInteractionAt < INTERACTING_MS),
    idleMs,
  };
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const getSnapshot = () => snapshot;

/**
 * React access to the interaction context. `idleMs` is computed on read, so
 * components that need a ticking value should poll it themselves; this hook
 * re-renders only on real events (and mood changes).
 */
export function useShattaContext(): ShattaContext {
  useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
  usePetMood();
  return getShattaContext();
}
