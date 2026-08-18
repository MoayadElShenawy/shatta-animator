/**
 * Shatta Developer Context (opt-in).
 *
 * A *safe*, opt-in layer that lets Shatta react to what's happening in the
 * developer's project. It carries only tiny, non-sensitive facts:
 *
 *   - project folder name
 *   - current git branch
 *   - number of changed files (a count, never the diff)
 *   - build / test result (pass | fail) and an optional short label
 *
 * It NEVER reads, uploads or sends source code, file contents, paths outside
 * the project name, environment variables or credentials. Nothing leaves the
 * machine unless the user explicitly types a message in the chat.
 */

import type { PetState } from "@/characters/types";

export type DevEventKind = "build" | "test" | "git" | "run";
export type DevEventStatus = "started" | "success" | "failure";

export type DevEvent = {
  kind: DevEventKind;
  status: DevEventStatus;
  /** Short human label, e.g. "vite build" — never a file path or code. */
  label?: string;
};

export type DevContext = {
  /** Folder name only — no absolute path. */
  project: string | null;
  branch: string | null;
  changedFiles: number | null;
  lastEvent: (DevEvent & { at: number }) | null;
};

export const EMPTY_CONTEXT: DevContext = {
  project: null,
  branch: null,
  changedFiles: null,
  lastEvent: null,
};

/** How Shatta feels about a developer event. */
export function moodForEvent(event: DevEvent): PetState {
  if (event.status === "started") return "thinking";
  if (event.status === "failure") return "annoyed";
  return event.kind === "build" || event.kind === "test" ? "celebrating" : "happy";
}

/** What Shatta says about a developer event. */
export function lineForEvent(event: DevEvent): string {
  const what = event.label ?? event.kind;
  if (event.status === "started") return `Running ${what}...`;
  if (event.status === "failure") {
    return event.kind === "test" ? "Tests are red — want me to look?" : `${what} failed. Let's debug it!`;
  }
  return event.kind === "test" ? "All tests green!" : `${what} succeeded — nice!`;
}

/** True when the desktop bridge is present (Electron shell). */
export function hasDevBridge(): boolean {
  return typeof window !== "undefined" && !!window.shatta?.onDevEvent;
}

declare global {
  interface Window {
    shatta?: {
      setInteractive?: (value: boolean) => void;
      quit?: () => void;
      /** Opt-in: start/stop watching the project folder. */
      setDevContext?: (enabled: boolean) => void;
      /** Subscribe to context updates. Returns an unsubscribe function. */
      onDevEvent?: (cb: (payload: { context: DevContext; event: DevEvent | null }) => void) => () => void;
    };
  }
}
