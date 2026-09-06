/**
 * System-command capability.
 *
 * The AI never gets a shell. It names an allowlisted action; the policy layer
 * validates it, the permission layer decides, confirmation is required for
 * high-impact actions, and only then does the desktop shell run its own
 * hard-coded implementation of that action. Without a desktop runtime the
 * capability reports `not_supported` instead of faking anything.
 */

import { getFilesystemBridge } from "@/capabilities/filesystem-bridge";
import { commandTargetKey, validateCommand } from "@/capabilities/system-policy";
import type { Capability, CapabilityResult } from "@/capabilities/types";
import { notSupported } from "@/capabilities/types";

export const systemCommandCapability: Capability = {
  id: "system_command",
  description:
    "Run one of a few safe, allowlisted system actions (open a folder, show a file, lock the screen, empty the trash). No shell access, no arbitrary commands.",
  permissions: {
    risk: "reversible",
    reversible: true,
    // Per-action: destructive/high-impact actions require confirmation.
    requiresConfirmation: false,
    settingsFlag: "systemAccess",
  },
  status: "available",
  targetKey: (input) => commandTargetKey(input),
  needsConfirmationFor: (input) => {
    const validated = validateCommand(input);
    // An invalid/rejected request never reaches execution anyway; treating it
    // as "needs confirmation" would be misleading, so keep it false.
    return validated.ok ? validated.action.requiresConfirmation : false;
  },
  run: async (raw): Promise<CapabilityResult> => {
    const validated = validateCommand(raw);
    if (!validated.ok) {
      const reason = validated.reason === "unsupported" ? "not_supported" : validated.reason === "rejected" ? "rejected" : "failed";
      return { ok: false, reason, error: validated.message };
    }

    const bridge = getFilesystemBridge();
    if (!bridge || typeof bridge.runCommand !== "function") {
      return notSupported("system_command", "System actions need the desktop app.");
    }

    const request = validated.location
      ? { action: validated.action.id, location: validated.location }
      : { action: validated.action.id };
    const res = await bridge.runCommand(request);
    if (!res.ok) {
      const reason =
        res.reason === "unavailable" || res.reason === "not_supported"
          ? "not_supported"
          : res.reason === "rejected"
            ? "rejected"
            : res.reason === "denied"
              ? "denied"
              : "failed";
      return { ok: false, reason, error: res.error };
    }
    return { ok: true, data: { ...res.data, action: validated.action.id, label: validated.action.label } };
  },
};
