import { resultSchema, type AnalysisResult } from "../../../backend/lib/schema";

export const HISTORY_KEY = "pdf-insight:history:v1";
export const HISTORY_LIMIT = 5;

export type HistoryEntry = {
  id: string;
  savedAt: string;
  result: AnalysisResult;
};

export function readHistory(storage: Storage): HistoryEntry[] {
  const raw = storage.getItem(HISTORY_KEY);
  if (raw === null) return [];

  const data: unknown = JSON.parse(raw);
  if (
    typeof data !== "object" ||
    data === null ||
    !("version" in data) ||
    data.version !== 1 ||
    !("entries" in data) ||
    !Array.isArray(data.entries) ||
    data.entries.length > HISTORY_LIMIT
  ) {
    throw new Error("Nieprawidłowy format historii.");
  }

  const ids = new Set<string>();
  return data.entries.map((entry: unknown) => {
    if (
      typeof entry !== "object" ||
      entry === null ||
      !("id" in entry) ||
      typeof entry.id !== "string" ||
      entry.id.length === 0 ||
      ids.has(entry.id) ||
      !("savedAt" in entry) ||
      typeof entry.savedAt !== "string" ||
      !Number.isFinite(Date.parse(entry.savedAt)) ||
      !("result" in entry)
    ) {
      throw new Error("Nieprawidłowy wpis historii.");
    }
    ids.add(entry.id);
    return {
      id: entry.id,
      savedAt: entry.savedAt,
      result: resultSchema.parse(entry.result),
    };
  });
}

function writeHistory(storage: Storage, entries: HistoryEntry[]) {
  storage.setItem(HISTORY_KEY, JSON.stringify({ version: 1, entries }));
}

export function saveHistory(
  storage: Storage,
  result: AnalysisResult,
): HistoryEntry[] {
  const entries = readHistory(storage);
  const entry: HistoryEntry = {
    id: crypto.randomUUID(),
    savedAt: new Date().toISOString(),
    result: resultSchema.parse(result),
  };
  const updated = [entry, ...entries].slice(0, HISTORY_LIMIT);
  writeHistory(storage, updated);
  return updated;
}

export function deleteHistoryEntry(
  storage: Storage,
  id: string,
): HistoryEntry[] {
  const entries = readHistory(storage);
  const updated = entries.filter((entry) => entry.id !== id);
  writeHistory(storage, updated);
  return updated;
}

export function clearHistory(storage: Storage): void {
  storage.removeItem(HISTORY_KEY);
}
