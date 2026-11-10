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
};

export async function extractPdf(file: File): Promise<ExtractedPdf> {
  const bytes = await validatePdfFile(file);
  let pdf: pdfjs.PDFDocumentProxy;
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
    const pages: string[] = [];
    for (let number = 1; number <= pdf.numPages; number++) {
      const page = await pdf.getPage(number);
      const content = await page.getTextContent();
      const text = content.items
        .map((item) =>
          "str" in item ? item.str + (item.hasEOL ? "\n" : " ") : "",
        )
        .join("")
        .trim();
      if (!text) missingPages.push(number);
      else pages.push(`--- Strona ${number} ---\n${text}`);
      page.cleanup();
    }
    const text = pages.join("\n\n");
    if (!text || text.replace(/--- Strona \d+ ---/g, "").trim().length < 20) {
      throw new Error(
        "PDF nie zawiera wystarczającej ilości tekstu. Skan wymaga OCR, które nie jest jeszcze dostępne.",
      );
    }
    if (text.length > MAX_TEXT_LENGTH)
      throw new Error(
        "Tekst przekracza limit 150 000 znaków. Podziel dokument na mniejsze części.",
      );
    return { fileName: file.name, pages: pdf.numPages, text, missingPages };
  } finally {
    await pdf.destroy();
  }
}
