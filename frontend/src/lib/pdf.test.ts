import { describe, expect, it } from "vitest";
import { validatePdfFile, MAX_FILE_SIZE } from "./fileValidation";

describe("PDF validation", () => {
  it("rejects non-PDF files", async () => {
    await expect(
      validatePdfFile(new File(["hello"], "test.txt", { type: "text/plain" })),
    ).rejects.toThrow("formacie PDF");
  });
  it("rejects empty files", async () => {
    await expect(
      validatePdfFile(new File([], "test.pdf", { type: "application/pdf" })),
    ).rejects.toThrow("pusty");
  });
  it("rejects files larger than 10 MB", async () => {
    await expect(
      validatePdfFile(
        new File([new Uint8Array(MAX_FILE_SIZE + 1)], "test.pdf"),
      ),
    ).rejects.toThrow("10 MB");
  });
  it("rejects a fake PDF", async () => {
    await expect(
      validatePdfFile(new File(["not a PDF"], "test.pdf")),
    ).rejects.toThrow("nie jest poprawnym");
  });
});
