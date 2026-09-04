import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { runCapability, type CapabilityGate } from "@/capabilities/registry";
import { routeCapability } from "@/capabilities/routing";
import {
  setFilesystemBridge,
  type FilesystemBridge,
  type FsResult,
  type FsSearchResult,
} from "@/capabilities/filesystem-bridge";
import { parseLocation, parseQuery } from "@/capabilities/paths";
import { decideTurn, executeDecision } from "@/pet/brain";
import { shatta } from "@/characters/shatta/personality";

const ALL_ALLOWED = ["web_search", "file_search", "file_copy", "file_move", "file_delete", "system_command"];
const testCharacter = { ...shatta, capabilities: { ...shatta.capabilities, allowedCapabilities: ALL_ALLOWED } };

const enabledGate: CapabilityGate = {
  allowed: ALL_ALLOWED,
  flags: { webSearch: true, fileOperations: true, systemAccess: true, confirmSensitive: true },
};
const disabledGate: CapabilityGate = {
  allowed: ALL_ALLOWED,
  flags: { webSearch: false, fileOperations: false, systemAccess: false, confirmSensitive: true },
};

const approved = { confirmation: { approved: true, at: Date.now() } };

function ok<T>(data: T): FsResult<T> {
  return { ok: true, data };
}
function err(reason: FsResult<never>["ok"] extends true ? never : "not_found" | "exists" | "denied" | "failed" | "invalid" | "unavailable", message: string): FsResult<never> {
  return { ok: false, reason, error: message } as FsResult<never>;
}

function makeBridge(overrides: Partial<FilesystemBridge> = {}): FilesystemBridge {
  return {
    scopes: async () => ["desktop", "documents", "downloads"],
    search: async () => ok<readonly FsSearchResult[]>([]),
    copy: async ({ destination }) => ok({ destination }),
    move: async ({ destination }) => ok({ destination }),
    ...overrides,
  };
}

beforeEach(() => setFilesystemBridge(null));
afterEach(() => setFilesystemBridge(null));

describe("path validation", () => {
  it("rejects traversal, absolute paths and unknown scopes", () => {
    expect(parseLocation("../etc/passwd").ok).toBe(false);
    expect(parseLocation("/etc/passwd").ok).toBe(false);
    expect(parseLocation("desktop:../secret.txt").ok).toBe(false);
    expect(parseLocation("weirdscope:a.txt").ok).toBe(false);
    expect(parseQuery("../x").ok).toBe(false);
    expect(parseQuery("a/b").ok).toBe(false);
    const okLoc = parseLocation("desktop:reports/q1.pdf");
    expect(okLoc.ok).toBe(true);
    if (okLoc.ok) expect(okLoc.location).toEqual({ scope: "desktop", path: "reports/q1.pdf" });
  });
});

describe("routing", () => {
  it("classifies file_search / file_copy / file_move", () => {
    expect(routeCapability("دوريلي على ملف اسمه project.pdf").capability).toBe("file_search");
    expect(routeCapability("انسخي project.pdf للديسكتوب").capability).toBe("file_copy");
    expect(routeCapability("انقلي project.pdf على الديسكتوب").capability).toBe("file_move");
  });
});

describe("file_search", () => {
  it("returns matches through the bridge", async () => {
    setFilesystemBridge(
      makeBridge({
        search: async () =>
          ok<readonly FsSearchResult[]>([
            { name: "project.pdf", scope: "desktop", path: "project.pdf", type: "file", sizeBytes: 12 },
          ]),
      }),
    );
    const res = await runCapability("file_search", { query: "project.pdf" }, enabledGate);
    expect(res.ok).toBe(true);
    if (res.ok) expect((res.data as { matches: unknown[] }).matches).toHaveLength(1);
  });

  it("handles a no-result case", async () => {
    setFilesystemBridge(makeBridge({ search: async () => ok<readonly FsSearchResult[]>([]) }));
    const res = await runCapability("file_search", { query: "nothing.txt" }, enabledGate);
    expect(res.ok).toBe(true);
    if (res.ok) expect((res.data as { matches: unknown[] }).matches).toHaveLength(0);
  });

  it("rejects invalid input", async () => {
    setFilesystemBridge(makeBridge());
    const res = await runCapability("file_search", { query: "../x" }, enabledGate);
    expect(res.ok).toBe(false);
  });

  it("reports unavailable when no bridge is installed", async () => {
    const res = await runCapability("file_search", { query: "x" }, enabledGate);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_implemented");
  });
});

