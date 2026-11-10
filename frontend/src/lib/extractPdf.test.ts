import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getDocument: vi.fn(),
  createOcr: vi.fn(),
}));
vi.mock("pdfjs-dist", () => ({
  GlobalWorkerOptions: {},
  getDocument: mocks.getDocument,
}));
vi.mock("./ocr", () => ({ createOcr: mocks.createOcr }));

import { extractPdf } from "./pdf";

const file = () => new File(["%PDF-test"], "test.pdf");
const textPage = (text: string) => ({
  getTextContent: vi.fn().mockResolvedValue({
    items: text ? [{ str: text, hasEOL: false }] : [],
  }),
  cleanup: vi.fn(),
});

beforeEach(() => {
  vi.resetAllMocks();
});

function setup(texts: string[]) {
  const pages = texts.map(textPage);
  const pdf = {
    numPages: pages.length,
    getPage: vi.fn(async (number: number) => pages[number - 1]),
    destroy: vi.fn().mockResolvedValue(undefined),
  };
  mocks.getDocument.mockReturnValue({ promise: Promise.resolve(pdf) });
  return { pages, pdf };
}

describe("PDF extraction with optional OCR", () => {
  it("preserves text and missing pages without starting OCR", async () => {
    const { pdf } = setup(["Wystarczająco długi tekst dokumentu.", ""]);
    const result = await extractPdf(file());
    expect(result.missingPages).toEqual([2]);
    expect(result.ocrPages).toEqual([]);
    expect(mocks.createOcr).not.toHaveBeenCalled();
    expect(pdf.destroy).toHaveBeenCalledOnce();
  });

  it("runs one worker only on blank pages and preserves order", async () => {
    const { pages } = setup(["Tekst na pierwszej stronie.", "", "", ""]);
    const recognize = vi
      .fn()
      .mockResolvedValueOnce("Tekst ze skanu strony drugiej.")
      .mockResolvedValueOnce("")
      .mockResolvedValueOnce("Tekst ze skanu strony czwartej.");
    const terminate = vi.fn().mockResolvedValue(undefined);
    mocks.createOcr.mockResolvedValue({ recognize, terminate });
    const onProgress = vi.fn();
    const result = await extractPdf(file(), { ocr: true, onProgress });
    expect(mocks.createOcr).toHaveBeenCalledOnce();
    expect(recognize.mock.calls.map(([page]) => pages.indexOf(page))).toEqual([
      1, 2, 3,
    ]);
    expect(result.ocrPages).toEqual([2, 4]);
    expect(result.missingPages).toEqual([3]);
    expect(result.text).toContain(
      "--- Strona 1 ---\nTekst na pierwszej stronie.\n\n--- Strona 2 ---",
    );
    expect(result.text).toContain("--- Strona 4 ---");
    expect(terminate).toHaveBeenCalledOnce();
    expect(onProgress).toHaveBeenCalled();
    pages.forEach((page) => expect(page.cleanup).toHaveBeenCalledOnce());
  });

  it("accepts scanned documents only when OCR reads enough text", async () => {
    setup([""]);
    await expect(extractPdf(file())).rejects.toThrow("Włącz OCR");
    mocks.createOcr.mockResolvedValue({
      recognize: vi
        .fn()
        .mockResolvedValue("Tekst ze skanowanej strony dokumentu."),
      terminate: vi.fn().mockResolvedValue(undefined),
    });
    const result = await extractPdf(file(), { ocr: true });
    expect(result.ocrPages).toEqual([1]);
  });

  it("rejects a scan if OCR finds no text", async () => {
    setup([""]);
    const terminate = vi.fn().mockResolvedValue(undefined);
    mocks.createOcr.mockResolvedValue({
      recognize: vi.fn().mockResolvedValue(""),
      terminate,
    });
    await expect(extractPdf(file(), { ocr: true })).rejects.toThrow(
      "po próbie OCR",
    );
    expect(terminate).toHaveBeenCalledOnce();
  });

  it("reports initialization errors and cleans up the PDF", async () => {
    const { pages, pdf } = setup([""]);
    mocks.createOcr.mockRejectedValue(new Error("network"));
    await expect(extractPdf(file(), { ocr: true })).rejects.toThrow(
      "uruchomić OCR",
    );
    expect(pages[0].cleanup).toHaveBeenCalledOnce();
    expect(pdf.destroy).toHaveBeenCalledOnce();
  });

  it("reports page errors and terminates the worker", async () => {
    const { pdf } = setup([""]);
    const terminate = vi.fn().mockResolvedValue(undefined);
    mocks.createOcr.mockResolvedValue({
      recognize: vi.fn().mockRejectedValue(new Error("failed")),
      terminate,
    });
    await expect(extractPdf(file(), { ocr: true })).rejects.toThrow(
      "stronie 1",
    );
    expect(terminate).toHaveBeenCalledOnce();
    expect(pdf.destroy).toHaveBeenCalledOnce();
  });
});
