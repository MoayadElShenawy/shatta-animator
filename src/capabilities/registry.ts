/**
 * Capability registry + the single enforcement gate.
 *
 * `runCapability` is the ONLY way a capability may execute. It checks, in
 * order: registration -> character allow-list -> settings flag -> confirmation
 * -> implementation. Nothing can bypass this from the AI or the UI.
 */

import { fileCapabilities } from "@/capabilities/files";
import { webSearchCapability } from "@/capabilities/web-search";
import type {
  Capability,
  CapabilityDescriptor,
  CapabilityId,
  CapabilityInput,
  CapabilityResult,
  CapabilityRunOptions,
} from "@/capabilities/types";

const registry = new Map<CapabilityId, Capability>();

export function registerCapability(capability: Capability) {
  registry.set(capability.id, capability);
}

for (const capability of [webSearchCapability, ...fileCapabilities]) {
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
  const needsConfirmation =
    capability.permissions.requiresConfirmation ||
    capability.permissions.risk !== "read_only";
  if (needsConfirmation && options.confirmation?.approved !== true) {
    return {
      ok: false,
      reason: "unconfirmed",
      error: `"${id}" requires explicit user confirmation before it can run.`,
    };
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
