/**
 * File-operation capability declarations — INTERFACES ONLY.
 *
 * No filesystem access exists in this pass: every handler returns
 * `not_implemented`. When a real implementation lands it must stay behind
 * `runCapability` (character allow-list + settings flag + confirmation), and it
 * must operate on explicit, user-scoped paths — never arbitrary traversal.
 */

import type { Capability } from "@/capabilities/types";
import { notImplemented } from "@/capabilities/types";

/** Shapes the future desktop bridge will accept. Declared, not used yet. */
export type FileSearchInput = { query: string; scope?: "documents" | "desktop" | "downloads" };
export type FileTransferInput = { source: string; destination: string };
export type FileDeleteInput = { target: string };

export type FileRef = { path: string; name: string; sizeBytes?: number; modifiedAt?: number };

export const fileSearchCapability: Capability = {
  id: "file_search",
  description: "Find a file by name inside a user-approved folder scope. Returns matches only.",
  permissions: {
    risk: "read_only",
    reversible: true,
    requiresConfirmation: false,
    settingsFlag: "fileOperations",
  },
  status: "not_implemented",
  run: async () => notImplemented("file_search"),
};

export const fileCopyCapability: Capability = {
  id: "file_copy",
  description: "Copy a file to another user-approved location.",
  permissions: {
    risk: "reversible",
    reversible: true,
    requiresConfirmation: true,
    settingsFlag: "fileOperations",
  },
  status: "not_implemented",
  run: async () => notImplemented("file_copy"),
};

export const fileMoveCapability: Capability = {
  id: "file_move",
  description: "Move a file to another user-approved location (e.g. the Desktop).",
  permissions: {
    risk: "reversible",
    reversible: true,
    requiresConfirmation: true,
    settingsFlag: "fileOperations",
  },
  status: "not_implemented",
  run: async () => notImplemented("file_move"),
};

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

/**
 * Declared so the permission model covers it. Intentionally NOT registered as
 * runnable in any form: shell execution is out of scope and stays that way
 * until a dedicated, reviewed pass.
 */
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
