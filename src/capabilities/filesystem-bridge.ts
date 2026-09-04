/**
 * Filesystem bridge — the boundary between capabilities and the desktop shell.
 *
 * In the web build there IS no safe filesystem, so the bridge is null. In
 * the Electron/desktop build the preload script exposes a narrow API on
 * `window.shattaFs`; nothing else in the capability layer touches the FS.
 *
 * The bridge NEVER accepts raw OS paths from the caller: it takes a
 * validated `{ scope, path }` and the desktop shell resolves the scope
 * to a real, user-owned folder that it has already approved.
 */

import type { FileLocation, FileScope } from "@/capabilities/paths";

export type FsSearchResult = {
  name: string;
  scope: FileScope;
  path: string;
  type: "file" | "folder";
  sizeBytes?: number;
  modifiedAt?: number;
};

export type FsErrorReason =
  | "unavailable"
  | "denied"
  | "not_found"
  | "exists"
  | "invalid"
  | "failed";

export type FsResult<T> = { ok: true; data: T } | { ok: false; reason: FsErrorReason; error: string };

export type FilesystemBridge = {
  /** Which scopes the shell agreed to expose in this session. */
  scopes: () => Promise<readonly FileScope[]>;
  search: (input: { query: string; scope?: FileScope; limit?: number }) => Promise<FsResult<readonly FsSearchResult[]>>;
  copy: (input: { source: FileLocation; destination: FileLocation }) => Promise<FsResult<{ destination: FileLocation }>>;
  move: (input: { source: FileLocation; destination: FileLocation }) => Promise<FsResult<{ destination: FileLocation }>>;
};

let bridge: FilesystemBridge | null = null;

/** Test/desktop entry: install a bridge implementation. */
export function setFilesystemBridge(next: FilesystemBridge | null) {
  bridge = next;
}

export function getFilesystemBridge(): FilesystemBridge | null {
  if (bridge) return bridge;
  if (typeof globalThis !== "undefined") {
    const w = globalThis as unknown as { shattaFs?: FilesystemBridge };
    if (w.shattaFs && typeof w.shattaFs.search === "function") return w.shattaFs;
  }
  return null;
}

export function hasFilesystemBridge(): boolean {
  return getFilesystemBridge() !== null;
}
