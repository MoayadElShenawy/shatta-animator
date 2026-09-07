/**
 * Capability routing — intent classification ONLY.
 *
 * Given a user message, decide which capability it *conceptually* asks for.
 * Routing never executes anything and never touches the filesystem; the result
 * is handed to the permission layer, which decides if it could run at all.
 *
 * Language-agnostic by keyword: Egyptian Arabic + English.
 */

import type { CapabilityId } from "@/capabilities/types";

export type CapabilityIntent = {
  capability: CapabilityId | null;
  confidence: number;
  /** Loose metadata extracted from the message (file name, query…). */
  metadata: Record<string, unknown>;
};

type Rule = { capability: CapabilityId; patterns: readonly RegExp[] };

/** Order matters: destructive/specific intents are matched before generic ones. */
const RULES: readonly Rule[] = [
  {
    capability: "system_command",
    patterns: [/\b(run|execute)\s+(a\s+)?(command|script|shell|terminal)/i, /شغّ?لي?\s+أمر/, /تيرمينال/],
  },
  {
    capability: "file_delete",
    patterns: [/\b(delete|remove|erase|trash)\b.*\b(file|folder|it)\b/i, /امسح/, /احذف/, /اح?ذفي/, /امسحي/],
  },
  {
    capability: "file_move",
    patterns: [/\b(move|relocate)\b/i, /انقل/, /نقّ?لي?/, /حرّ?كي?\s+الملف/],
  },
  {
    capability: "file_copy",
    patterns: [/\b(copy|duplicate)\b/i, /انسخ/, /نسخة من/, /انسخي/],
  },
  {
    capability: "file_search",
    patterns: [
      /\b(find|search for|look for|locate)\b.*\b(file|folder|pdf|doc|image)\b/i,
      /دور(ي)?\s*(لي)?\s*على\s*(ملف|فولدر)/,
      /فين\s+الملف/,
      /ابحث\s+عن\s+ملف/,
    ],
  },
  {
    capability: "web_search",
    patterns: [
      /\b(search (the )?web|google|latest news|look up online)\b/i,
      /ابحث(ي)?\s*(لي)?\s*(على|في)?\s*(النت|الانترنت|جوجل)/,
      /آخر\s+أخبار/,
      /دور(ي)?\s*(لي)?\s*(على)?\s*.*(النت|الانترنت)/,
    ],
  },
];

const FILE_NAME = /([\w.-]+\.(pdf|docx?|xlsx?|pptx?|txt|png|jpe?g|gif|zip|mp[34]|csv|json))/i;

/** Which default folder the user named, if any. Never a raw OS path. */
function scopeHint(text: string): string | null {
  if (/\bdesktop\b/i.test(text) || /الديسك?توب|سطح المكتب/.test(text)) return "desktop";
  if (/\bdocuments?\b/i.test(text) || /المستندات|الدوكيومنت/.test(text)) return "documents";
  if (/\bdownloads?\b/i.test(text) || /التنزيلات|الداونلود/.test(text)) return "downloads";
  return null;
}

export function routeCapability(message: string): CapabilityIntent {
  const text = (message ?? "").trim();
  if (!text) return { capability: null, confidence: 0, metadata: {} };

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      const metadata: Record<string, unknown> = {};
      const file = text.match(FILE_NAME);
      if (file) metadata['fileName'] = file[1];
      if (rule.capability === "web_search") metadata['query'] = text;
      // file_search runs directly, so give it the name to look for.
      if (rule.capability === "file_search" && file) metadata['query'] = file[1];
      // Deletion is bound to one exact target file.
      if (rule.capability === "file_delete" && file) {
        metadata['target'] = scopeHint(text) ? `${scopeHint(text)}:${file[1]}` : file[1];
      }
      if (rule.capability === "file_copy" || rule.capability === "file_move") {
        if (file) metadata['source'] = file[1];
        const hint = scopeHint(text);
        if (file && hint) metadata['destination'] = `${hint}:${file[1]}`;
      }
      // The raw text is only ever matched against the system-action allowlist.
      if (rule.capability === "system_command") metadata['command'] = text;

      return { capability: rule.capability, confidence: 0.8, metadata };
    }
  }
  return { capability: null, confidence: 0, metadata: {} };
}

/** Human-readable summary used for the confirmation prompt. */
export function describeIntent(intent: CapabilityIntent): string {
  if (!intent.capability) return "Normal conversation.";
  const target = intent.metadata['fileName'];
  return target ? `${intent.capability} → ${String(target)}` : intent.capability;
}
