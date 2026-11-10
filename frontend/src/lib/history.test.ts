import { describe, expect, it, vi } from "vitest";
import type { AnalysisResult } from "../../../backend/lib/schema";
import {
  clearHistory,
  deleteHistoryEntry,
  HISTORY_KEY,
  readHistory,
  saveHistory,
} from "./history";

class MemoryStorage implements Storage {
  private readonly data = new Map<string, string>();
  get length() {
    return this.data.size;
  }
  clear() {
    this.data.clear();
  }
  getItem(key: string) {
    return this.data.get(key) ?? null;
  }
  key(index: number) {
    return [...this.data.keys()][index] ?? null;
  }
  removeItem(key: string) {
    this.data.delete(key);
  }
  setItem(key: string, value: string) {
    this.data.set(key, value);
  }
}

function result(fileName = "umowa.pdf"): AnalysisResult {
  return {
    document: {
      fileName,
      pages: 2,
      language: "pl",
      type: "umowa",
      title: null,
      date: null,
    },
    summary: "To umowa. Opisuje usługi. Kwota wynosi 123 zł.",
    keyPoints: ["Pierwszy", "Drugi", "Trzeci"],
    entities: { organizations: ["Firma"], people: [] },
    amounts: [{ value: 123, currency: "PLN", context: "Usługa" }],
    dates: [],
    keywords: [],
    analysis: { missingPages: [2], ocrPages: [1] },
  };
}

describe("analysis history", () => {
  it("persists a validated result, including OCR metadata, without raw PDF data", () => {
    const storage = new MemoryStorage();
    const saved = saveHistory(storage, result());
    expect(saved).toHaveLength(1);
    expect(readHistory(storage)[0].result).toEqual(result());
    const stored = JSON.parse(storage.getItem(HISTORY_KEY) ?? "");
    expect(Object.keys(stored.entries[0])).toEqual(["id", "savedAt", "result"]);
    expect(stored.entries[0].result).toEqual(result());
  });

  it("retains the five most recent analyses in insertion order", () => {
    const storage = new MemoryStorage();
    for (let i = 1; i <= 6; i++) saveHistory(storage, result(`${i}.pdf`));
    const entries = readHistory(storage);
    expect(entries.map((entry) => entry.result.document.fileName)).toEqual([
      "6.pdf",
      "5.pdf",
      "4.pdf",
      "3.pdf",
      "2.pdf",
    ]);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(5);
  });

  it("removes one result and clears only this application's history key", () => {
    const storage = new MemoryStorage();
    storage.setItem("other", "untouched");
    const first = saveHistory(storage, result("first.pdf"))[0];
    saveHistory(storage, result("second.pdf"));
    expect(deleteHistoryEntry(storage, first.id)).toHaveLength(1);
    expect(readHistory(storage)[0].result.document.fileName).toBe("second.pdf");
    clearHistory(storage);
    expect(readHistory(storage)).toEqual([]);
    expect(storage.getItem("other")).toBe("untouched");
  });

  it.each([
    ["invalid JSON", "{bad json"],
    ["unsupported version", '{"version":2,"entries":[]}'],
    [
      "invalid result",
      '{"version":1,"entries":[{"id":"x","savedAt":"2026-01-01","result":{}}]}',
    ],
    [
      "invalid date",
      '{"version":1,"entries":[{"id":"x","savedAt":"bad","result":{}}]}',
    ],
  ])("rejects %s without overwriting it", (_description, raw) => {
    const storage = new MemoryStorage();
    storage.setItem(HISTORY_KEY, raw);
    expect(() => readHistory(storage)).toThrow();
    expect(() => saveHistory(storage, result())).toThrow();
    expect(storage.getItem(HISTORY_KEY)).toBe(raw);
    clearHistory(storage);
    expect(readHistory(storage)).toEqual([]);
  });

  it("surfaces quota and read errors without losing previous results", () => {
    const storage = new MemoryStorage();
    saveHistory(storage, result("first.pdf"));
    const previous = storage.getItem(HISTORY_KEY);
    vi.spyOn(storage, "setItem").mockImplementation(() => {
      throw new DOMException("Quota exceeded", "QuotaExceededError");
    });
    expect(() => saveHistory(storage, result("second.pdf"))).toThrow();
    expect(storage.getItem(HISTORY_KEY)).toBe(previous);
    vi.spyOn(storage, "getItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    expect(() => readHistory(storage)).toThrow();
  });

  it("surfaces errors when deleting history", () => {
    const storage = new MemoryStorage();
    vi.spyOn(storage, "removeItem").mockImplementation(() => {
      throw new DOMException("Access denied", "SecurityError");
    });
    expect(() => clearHistory(storage)).toThrow();
  });
});
