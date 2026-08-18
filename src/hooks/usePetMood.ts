import { useCallback, useSyncExternalStore } from "react";
import { canTransition, type PetState } from "@/characters/types";
import { shatta } from "@/characters/shatta/personality";

/**
 * Tiny global state store so the chat, the controls and the character stay in
 * sync without prop drilling. The full state machine (idle life, walking,
 * sleeping) is layered on top of this in src/pet/usePetState.ts.
 */

type Listener = () => void;

let current: PetState = "idle";
const listeners = new Set<Listener>();
let autoTimer: ReturnType<typeof setTimeout> | null = null;

function emit() {
  for (const l of listeners) l();
}

export function getMood(): PetState {
  return current;
}

/** Set the state, respecting priority. `force` bypasses the priority check. */
export function setMood(next: PetState, force = false) {
  if (!force && !canTransition(shatta.states, current, next)) return;
  if (current === next) return;
  current = next;
  if (autoTimer) {
    clearTimeout(autoTimer);
    autoTimer = null;
  }
  emit();
}

/** Release a sticky state (thinking/speaking) back to idle. */
export function releaseMood(from: PetState) {
  if (current === from) setMood("idle", true);
}

export function scheduleIdle(ms: number) {
  if (autoTimer) clearTimeout(autoTimer);
  if (ms <= 0) return;
  autoTimer = setTimeout(() => setMood("idle", true), ms);
}

function subscribe(l: Listener) {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function usePetMood() {
  const value = useSyncExternalStore(subscribe, getMood, getMood);
  const set = useCallback((next: PetState, force?: boolean) => setMood(next, force), []);
  return { mood: value, setMood: set, releaseMood, scheduleIdle };
}

/** Test helper — resets module state between tests. */
export function __resetMood() {
  current = "idle";
  if (autoTimer) clearTimeout(autoTimer);
  autoTimer = null;
  listeners.clear();
}
