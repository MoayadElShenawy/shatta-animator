/**
 * Web-search capability declaration — BOUNDARY ONLY.
 *
 * No provider is wired, nothing is scraped and no results are faked. The
 * capability exists so the brain can eventually tell the model "current info is
 * reachable through this tool" and so a real provider can be dropped in behind
 * `runCapability` without touching the UI.
 */

import type { Capability } from "@/capabilities/types";
import { notImplemented } from "@/capabilities/types";

export type WebSearchInput = { query: string; freshness?: "any" | "recent" };
export type WebSearchHit = { title: string; url: string; snippet: string; publishedAt?: string };

export const webSearchCapability: Capability = {
  id: "web_search",
  description:
    "Look up current information on the web (news, releases, prices) that the model cannot know from training data.",
  permissions: {
    risk: "read_only",
    reversible: true,
    requiresConfirmation: false,
    settingsFlag: "webSearch",
  },
  status: "not_implemented",
  run: async () => notImplemented("web_search"),
};
