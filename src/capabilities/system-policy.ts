/**
 * System-command policy.
 *
 * There is NO arbitrary shell. The AI can only name one of a few explicitly
 * allowlisted *actions*; anything else is rejected here, before permissions,
 * before confirmation and long before the desktop shell. Free-form command
 * text is never forwarded anywhere — it is only pattern-matched against the
 * allowlist to guess which allowlisted action the user meant.
 */

import { DEFAULT_SCOPE, parseLocation, type FileLocation } from "@/capabilities/paths";
import type { CapabilityRisk } from "@/capabilities/types";

export type SystemActionId = "open_folder" | "reveal_file" | "lock_screen" | "empty_trash";

export type SystemAction = {
  id: SystemActionId;
  label: string;
  risk: CapabilityRisk;
  requiresConfirmation: boolean;
  /** "location" actions need an authorized scoped path; "none" take no input. */
  params: "none" | "location";
  patterns: readonly RegExp[];
};

export const SYSTEM_ACTIONS: readonly SystemAction[] = [
  {
    id: "open_folder",
    label: "Open a folder in the file manager",
    risk: "reversible",
    requiresConfirmation: false,
    params: "location",
    patterns: [/\bopen (the )?folder\b/i, /افتحي?\s+(ال)?فولدر/, /افتحي?\s+(ال)?مجلد/],
  },
  {
    id: "reveal_file",
    label: "Show a file in the file manager",
    risk: "reversible",
    requiresConfirmation: false,
    params: "location",
    patterns: [/\b(reveal|show) (the )?file\b/i, /وريني\s+(ال)?ملف/, /افتحي?\s+مكان\s+(ال)?ملف/],
  },
  {
    id: "lock_screen",
    label: "Lock the screen",
    risk: "reversible",
    requiresConfirmation: true,
    params: "none",
    patterns: [/\block (the )?screen\b/i, /اقفلي?\s+(ال)?شاشة/],
  },
  {
    id: "empty_trash",
    label: "Empty the trash",
    risk: "destructive",
    requiresConfirmation: true,
    params: "none",
    patterns: [/\bempty (the )?(trash|bin|recycle bin)\b/i, /فضّ?ي\s+(ال)?سلة/, /فرّ?غي?\s+(ال)?سلة/],
  },
];

/** Patterns that mean "this is an attack, not a request". */
const DANGEROUS = [
  /\bsudo\b/i,
  /\bsu\s+-\b/i,
  /\brunas\b/i,
  /\bdoas\b/i,
  /\bchmod\s+777\b/i,
  /\bchown\b/i,
  /\brm\s+-[rf]/i,
  /\bdel\s+\/[sf]/i,
  /\bmkfs\b/i,
  /\bdd\s+if=/i,
  /\bformat\s+[a-z]:/i,
  /\bshutdown\b/i,
  /\breg\s+add\b/i,
  /\bpowershell\b/i,
  /\bcmd(\.exe)?\b/i,
  /\bbash\b|\bsh\s+-c\b|\bzsh\b/i,
  /\bcurl\b|\bwget\b/i,
  /\bnc\b\s|\bnetcat\b/i,
  /\bssh\b|\bscp\b/i,
  /\bid_rsa\b|\.ssh\b|\bkeychain\b|\bcredential/i,
  /\/etc\/(passwd|shadow|sudoers)/i,
  /\benv\b\s*$|\bprintenv\b/i,
  /\bkeylog|\bdump\b/i,
];

/** Shell metacharacters — command injection attempts. */
const INJECTION = /[;&|`$><\n\r\u0000]|\$\(|\|\||&&/;

export type PolicyResult =
  | { ok: true; action: SystemAction; location?: FileLocation }
  | { ok: false; reason: "unsupported" | "rejected" | "invalid"; message: string };

export function getSystemAction(id: unknown): SystemAction | undefined {
  return SYSTEM_ACTIONS.find((a) => a.id === id);
}

export type SystemCommandInput = {
  action?: unknown;
  command?: unknown;
  target?: unknown;
};

/**
 * Validate a system-command request against the allowlist. Returns the
 * resolved action (never a shell string) or a structured refusal.
 */
export function validateCommand(raw: unknown): PolicyResult {
  const input = (raw ?? {}) as SystemCommandInput;
  const text = typeof input.command === "string" ? input.command : "";

  if (text) {
    if (INJECTION.test(text)) {
      return { ok: false, reason: "rejected", message: "That looks like command injection — refused." };
    }
    if (DANGEROUS.some((p) => p.test(text))) {
      return {
        ok: false,
        reason: "rejected",
        message: "That command is blocked by policy (privileged, destructive or credential-related).",
      };
    }
  }

  let action: SystemAction | undefined;
  if (input.action !== undefined) {
    if (typeof input.action !== "string" || INJECTION.test(input.action)) {
      return { ok: false, reason: "rejected", message: "Invalid action name." };
    }
    action = getSystemAction(input.action);
    if (!action) {
      return {
        ok: false,
        reason: "unsupported",
        message: `"${input.action}" is not one of the supported system actions.`,
      };
    }
  } else if (text) {
    action = SYSTEM_ACTIONS.find((a) => a.patterns.some((p) => p.test(text)));
    if (!action) {
      return {
        ok: false,
        reason: "unsupported",
        message: "No supported system action matches that request.",
      };
    }
  } else {
    return { ok: false, reason: "invalid", message: "No system action was supplied." };
  }

  if (action.params === "location") {
    const parsed = parseLocation(input.target, DEFAULT_SCOPE);
    if (!parsed.ok) return { ok: false, reason: "invalid", message: `target: ${parsed.message}` };
    return { ok: true, action, location: parsed.location };
  }
  return { ok: true, action };
}

/** Stable key used to bind a confirmation to this exact operation. */
export function commandTargetKey(raw: unknown): string | null {
  const validated = validateCommand(raw);
  if (!validated.ok) return null;
  return validated.location
    ? `${validated.action.id}:${validated.location.scope}:${validated.location.path}`
    : validated.action.id;
}
