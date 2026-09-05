/**
 * File access scope — the user-controlled permission model for the filesystem.
 *
 * Nothing here touches a filesystem. This module holds the *policy*: which
 * scopes the user has explicitly granted for this session.
 *
 * Modes:
 *  - "default"  → only the three built-in user folders (Desktop/Documents/Downloads)
 *  - "selected" → the default folders plus folders the user explicitly picked
 *  - "device"   → the whole device, only after an explicit grant
 *
 * The state is in-memory only: it is never persisted, never contains file
 * contents, and resets when the session ends. The desktop shell keeps its own
 * copy of the granted roots and re-validates every request, so a renderer that
 * lies about its scopes still cannot reach anything unapproved.
 */

export const DEFAULT_SCOPES = ["desktop", "documents", "downloads"] as const;
export type DefaultScope = (typeof DEFAULT_SCOPES)[number];

/** Special scope naming the whole device. Only usable in "device" mode. */
export const DEVICE_SCOPE = "device";

/** A scope is an opaque token: a default folder, "device", or a granted id. */
export type FileScope = string;

export type AccessMode = "default" | "selected" | "device";

export type GrantedFolder = { id: string; label: string };

export type AccessState = {
  mode: AccessMode;
  folders: readonly GrantedFolder[];
};

const SCOPE_TOKEN = /^[a-z0-9][a-z0-9_-]{0,63}$/;

let state: AccessState = { mode: "default", folders: [] };

export function isScopeToken(value: unknown): value is FileScope {
  return typeof value === "string" && SCOPE_TOKEN.test(value);
}

export function isDefaultScope(value: unknown): value is DefaultScope {
  return typeof value === "string" && (DEFAULT_SCOPES as readonly string[]).includes(value);
}

export function getAccessState(): AccessState {
  return { mode: state.mode, folders: [...state.folders] };
}

/** Explicit user action: change the access mode. Never called by the AI. */
export function setAccessMode(mode: AccessMode) {
  state = { ...state, mode };
  if (mode === "default") state = { mode, folders: [] };
}

/** Explicit user action: record a folder the user picked in the OS dialog. */
export function grantFolder(folder: GrantedFolder) {
  if (!isScopeToken(folder.id) || isDefaultScope(folder.id) || folder.id === DEVICE_SCOPE) return;
  if (state.folders.some((f) => f.id === folder.id)) return;
  state = { ...state, folders: [...state.folders, folder] };
}

export function revokeFolder(id: string) {
  state = { ...state, folders: state.folders.filter((f) => f.id !== id) };
}

export function resetAccess() {
  state = { mode: "default", folders: [] };
}

/** Every scope the user has actually authorized right now. */
export function authorizedScopes(): readonly FileScope[] {
  const scopes: FileScope[] = [...DEFAULT_SCOPES];
  if (state.mode === "selected" || state.mode === "device") {
    for (const folder of state.folders) scopes.push(folder.id);
  }
  if (state.mode === "device") scopes.push(DEVICE_SCOPE);
  return scopes;
}

export function isScopeAuthorized(scope: unknown): boolean {
  if (!isScopeToken(scope)) return false;
  return authorizedScopes().includes(scope);
}

/** Test/desktop entry: replace the whole state at once. */
export function setAccessState(next: AccessState) {
  state = {
    mode: next.mode,
    folders: next.folders.filter((f) => isScopeToken(f.id) && !isDefaultScope(f.id) && f.id !== DEVICE_SCOPE),
  };
}
