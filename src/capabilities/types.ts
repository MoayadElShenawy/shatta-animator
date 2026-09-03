/**
 * Capability (tool) abstraction.
 *
 * A capability is something the pet *could* do beyond talking: search the web,
 * find a file, move a file. This module defines the boundary only — nothing
 * here touches the filesystem, the shell or the network.
 *
 * Safety model (enforced by the registry, not by the AI):
 *  - every capability declares a `risk` level and whether it needs confirmation
 *  - a capability must be enabled by settings AND allowed by the character
 *  - destructive / non-read-only capabilities can NEVER run without an explicit
 *    confirmation token supplied by the UI layer
 */

export type CapabilityId =
  | "web_search"
  | "file_search"
  | "file_copy"
  | "file_move"
  | "file_delete"
  | "system_command";

export type CapabilityRisk = "read_only" | "reversible" | "destructive";

export type CapabilityPermissions = {
  risk: CapabilityRisk;
  /** True when the effect can be undone by the user or by an inverse call. */
  reversible: boolean;
  /** True when the UI must obtain explicit user consent before each run. */
  requiresConfirmation: boolean;
  /** Settings flag that must be on for this capability to be usable. */
  settingsFlag: "webSearch" | "fileOperations" | "systemAccess" | "none";
};

export type CapabilityStatus = "available" | "not_implemented" | "disabled";

export type CapabilityInput = Record<string, unknown>;

export type CapabilityResult =
  | { ok: true; data: unknown }
  | { ok: false; error: string; reason: "denied" | "unconfirmed" | "not_implemented" | "failed" };

export type CapabilityRunOptions = {
  /** Present only when the user explicitly approved this exact invocation. */
  confirmation?: { approved: boolean; at: number };
  signal?: AbortSignal;
};

export type Capability = {
  id: CapabilityId;
  /** Short description the AI layer may be shown when tool calling lands. */
  description: string;
  permissions: CapabilityPermissions;
  status: CapabilityStatus;
  /**
   * Executed only through `runCapability`. Foundation capabilities return
   * `not_implemented` — they exist so the surrounding architecture is testable.
   */
  run: (input: CapabilityInput, options: CapabilityRunOptions) => Promise<CapabilityResult>;
};

/** What the brain tells the AI about a capability. No handlers cross this line. */
export type CapabilityDescriptor = {
  id: CapabilityId;
  description: string;
  risk: CapabilityRisk;
  requiresConfirmation: boolean;
  status: CapabilityStatus;
};

export const notImplemented = (id: string): CapabilityResult => ({
  ok: false,
  reason: "not_implemented",
  error: `Capability "${id}" is declared but not implemented yet.`,
});
