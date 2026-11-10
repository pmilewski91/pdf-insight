import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ createWorker: vi.fn() }));
vi.mock("tesseract.js", () => ({ createWorker: mocks.createWorker }));
import { createOcr } from "./ocr";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.resetAllMocks();
});

describe("OCR language assets", () => {
  it("rejects an HTML fallback rather than silently losing a language", async () => {
    vi.stubGlobal("location", { origin: "http://localhost" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(async () => new Response("<html>")),
    );
    await expect(createOcr()).rejects.toThrow("Invalid OCR language data");
    expect(mocks.createWorker).not.toHaveBeenCalled();
  });

  it("accepts compressed and HTTP-decompressed language files", async () => {
    vi.stubGlobal("location", { origin: "http://localhost" });
    const raw = new Uint8Array(196);
    raw[0] = 24;
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(new Uint8Array([0x1f, 0x8b])))
        .mockResolvedValueOnce(new Response(raw)),
    );
    const terminate = vi.fn().mockResolvedValue(undefined);
    mocks.createWorker.mockResolvedValue({ terminate });
    const ocr = await createOcr();
    await ocr.terminate();
    expect(terminate).toHaveBeenCalledOnce();
  });
});
