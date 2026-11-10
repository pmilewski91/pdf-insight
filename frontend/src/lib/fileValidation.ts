export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function validatePdfFile(file: File): Promise<Uint8Array> {
  if (
    !file.name.toLowerCase().endsWith(".pdf") ||
    (file.type && file.type !== "application/pdf")
  ) {
    throw new Error("Wybierz plik w formacie PDF.");
  }
  if (file.size === 0) throw new Error("Plik jest pusty.");
  if (file.size > MAX_FILE_SIZE)
    throw new Error("Plik przekracza limit 10 MB.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-")
    throw new Error("Plik nie jest poprawnym dokumentem PDF.");
  return bytes;
}
