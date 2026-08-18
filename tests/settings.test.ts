import { describe, expect, it } from "vitest";
import { DEFAULT_SETTINGS, __testing } from "@/hooks/usePetSettings";

const { sanitize, STORAGE_KEY } = __testing;

describe("shatta settings", () => {
  it("uses a namespaced storage key", () => {
    expect(STORAGE_KEY).toBe("shatta:settings:v1");
  });

  it("keeps voice output off by default so nothing ever autoplays", () => {
    expect(DEFAULT_SETTINGS.voiceOutput).toBe(false);
  });

  it("keeps developer context off by default (opt-in only)", () => {
    expect(DEFAULT_SETTINGS.devContext).toBe(false);
  });

  it("fills in missing keys from defaults", () => {
    expect(sanitize({ sounds: false })).toEqual({ ...DEFAULT_SETTINGS, sounds: false });
  });

  it("clamps volume into 0..1", () => {
    expect(sanitize({ volume: 4 }).volume).toBe(1);
    expect(sanitize({ volume: -2 }).volume).toBe(0);
    expect(sanitize({ volume: Number.NaN }).volume).toBe(DEFAULT_SETTINGS.volume);
  });
});
