import { describe, expect, it } from "vitest";
import { PET_STATES, canTransition, lineFor } from "@/characters/types";
import { shatta, SHATTA_STATES } from "@/characters/shatta/personality";
import { SHATTA_SOUNDS } from "@/characters/shatta/sounds";

describe("shatta character definition", () => {
  it("configures every state in the state machine", () => {
    for (const state of PET_STATES) {
      expect(SHATTA_STATES[state], `missing config for ${state}`).toBeDefined();
    }
  });

  it("only references sounds that exist in the sound bank", () => {
    for (const state of PET_STATES) {
      const sound = SHATTA_STATES[state].sound;
      if (sound) expect(SHATTA_SOUNDS[sound]).toBeDefined();
    }
  });

  it("keeps auto-idle timings sane", () => {
    for (const state of PET_STATES) {
      const { autoIdleMs } = SHATTA_STATES[state];
      expect(autoIdleMs).toBeGreaterThanOrEqual(0);
      expect(autoIdleMs).toBeLessThanOrEqual(10_000);
    }
  });

  it("has a developer-focused, non-edgy system prompt", () => {
    expect(shatta.systemPrompt).toMatch(/Shatta/);
    expect(shatta.systemPrompt.toLowerCase()).toMatch(/never mean/);
  });
});

describe("state transitions", () => {
  it("always allows returning to idle", () => {
    for (const state of PET_STATES) {
      if (state === "idle") continue;
      expect(canTransition(SHATTA_STATES, state, "idle")).toBe(true);
    }
  });

  it("does not let a low-priority state interrupt a high-priority one", () => {
    expect(canTransition(SHATTA_STATES, "dragging", "curious")).toBe(false);
    expect(canTransition(SHATTA_STATES, "curious", "surprised")).toBe(true);
  });

  it("never transitions to the same state", () => {
    expect(canTransition(SHATTA_STATES, "happy", "happy")).toBe(false);
  });
});

describe("lines", () => {
  it("returns a configured line or null", () => {
    for (const state of PET_STATES) {
      const line = lineFor(SHATTA_STATES, state);
      if (SHATTA_STATES[state].lines.length === 0) expect(line).toBeNull();
      else expect(SHATTA_STATES[state].lines).toContain(line);
    }
  });
});
