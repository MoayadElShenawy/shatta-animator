/**
 * Permission layer contract — character-agnostic.
 *
 * This layer answers questions ABOUT a capability request. It never executes
 * anything: execution stays behind `runCapability` in the capability registry.
 */

import type { CapabilityId, CapabilityRisk } from "@/capabilities/types";
import type { CapabilityGate } from "@/capabilities/registry";

export type PermissionOutcome = "allowed" | "needs_confirmation" | "unavailable";

export type PermissionDecision = {
  capability: CapabilityId;
  outcome: PermissionOutcome;
  /** Machine-readable reason, useful for UI copy and tests. */
  reason:
    | "ok"
    | "unknown_capability"
    | "not_allowed_for_character"
    | "disabled_in_settings"
    | "not_implemented"
    | "requires_confirmation";
  risk: CapabilityRisk | null;
  readOnly: boolean;
  destructive: boolean;
  requiresConfirmation: boolean;
  /** True when the capability is declared but has no implementation yet. */
  implemented: boolean;
  message: string;
};

export type PermissionRequest = {
  capability: CapabilityId;
  gate: CapabilityGate;
  /** A confirmation token id previously approved by the user, if any. */
  confirmationId?: string;
};
