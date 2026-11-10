import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import handler from "../api/analyze.js";
import { takeProviderCall } from "../lib/limits.js";

vi.mock("../lib/limits.js", () => ({ takeProviderCall: vi.fn() }));
const validResult = {
  document: {
    fileName: "test.pdf",
    pages: 2,
    language: "pl",
    type: "umowa",
    title: null,
    date: null,
  },
  summary: "To jest umowa. Dotyczy usług. Zawarto ją w lutym.",
  keyPoints: ["Umowa o usługi", "Zawarta w lutym", "Dwie strony"],
  entities: { organizations: [], people: [] },
  amounts: [],
  dates: [],
  keywords: [],
};
const origin = "https://pmilewski91.github.io";
const input = {
  fileName: "faktyczny.pdf",
  pages: 3,
  text: "Przykładowy dokument testowy z wystarczającą ilością tekstu.",
};
const request = (body: unknown, requestOrigin = origin) =>
  new Request("https://api.example/api/analyze", {
    method: "POST",
    headers: { origin: requestOrigin, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
const gemini = (text: string) =>
  Response.json({ candidates: [{ content: { parts: [{ text }] } }] });

beforeEach(() => {
  vi.stubEnv("GEMINI_API_KEY", "test-key");
  vi.stubEnv("GEMINI_MODEL", "test-model");
  vi.stubEnv("FREE_TIER_CONFIRMED", "true");
  vi.stubEnv("ALLOWED_ORIGINS", origin);
  vi.mocked(takeProviderCall).mockReset().mockResolvedValue(true);
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("analysis endpoint", () => {
  it("rejects disallowed origin before processing", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (await handler.fetch(request(input, "https://example.com"))).status,
    ).toBe(403);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("fails closed until the free tier is confirmed", async () => {
    vi.stubEnv("FREE_TIER_CONFIRMED", "");
    expect((await handler.fetch(request(input))).status).toBe(503);
  });
  it("rejects invalid input without calling providers", async () => {
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect(
      (await handler.fetch(request({ ...input, text: "short" }))).status,
    ).toBe(400);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("retries one invalid model result and uses client metadata", async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(gemini('{"invalid":true}'))
      .mockResolvedValueOnce(gemini(JSON.stringify(validResult)));
    vi.stubGlobal("fetch", fetch);
    const response = await handler.fetch(request(input));
    const result = await response.json();
    expect(response.status).toBe(200);
    expect(result.document.fileName).toBe(input.fileName);
    expect(result.document.pages).toBe(input.pages);
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(takeProviderCall).toHaveBeenCalledTimes(2);
  });
  it("stops after two invalid model results", async () => {
    const fetch = vi.fn().mockResolvedValue(gemini("not json"));
    vi.stubGlobal("fetch", fetch);
    expect((await handler.fetch(request(input))).status).toBe(502);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it("does not call Gemini when the instance limit is reached", async () => {
    vi.mocked(takeProviderCall).mockResolvedValue(false);
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    expect((await handler.fetch(request(input))).status).toBe(429);
    expect(fetch).not.toHaveBeenCalled();
  });
  it("reports provider quota exhaustion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 429 })),
    );
    const response = await handler.fetch(request(input));
    expect(response.status).toBe(429);
    expect((await response.json()).error).toContain("Gemini");
  });
});
