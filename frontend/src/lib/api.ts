import { resultSchema, type AnalysisResult } from "../../../backend/lib/schema";
import type { ExtractedPdf } from "./pdf";

export async function analyzePdf(pdf: ExtractedPdf): Promise<AnalysisResult> {
  const apiUrl = import.meta.env.VITE_API_URL;
  if (!apiUrl)
    throw new Error(
      "Adres API nie jest skonfigurowany. Skontaktuj się z administratorem.",
    );
  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, "")}/api/analyze`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: pdf.fileName,
        pages: pdf.pages,
        text: pdf.text,
      }),
      signal: AbortSignal.timeout(60000),
    });
  } catch {
    throw new Error(
      "Nie udało się połączyć z API lub przekroczono czas oczekiwania.",
    );
  }
  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error("API zwróciło nieczytelną odpowiedź.");
  }
  if (!response.ok) {
    if (
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
    ) {
      throw new Error(data.error);
    }
    throw new Error("Nie udało się przeprowadzić analizy.");
  }
  const parsed = resultSchema.safeParse(data);
  if (!parsed.success)
    throw new Error("API zwróciło wynik niezgodny ze schematem.");
  return parsed.data;
}

export function downloadJson(result: AnalysisResult) {
  const blob = new Blob([JSON.stringify(result, null, 2)], {
    type: "application/json;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${result.document.fileName.replace(/\.pdf$/i, "")}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
