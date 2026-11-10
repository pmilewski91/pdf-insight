import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.useRealTimers();
  vi.resetModules();
});

describe("best effort per-instance limits", () => {
  it("limits calls per minute and resets the rolling window", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { takeProviderCall } = await import("../lib/limits.js");
    for (let i = 0; i < 5; i++) expect(await takeProviderCall()).toBe(true);
    expect(await takeProviderCall()).toBe(false);
    vi.advanceTimersByTime(60_000);
    expect(await takeProviderCall()).toBe(true);
  });
  it("limits calls per day on this instance", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
    const { takeProviderCall } = await import("../lib/limits.js");
    for (let minute = 0; minute < 8; minute++) {
      for (let i = 0; i < 5; i++) expect(await takeProviderCall()).toBe(true);
      vi.advanceTimersByTime(60_000);
    }
    expect(await takeProviderCall()).toBe(false);
  });
});
