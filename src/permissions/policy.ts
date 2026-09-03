/**
 * Permission policy — the single place that decides whether a capability MAY
 * be used. It is character-agnostic: everything character-specific arrives via
 * the `CapabilityGate` (allow-list + settings flags).
 *
 * Deciding is not executing. Even an "allowed" decision still has to pass
 * through `runCapability`, which re-checks the same rules.
 */

import { getCapability, type CapabilityGate } from "@/capabilities/registry";
import type { CapabilityId } from "@/capabilities/types";
import { isApproved } from "@/permissions/confirmations";
import type { PermissionDecision, PermissionRequest } from "@/permissions/types";

/** Explicit rule table, mirroring the capability declarations. */
export const PERMISSION_RULES: Record<
  CapabilityId,
  { readOnly: boolean; destructive: boolean; requiresConfirmation: boolean }
> = {
  web_search: { readOnly: true, destructive: false, requiresConfirmation: false },
  file_search: { readOnly: true, destructive: false, requiresConfirmation: false },
  file_copy: { readOnly: false, destructive: false, requiresConfirmation: false },
  file_move: { readOnly: false, destructive: false, requiresConfirmation: false },
  file_delete: { readOnly: false, destructive: true, requiresConfirmation: true },
  system_command: { readOnly: false, destructive: true, requiresConfirmation: true },
};

function isFlagOn(flag: string, gate: CapabilityGate): boolean {
  if (flag === "none") return true;
  return gate.flags[flag as keyof CapabilityGate["flags"]] === true;
}

export function checkPermission(request: PermissionRequest): PermissionDecision {
  const { capability: id, gate } = request;
  const rule = PERMISSION_RULES[id];
  const capability = getCapability(id);

  const base = {
    capability: id,
    risk: capability?.permissions.risk ?? null,
    readOnly: rule?.readOnly ?? false,
    destructive: rule?.destructive ?? true,
    requiresConfirmation: rule?.requiresConfirmation ?? true,
    implemented: capability?.status === "available",
  };

  if (!capability || !rule) {
    return {
      ...base,
      outcome: "unavailable",
      reason: "unknown_capability",
      message: `Unknown capability "${id}".`,
    };
  }
  if (!gate.allowed.includes(id)) {
    return {
      ...base,
      outcome: "unavailable",
      reason: "not_allowed_for_character",
      message: `"${id}" is not allowed for this character.`,
    };
  }
  if (!isFlagOn(capability.permissions.settingsFlag, gate)) {
    return {
      ...base,
      outcome: "unavailable",
      reason: "disabled_in_settings",
      message: `"${id}" is disabled in settings.`,
    };
  }

  const needsConfirmation =
    rule.requiresConfirmation || capability.permissions.requiresConfirmation;
  if (needsConfirmation && !isApproved(request.confirmationId, id)) {
    return {
      ...base,
      outcome: "needs_confirmation",
      reason: "requires_confirmation",
      message: `"${id}" needs explicit confirmation from the user first.`,
    };
  }

  if (capability.status !== "available") {
    return {
      ...base,
      outcome: "unavailable",
      reason: "not_implemented",
      message: `"${id}" is declared but not implemented yet.`,
    };
  }

  return { ...base, outcome: "allowed", reason: "ok", message: `"${id}" may run.` };
}
