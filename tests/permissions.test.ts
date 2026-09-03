import { describe, expect, it, beforeEach } from "vitest";

import { routeCapability } from "@/capabilities/routing";
import { runCapability, type CapabilityGate } from "@/capabilities/registry";
import { checkPermission } from "@/permissions/policy";
import {
  approveConfirmation,
  clearConfirmations,
  getConfirmation,
  isApproved,
  requestConfirmation,
} from "@/permissions/confirmations";
import { decideTurn } from "@/pet/brain";
import { shatta } from "@/characters/shatta/personality";

const ALL: string[] = [
  "web_search",
  "file_search",
  "file_copy",
  "file_move",
  "file_delete",
  "system_command",
];

const enabledGate: CapabilityGate = {
  allowed: ALL,
  flags: { webSearch: true, fileOperations: true, systemAccess: true, confirmSensitive: true },
};
const disabledGate: CapabilityGate = {
  allowed: ALL,
  flags: { webSearch: false, fileOperations: false, systemAccess: false, confirmSensitive: true },
};

beforeEach(() => clearConfirmations());

describe("capability routing", () => {
  it("routes normal conversation to no capability", () => {
    expect(routeCapability("إزيك يا شطة؟").capability).toBeNull();
  });

  it("routes file_search", () => {
    expect(routeCapability("دوريلي على ملف اسمه project.pdf").capability).toBe("file_search");
    expect(routeCapability("find a file called notes.txt").capability).toBe("file_search");
  });

  it("routes web_search", () => {
    expect(routeCapability("ابحثي على النت عن سعر الدولار").capability).toBe("web_search");
    expect(routeCapability("search the web for tanstack start").capability).toBe("web_search");
  });

  it("routes file_copy and file_move", () => {
    expect(routeCapability("انسخي الملف ده للمجلد ده").capability).toBe("file_copy");
    expect(routeCapability("انقل الملف ده على الديسكتوب").capability).toBe("file_move");
  });

  it("routes file_delete and system_command", () => {
    expect(routeCapability("امسحي الملف ده").capability).toBe("file_delete");
    expect(routeCapability("شغلي أمر في التيرمينال").capability).toBe("system_command");
  });

  it("extracts a file name as metadata only", () => {
    expect(routeCapability("دوريلي على ملف اسمه project.pdf").metadata["fileName"]).toBe(
      "project.pdf",
    );
  });
});

describe("permission policy", () => {
  it("marks read-only capabilities as non-destructive and confirmation-free", () => {
    for (const id of ["web_search", "file_search"] as const) {
      const d = checkPermission({ capability: id, gate: enabledGate });
      expect(d.readOnly).toBe(true);
      expect(d.destructive).toBe(false);
      expect(d.requiresConfirmation).toBe(false);
      // declared but unimplemented in this phase
      expect(d.outcome).toBe("unavailable");
      expect(d.reason).toBe("not_implemented");
    }
  });

  it("does not require destructive confirmation for copy/move by rule", () => {
    for (const id of ["file_copy", "file_move"] as const) {
      const d = checkPermission({ capability: id, gate: enabledGate });
      expect(d.destructive).toBe(false);
      // the capability itself still declares a confirmation requirement
      expect(d.outcome).toBe("needs_confirmation");
    }
  });

  it("requires explicit confirmation for file_delete and system_command", () => {
    for (const id of ["file_delete", "system_command"] as const) {
      const d = checkPermission({ capability: id, gate: enabledGate });
      expect(d.destructive).toBe(true);
      expect(d.outcome).toBe("needs_confirmation");
    }
  });

  it("reports disabled capabilities as unavailable", () => {
    const d = checkPermission({ capability: "file_search", gate: disabledGate });
    expect(d.outcome).toBe("unavailable");
    expect(d.reason).toBe("disabled_in_settings");
  });
});

describe("confirmation state", () => {
  it("starts pending and only approves explicitly", () => {
    const c = requestConfirmation({ capability: "file_delete", description: "delete a.pdf" });
    expect(c.status).toBe("pending_confirmation");
    expect(isApproved(c.id, "file_delete")).toBe(false);
    approveConfirmation(c.id);
    expect(isApproved(c.id, "file_delete")).toBe(true);
    // approval is scoped to that capability
    expect(isApproved(c.id, "file_move")).toBe(false);
  });

  it("expires safely", () => {
    const now = Date.now();
    const c = requestConfirmation({
      capability: "file_delete",
      description: "delete a.pdf",
      ttlMs: 10,
      now,
    });
    expect(getConfirmation(c.id, now + 50)?.status).toBe("expired");
    expect(isApproved(c.id, "file_delete", now + 50)).toBe(false);
  });

  it("is in-memory only", () => {
    requestConfirmation({ capability: "file_delete", description: "x" });
    expect(typeof globalThis.localStorage).toBe("undefined");
  });
});

describe("execution gateway stays closed", () => {
  it("never executes, even when enabled and confirmed", async () => {
    for (const id of ALL) {
      const res = await runCapability(id as never, {}, enabledGate, {
        confirmation: { approved: true, at: Date.now() },
      });
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.reason).toBe("not_implemented");
    }
  });

  it("denies disabled capabilities before anything else", async () => {
    const res = await runCapability("file_search", {}, disabledGate);
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.reason).toBe("denied");
  });
});

describe("brain decision flow", () => {
  it("keeps normal conversation on the askShatta path", () => {
    const d = decideTurn({ message: "إزيك النهاردة؟" });
    expect(d.route).toBe("conversation");
    expect(d.permission).toBeNull();
  });

  it("routes a capability request and returns a permission decision", () => {
    const d = decideTurn({
      message: "امسحي الملف project.pdf",
      flags: { fileOperations: true },
      character: { ...shatta, capabilities: { ...shatta.capabilities, allowedCapabilities: ALL } },
    });
    expect(d.route).toBe("capability");
    expect(d.intent.capability).toBe("file_delete");
    expect(d.permission?.outcome).toBe("needs_confirmation");
    expect(d.confirmation?.status).toBe("pending_confirmation");
  });
});
