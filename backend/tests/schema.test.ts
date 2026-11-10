import { describe, expect, it } from "vitest";
import { resultSchema } from "../lib/schema.js";

export const validResult = {
  document: {
    fileName: "test.pdf",
    pages: 2,
    language: "pl",
    type: "umowa",
    title: null,
    date: "2024-02-29",
  },
  summary: "To jest umowa. Dotyczy usług. Zawarto ją w lutym.",
  keyPoints: ["Umowa o usługi", "Zawarta w lutym", "Dwie strony"],
  entities: { organizations: [], people: [] },
  amounts: [{ value: 123.45, currency: "PLN", context: "Wynagrodzenie" }],
  dates: [{ date: "2024-02-29", context: "Podpisanie" }],
  keywords: [],
};

describe("result schema", () => {
  it("accepts a complete result, empty arrays and nullable fields", () => {
    expect(resultSchema.safeParse(validResult).success).toBe(true);
    expect(
      resultSchema.safeParse({
        ...validResult,
        document: { ...validResult.document, language: null, date: null },
        amounts: [],
      }).success,
    ).toBe(true);
  });
  it.each([
    ["missing fields", { ...validResult, keywords: undefined }],
    [
      "invalid date",
      {
        ...validResult,
        document: { ...validResult.document, date: "2025-02-29" },
      },
    ],
    [
      "invalid language",
      { ...validResult, document: { ...validResult.document, language: "zz" } },
    ],
    [
      "invalid currency",
      {
        ...validResult,
        amounts: [{ value: 1, currency: "XYZ", context: "x" }],
      },
    ],
    [
      "string amount",
      {
        ...validResult,
        amounts: [{ value: "1", currency: "PLN", context: "x" }],
      },
    ],
    ["too few sentences", { ...validResult, summary: "Jedno zdanie." }],
    ["too few points", { ...validResult, keyPoints: ["jeden"] }],
  ])("rejects %s", (_description, value) => {
    expect(resultSchema.safeParse(value).success).toBe(false);
  });
});
