import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { validatePdfFile } from "./fileValidation";

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
export const MAX_TEXT_LENGTH = 150_000;
const MAX_PAGES = 100;

export type ExtractedPdf = {
  fileName: string;
  pages: number;
  text: string;
  missingPages: number[];
  ocrPages: number[];
};

export async function extractPdf(
  file: File,
  options: { ocr?: boolean; onProgress?: (message: string) => void } = {},
): Promise<ExtractedPdf> {
  const bytes = await validatePdfFile(file);
  let pdf: pdfjs.PDFDocumentProxy;
  let ocr: Awaited<ReturnType<typeof import("./ocr").createOcr>> | undefined;
  try {
    pdf = await pdfjs.getDocument({ data: bytes }).promise;
  } catch (error) {
    if (error instanceof Error && error.name === "PasswordException")
      throw new Error("PDF jest zabezpieczony hasłem.");
    throw new Error("Nie można odczytać PDF. Plik może być uszkodzony.");
  }
  try {
    if (pdf.numPages > MAX_PAGES)
      throw new Error("Dokument ma więcej niż 100 stron.");
    const missingPages: number[] = [];
    const ocrPages: number[] = [];
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      try {
        const content = await page.getTextContent();
        let text = content.items
          .map((item) =>
            "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
          )
          .join("")
          .trim();
        if (!text && options.ocr) {
          if (!ocr) {
            options.onProgress?.(
              "Przygotowujemy OCR (pierwsze uruchomienie może potrwać)…",
            );
            try {
              const { createOcr } = await import("./ocr");
              ocr = await createOcr();
            } catch {
              throw new Error(
                "Nie udało się uruchomić OCR. Sprawdź połączenie i spróbuj ponownie.",
              );
            }
          }
          options.onProgress?.(
            `Rozpoznajemy tekst: strona ${number} z ${pdf.numPages}…`,
          );
          try {
            text = await ocr.recognize(page);
          } catch {
            throw new Error(
              `Nie udało się rozpoznać tekstu na stronie ${number}. Spróbuj ponownie lub wyłącz OCR.`,
            );
          }
          if (text) ocrPages.push(number);
        }
        if (!text) missingPages.push(number);
        else pages.push(`--- Strona ${number} ---\n${text}`);
      } finally {
        page.cleanup();
      }
    }
    const text = pages.join("\n\n");
    if (!text || text.replace(/--- Strona \d+ ---/g, "").trim().length < 20) {
      throw new Error(
        options.ocr
          ? "PDF nie zawiera wystarczającej ilości tekstu, także po próbie OCR."
          : "PDF nie zawiera wystarczającej ilości tekstu. Włącz OCR, aby spróbować odczytać skan.",
      );
    }
    if (text.length > MAX_TEXT_LENGTH)
      throw new Error(
        "Tekst przekracza limit 150 000 znaków. Podziel dokument na mniejsze części.",
      );
    return {
      fileName: file.name,
      pages: pdf.numPages,
      text,
      missingPages,
      ocrPages,
    };
  } finally {
    try {
      await ocr?.terminate();
    } finally {
      await pdf.destroy();
    }
  }
}
