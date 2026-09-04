/**
 * File-operation capabilities.
 *
 * These handlers are executed ONLY through `runCapability`, which enforces
 * character allow-list, settings flag and (for copy/move) explicit
 * confirmation. Each handler:
 *
 *  1. Validates its input (scoped path, no traversal, no absolute paths).
 *  2. Looks for a filesystem bridge — a narrow API the desktop shell
 *     provides. In the web build there is no bridge, so every real FS call
 *     resolves to an "unavailable" error instead of inventing access.
 *  3. Returns a structured result the brain can hand back to the model.
 *
 * `file_delete` and `system_command` remain declared but not implemented.
 */

import type { Capability, CapabilityResult } from "@/capabilities/types";
import { notImplemented } from "@/capabilities/types";
import {
  DEFAULT_SCOPE,
  isFileScope,
  parseLocation,
  parseQuery,
  type FileScope,
} from "@/capabilities/paths";
import {
  getFilesystemBridge,
  type FsErrorReason,
  type FsSearchResult,
} from "@/capabilities/filesystem-bridge";

export type FileSearchInput = { query: string; scope?: FileScope; limit?: number };
export type FileTransferInput = { source: unknown; destination: unknown };

const MAX_SEARCH_LIMIT = 25;

function unavailable(id: string): CapabilityResult {
  return {
    ok: false,
    reason: "not_implemented",
    error: `"${id}" needs the desktop app: no safe filesystem is available in this environment.`,
  };
}

function failed(reason: FsErrorReason, message: string): CapabilityResult {
  return { ok: false, reason: reason === "unavailable" ? "not_implemented" : "failed", error: message };
}

function invalid(message: string): CapabilityResult {
  return { ok: false, reason: "failed", error: message };
}

export const fileSearchCapability: Capability = {
  id: "file_search",
  description:
    "Find files by name inside the user's approved folders (Desktop, Documents, Downloads). Returns metadata only, never file contents.",
  permissions: {
    risk: "read_only",
    reversible: true,
    requiresConfirmation: false,
    settingsFlag: "fileOperations",
  },
  status: "available",
  run: async (raw): Promise<CapabilityResult> => {
    const input = (raw ?? {}) as Partial<FileSearchInput>;
    const parsed = parseQuery(input.query);
    if (!parsed.ok) return invalid(parsed.message);

    let scope: FileScope | undefined;
    if (input.scope !== undefined) {
      if (!isFileScope(input.scope)) return invalid(`Unknown scope "${String(input.scope)}".`);
      scope = input.scope;
    }
    const limit = Math.min(
      Math.max(1, Math.floor(Number(input.limit ?? 10)) || 10),
      MAX_SEARCH_LIMIT,
    );

    const bridge = getFilesystemBridge();
    if (!bridge) return unavailable("file_search");

    const searchArgs: { query: string; limit: number; scope?: FileScope } = {
      query: parsed.query,
      limit,
    };
    if (scope !== undefined) searchArgs.scope = scope;

    const res = await bridge.search(searchArgs);
    if (!res.ok) return failed(res.reason, res.error);
    const matches: readonly FsSearchResult[] = res.data ?? [];
    return { ok: true, data: { query: parsed.query, scope: scope ?? "all", matches } };
  },
};

function parseTransfer(raw: unknown): { source: ReturnType<typeof parseLocation>; destination: ReturnType<typeof parseLocation> } | { error: string } {
  const input = (raw ?? {}) as Partial<FileTransferInput>;
  const source = parseLocation(input.source, DEFAULT_SCOPE);
  if (!source.ok) return { error: `source: ${source.message}` };
  const destination = parseLocation(input.destination, source.location.scope);
  if (!destination.ok) return { error: `destination: ${destination.message}` };
  return { source, destination };
}

async function runTransfer(id: "file_copy" | "file_move", raw: unknown): Promise<CapabilityResult> {
  const parsed = parseTransfer(raw);
  if ("error" in parsed) return invalid(parsed.error);
  if (!parsed.source.ok || !parsed.destination.ok) return invalid("Invalid transfer.");
  const bridge = getFilesystemBridge();
  if (!bridge) return unavailable(id);
  const args = { source: parsed.source.location, destination: parsed.destination.location };
  const res = id === "file_copy" ? await bridge.copy(args) : await bridge.move(args);
  if (!res.ok) return failed(res.reason, res.error);
  return { ok: true, data: { operation: id, ...args, ...res.data } };
}

export const fileCopyCapability: Capability = {
  id: "file_copy",
  description: "Copy a file inside the user's approved folders. Never silently overwrites.",
  permissions: {
    risk: "reversible",
    reversible: true,
    requiresConfirmation: true,
    settingsFlag: "fileOperations",
  },
  status: "available",
  run: async (raw) => runTransfer("file_copy", raw),
};

export const fileMoveCapability: Capability = {
  id: "file_move",
  description: "Move a file to another approved folder. Never silently overwrites.",
  permissions: {
    risk: "reversible",
    reversible: true,
    requiresConfirmation: true,
    settingsFlag: "fileOperations",
  },
  status: "available",
  run: async (raw) => runTransfer("file_move", raw),
};

/** Destructive: intentionally left unavailable in this pass. */
export const fileDeleteCapability: Capability = {
  id: "file_delete",
  description: "Delete a file. Destructive — always requires explicit confirmation.",
  permissions: {
    risk: "destructive",
    reversible: false,
    requiresConfirmation: true,
    settingsFlag: "fileOperations",
  },
  status: "not_implemented",
  run: async () => notImplemented("file_delete"),
};

/** Shell execution is out of scope and stays that way. */
export const systemCommandCapability: Capability = {
  id: "system_command",
  description: "Run a system command. Not available.",
  permissions: {
    risk: "destructive",
    reversible: false,
    requiresConfirmation: true,
    settingsFlag: "systemAccess",
  },
  status: "not_implemented",
  run: async () => notImplemented("system_command"),
};

export const fileCapabilities: readonly Capability[] = [
  fileSearchCapability,
  fileCopyCapability,
  fileMoveCapability,
  fileDeleteCapability,
  systemCommandCapability,
];
