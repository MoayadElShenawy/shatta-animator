/**
 * Permission policy — the single place that decides whether a capability MAY
 * be used. It is character-agnostic: everything character-specific arrives via
 * the `CapabilityGate` (allow-list + settings flags).
 *
 * Deciding is not executing. Even an "allowed" decision still has to pass
 * through `runCapability`, which re-checks the same rules.
 */

import { getCapability, requiresConfirmationFor, type CapabilityGate } from "@/capabilities/registry";
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
  // Policy-controlled: risk and confirmation depend on the requested action.
  system_command: { readOnly: false, destructive: false, requiresConfirmation: false },
};

function isFlagOn(flag: string, gate: CapabilityGate): boolean {
  if (flag === "none") return true;
  return gate.flags[flag as keyof CapabilityGate["flags"]] === true;
}

export function checkPermission(request: PermissionRequest): PermissionDecision {
  const { capability: id, gate } = request;
  const input = request.input ?? {};
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

  // Per-input requirement: covers destructive capabilities and the
  // high-impact subset of the allowlisted system actions.
  const needsConfirmation = rule.requiresConfirmation || requiresConfirmationFor(capability, input);
  const target = capability.targetKey ? capability.targetKey(input) : null;
  const decision = { ...base, requiresConfirmation: needsConfirmation };

  if (needsConfirmation && !isApproved(request.confirmationId, id, Date.now(), target)) {
    return {
      ...decision,
      outcome: "needs_confirmation",
      reason: "requires_confirmation",
      message: `"${id}" needs explicit confirmation from the user first.`,
    };
  }

  if (capability.status !== "available") {
    return {
      ...decision,
      outcome: "unavailable",
      reason: "not_implemented",
      message: `"${id}" is declared but not implemented yet.`,
    };
  }

  return { ...decision, outcome: "allowed", reason: "ok", message: `"${id}" may run.` };
}