describe("file_copy", () => {
  it("copies through the bridge when confirmed", async () => {
    const copy = vi.fn(async ({ destination }) => ok({ destination }));
    setFilesystemBridge(makeBridge({ copy }));
    const res = await runCapability(
      "file_copy",
      { source: "documents:a.txt", destination: "desktop:a.txt" },
      enabledGate,
      approved,
    );
    expect(res.ok).toBe(true);
    expect(copy).toHaveBeenCalledOnce();
  });

  it("reports destination conflict", async () => {
    setFilesystemBridge(makeBridge({ copy: async () => err("exists", "already exists") }));
    const res = await runCapability(
      "file_copy",
      { source: "documents:a.txt", destination: "desktop:a.txt" },
      enabledGate,
      approved,
    );
    expect(res.ok).toBe(false);
  });

  it("rejects an invalid path", async () => {
    setFilesystemBridge(makeBridge());
    const res = await runCapability(
      "file_copy",
      { source: "documents:../a.txt", destination: "desktop:a.txt" },
      enabledGate,
      approved,
    );
    expect(res.ok).toBe(false);
  });

  it("blocks copy without confirmation", async () => {
    setFilesystemBridge(makeBridge());
    const res = await runCapability(
      "file_copy",
      { source: "documents:a.txt", destination: "desktop:a.txt" },
      enabledGate,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("unconfirmed");
  });
});

describe("file_move", () => {
  it("moves through the bridge when confirmed", async () => {
    const move = vi.fn(async ({ destination }) => ok({ destination }));
    setFilesystemBridge(makeBridge({ move }));
    const res = await runCapability(
      "file_move",
      { source: "documents:a.txt", destination: "desktop:a.txt" },
      enabledGate,
      approved,
    );
    expect(res.ok).toBe(true);
    expect(move).toHaveBeenCalledOnce();
  });

  it("reports destination conflict", async () => {
    setFilesystemBridge(makeBridge({ move: async () => err("exists", "already exists") }));
    const res = await runCapability(
      "file_move",
      { source: "documents:a.txt", destination: "desktop:a.txt" },
      enabledGate,
      approved,
    );
    expect(res.ok).toBe(false);
  });

  it("rejects an invalid destination", async () => {
    setFilesystemBridge(makeBridge());
    const res = await runCapability(
      "file_move",
      { source: "documents:a.txt", destination: "/etc/passwd" },
      enabledGate,
      approved,
    );
    expect(res.ok).toBe(false);
  });
});

describe("disabled capability rejection", () => {
  it("denies file_copy when fileOperations is off", async () => {
    setFilesystemBridge(makeBridge());
    const res = await runCapability(
      "file_copy",
      { source: "documents:a.txt", destination: "desktop:a.txt" },
      disabledGate,
      approved,
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("denied");
  });
});

describe("destructive capabilities stay unavailable", () => {
  it("file_delete cannot execute", async () => {
    const res = await runCapability("file_delete", {}, enabledGate, approved);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_implemented");
  });
  it("system_command cannot execute", async () => {
    const res = await runCapability("system_command", {}, enabledGate, approved);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("not_implemented");
  });
});

describe("brain integration", () => {
  it("keeps normal chat on the conversation path", () => {
    const d = decideTurn({ message: "إزيك؟", character: testCharacter, flags: { fileOperations: true } });
    expect(d.route).toBe("conversation");
  });

  it("executes file_search when allowed and a bridge exists", async () => {
    setFilesystemBridge(
      makeBridge({
        search: async () =>
          ok<readonly FsSearchResult[]>([
            { name: "project.pdf", scope: "desktop", path: "project.pdf", type: "file" },
          ]),
      }),
    );
    const request = {
      message: "دوريلي على ملف اسمه project.pdf",
      character: testCharacter,
      flags: { fileOperations: true },
    };
    const decision = decideTurn(request);
    expect(decision.route).toBe("capability");
    expect(decision.permission?.outcome).toBe("allowed");
    const result = await executeDecision(decision, request);
    expect(result?.ok).toBe(true);
  });
});
