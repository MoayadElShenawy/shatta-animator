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

export function routeCapability(message: string): CapabilityIntent {
  const text = (message ?? "").trim();
  if (!text) return { capability: null, confidence: 0, metadata: {} };

  for (const rule of RULES) {
    if (rule.patterns.some((p) => p.test(text))) {
      const metadata: Record<string, unknown> = {};
      const file = text.match(FILE_NAME);
      if (file) metadata['fileName'] = file[1];
      if (rule.capability === "web_search") metadata['query'] = text;
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
