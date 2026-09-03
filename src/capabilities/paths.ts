/**
 * Path validation for the file capabilities.
 *
 * The model NEVER hands a raw OS path to the filesystem. Everything is
 * expressed as `scope:relative/path`, where `scope` is one of a few
 * user-owned folders the desktop shell agrees to expose. This module is pure:
 * it validates and normalises, it never touches a filesystem.
 */

export const FILE_SCOPES = ["desktop", "documents", "downloads"] as const;
export type FileScope = (typeof FILE_SCOPES)[number];

export const DEFAULT_SCOPE: FileScope = "documents";

export type FileLocation = { scope: FileScope; path: string };

export type PathError =
  | "empty"
  | "unknown_scope"
  | "absolute_path"
  | "traversal"
  | "invalid_characters"
  | "too_long";

export type PathResult =
  | { ok: true; location: FileLocation }
  | { ok: false; error: PathError; message: string };

const MAX_LEN = 240;
// eslint-disable-next-line no-control-regex
const FORBIDDEN = /[\u0000-\u001f<>:"|?*]/;

function fail(error: PathError, message: string): PathResult {
  return { ok: false, error, message };
}

export function isFileScope(value: unknown): value is FileScope {
  return typeof value === "string" && (FILE_SCOPES as readonly string[]).includes(value);
}

/**
 * Accepts `"desktop:reports/q1.pdf"`, `"q1.pdf"` (falls back to `fallbackScope`)
 * or `{ scope, path }`. Rejects absolute paths, traversal and control chars.
 */
export function parseLocation(input: unknown, fallbackScope: FileScope = DEFAULT_SCOPE): PathResult {
  let scopeRaw: string = fallbackScope;
  let rest: string;

  if (input && typeof input === "object" && !Array.isArray(input)) {
    const obj = input as { scope?: unknown; path?: unknown };
    if (obj.scope !== undefined) {
      if (!isFileScope(obj.scope)) return fail("unknown_scope", `Unknown scope "${String(obj.scope)}".`);
      scopeRaw = obj.scope;
    }
    if (typeof obj.path !== "string") return fail("empty", "No path supplied.");
    rest = obj.path;
  } else if (typeof input === "string") {
    const trimmed = input.trim();
    const match = /^([A-Za-z_]+):(.*)$/.exec(trimmed);
    if (match && isFileScope(match[1]!.toLowerCase())) {
      scopeRaw = match[1]!.toLowerCase();
      rest = match[2]!;
    } else if (match && !/^[A-Za-z]$/.test(match[1]!)) {
      return fail("unknown_scope", `Unknown scope "${match[1]}".`);
    } else {
      rest = trimmed;
    }
  } else {
    return fail("empty", "No path supplied.");
  }

  const raw = rest.trim().replace(/\\/g, "/");
  if (!raw) return fail("empty", "No path supplied.");
  if (raw.length > MAX_LEN) return fail("too_long", "Path is too long.");
  if (raw.startsWith("/") || raw.startsWith("~") || /^[A-Za-z]:/.test(raw)) {
    return fail("absolute_path", "Absolute paths are not allowed — use a scoped path.");
  }
  if (FORBIDDEN.test(raw)) return fail("invalid_characters", "Path contains invalid characters.");

  const segments: string[] = [];
  for (const segment of raw.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") return fail("traversal", 'Path traversal ("..") is not allowed.');
    segments.push(segment);
  }
  if (!segments.length) return fail("empty", "No path supplied.");

  return { ok: true, location: { scope: scopeRaw as FileScope, path: segments.join("/") } };
}

export type QueryResult = { ok: true; query: string } | { ok: false; error: PathError; message: string };

/** A search query is a (partial) file name, never a path. */
export function parseQuery(input: unknown): QueryResult {
  if (typeof input !== "string") return fail("empty", "No search query supplied.") as QueryResult;
  const query = input.trim();
  if (!query) return fail("empty", "No search query supplied.") as QueryResult;
  if (query.length > 120) return fail("too_long", "Search query is too long.") as QueryResult;
  if (query.includes("..")) return fail("traversal", 'Search queries may not contain "..".') as QueryResult;
  if (/[/\\]/.test(query)) return fail("invalid_characters", "Search by file name, not by path.") as QueryResult;
  if (FORBIDDEN.test(query)) return fail("invalid_characters", "Query contains invalid characters.") as QueryResult;
  return { ok: true, query };
}

export function formatLocation(location: FileLocation): string {
  return `${location.scope}:${location.path}`;
}
