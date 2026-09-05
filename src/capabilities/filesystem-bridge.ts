/**
 * Filesystem bridge — the boundary between capabilities and the desktop shell.
 *
 * In the web build there IS no safe filesystem, so the bridge is null. In
 * the Electron/desktop build the preload script exposes a narrow API on
 * `window.shattaFs`; nothing else in the capability layer touches the FS.
 *
 * The bridge NEVER accepts raw OS paths from the caller: it takes a
 * validated `{ scope, path }` and the desktop shell resolves the scope
 * to a real, user-approved folder. Optional members ("remove", "runCommand",
 * folder granting) may be missing — a missing member means the capability is
 * genuinely not supported by this runtime, and it reports that instead of
 * pretending.
 */

import type { GrantedFolder } from "@/capabilities/access";
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
  | "not_supported"
  | "rejected"
  | "denied"
  | "not_found"
  | "exists"
  | "invalid"
  | "failed";

export type FsResult<T> = { ok: true; data: T } | { ok: false; reason: FsErrorReason; error: string };

export type SystemCommandRequest = {
  action: string;
  location?: FileLocation;
};

export type FilesystemBridge = {
  /** Which scopes the shell agreed to expose in this session. */
  scopes: () => Promise<readonly FileScope[]>;
  search: (input: { query: string; scope?: FileScope; limit?: number }) => Promise<FsResult<readonly FsSearchResult[]>>;
  copy: (input: { source: FileLocation; destination: FileLocation }) => Promise<FsResult<{ destination: FileLocation }>>;
  move: (input: { source: FileLocation; destination: FileLocation }) => Promise<FsResult<{ destination: FileLocation }>>;
  /** Real deletion. Only ever reached through an approved confirmation. */
  remove?: (input: { target: FileLocation }) => Promise<FsResult<{ target: FileLocation; trashed: boolean }>>;
  /** Folders the user picked in the OS dialog during this session. */
  grants?: () => Promise<FsResult<readonly GrantedFolder[]>>;
  /** Opens the OS folder picker. User action only — never AI-initiated. */
  requestFolderAccess?: () => Promise<FsResult<GrantedFolder | null>>;
  /** Explicit whole-device grant. May legitimately be unsupported. */
  requestDeviceAccess?: () => Promise<FsResult<{ granted: boolean }>>;
  /** Runs one allowlisted system action. Never a raw shell string. */
  runCommand?: (input: SystemCommandRequest) => Promise<FsResult<{ action: string; output?: string }>>;
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
