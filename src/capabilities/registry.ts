/**
 * Capability registry + the single enforcement gate.
 *
 * `runCapability` is the ONLY way a capability may execute. It checks, in
 * order: registration -> character allow-list -> settings flag -> confirmation
 * -> implementation. Nothing can bypass this from the AI or the UI.
 *
 * Confirmation rules enforced here:
 *  - destructive capabilities (and confirmation-gated system actions) require
 *    an approved confirmation id that is bound to this exact target
 *  - the model cannot fabricate approval: only the UI holds confirmation ids
 */

import { fileCapabilities } from "@/capabilities/files";
import { systemCommandCapability } from "@/capabilities/system-command";
import { webSearchCapability } from "@/capabilities/web-search";
import type {
  Capability,
  CapabilityDescriptor,
  CapabilityId,
  CapabilityInput,
  CapabilityResult,
  CapabilityRunOptions,
} from "@/capabilities/types";
import { isApproved } from "@/permissions/confirmations";

const registry = new Map<CapabilityId, Capability>();

export function registerCapability(capability: Capability) {
  registry.set(capability.id, capability);
}

for (const capability of [webSearchCapability, ...fileCapabilities, systemCommandCapability]) {
  registerCapability(capability);
}

export function getCapability(id: CapabilityId): Capability | undefined {
  return registry.get(id);
}

export function listCapabilities(): readonly Capability[] {
  return [...registry.values()];
}

export type CapabilityGate = {
  /** Capability ids the current character is allowed to use at all. */
  allowed: readonly string[];
  /** Feature switches coming from user settings. */
  flags: {
    webSearch: boolean;
    fileOperations: boolean;
    systemAccess: boolean;
    /** When false, confirmation is still required for risky capabilities. */
    confirmSensitive: boolean;
  };
};

/** Capabilities the brain may describe to the AI for this turn. */
export function describeCapabilities(gate: CapabilityGate): readonly CapabilityDescriptor[] {
  return listCapabilities()
    .filter((c) => gate.allowed.includes(c.id) && isFlagOn(c, gate))
    .map((c) => ({
      id: c.id,
      description: c.description,
      risk: c.permissions.risk,
      requiresConfirmation: c.permissions.requiresConfirmation,
      status: c.status,
    }));
}

function isFlagOn(capability: Capability, gate: CapabilityGate): boolean {
  const flag = capability.permissions.settingsFlag;
  if (flag === "none") return true;
  return gate.flags[flag];
}

/** Does this capability need confirmation for this specific input? */
export function requiresConfirmationFor(capability: Capability, input: CapabilityInput): boolean {
  if (capability.permissions.risk === "destructive") return true;
  if (capability.permissions.requiresConfirmation) return true;
  return capability.needsConfirmationFor?.(input) === true;
}

/** The enforcement gate. Never call `capability.run` directly. */
export async function runCapability(
  id: CapabilityId,
  input: CapabilityInput,
  gate: CapabilityGate,
  options: CapabilityRunOptions = {},
): Promise<CapabilityResult> {
  const capability = registry.get(id);
  if (!capability) {
    return { ok: false, reason: "denied", error: `Unknown capability "${id}".` };
  }
  if (!gate.allowed.includes(id)) {
    return { ok: false, reason: "denied", error: `"${id}" is not allowed for this character.` };
  }
  if (!isFlagOn(capability, gate)) {
    return { ok: false, reason: "denied", error: `"${id}" is disabled in settings.` };
  }

  if (requiresConfirmationFor(capability, input)) {
    const target = capability.targetKey ? capability.targetKey(input) : null;
    const bound = isApproved(options.confirmationId, id, Date.now(), target);
    // Inline approval is only ever accepted for non-destructive capabilities.
    const inline =
      capability.permissions.risk !== "destructive" && options.confirmation?.approved === true;
    if (!bound && !inline) {
      return {
        ok: false,
        reason: "unconfirmed",
        error: `"${id}" requires explicit user confirmation of this exact operation before it can run.`,
      };
    }
  }

  if (capability.status !== "available") {
    return {
      ok: false,
      reason: "not_implemented",
      error: `"${id}" is declared but not implemented yet.`,
    };
  }
  return capability.run(input, options);
}
