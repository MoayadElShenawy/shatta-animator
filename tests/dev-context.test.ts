import { describe, expect, it } from "vitest";
import { EMPTY_CONTEXT, lineForEvent, moodForEvent } from "@/lib/dev-context";

describe("developer context", () => {
  it("starts empty", () => {
    expect(EMPTY_CONTEXT).toEqual({ project: null, branch: null, changedFiles: null, lastEvent: null });
  });

  it("maps events to moods", () => {
    expect(moodForEvent({ kind: "build", status: "started" })).toBe("thinking");
    expect(moodForEvent({ kind: "test", status: "failure" })).toBe("annoyed");
    expect(moodForEvent({ kind: "test", status: "success" })).toBe("celebrating");
    expect(moodForEvent({ kind: "git", status: "success" })).toBe("happy");
  });

  it("writes friendly lines without leaking details", () => {
    expect(lineForEvent({ kind: "test", status: "failure" })).toMatch(/red/i);
    expect(lineForEvent({ kind: "build", status: "started", label: "vite build" })).toContain("vite build");
  });
});
