import { z } from "zod";

const languageCodes = new Set(
  "aa ab ae af ak am an ar as av ay az ba be bg bh bi bm bn bo br bs ca ce ch co cr cs cu cv cy da de dv dz ee el en eo es et eu fa ff fi fj fo fr fy ga gd gl gn gu gv ha he hi ho hr ht hu hy hz ia id ie ig ii ik io is it iu ja jv ka kg ki kj kk kl km kn ko kr ks ku kv kw ky la lb lg li ln lo lt lu lv mg mh mi mk ml mn mr ms mt my na nb nd ne ng nl nn no nr nv ny oc oj om or os pa pi pl ps pt qu rm rn ro ru rw sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw ta te tg th ti tk tl tn to tr ts tt tw ty ug uk ur uz ve vi vo wa wo xh yi yo za zh zu".split(
    " ",
  ),
);
const currencies = new Set(Intl.supportedValuesOf("currency"));
const date = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}, "Data musi być rzeczywistą datą w formacie RRRR-MM-DD");
const text = z.string().trim().min(1).max(2000);
const sentenceCount = (value: string) =>
  [
    ...new Intl.Segmenter(undefined, { granularity: "sentence" }).segment(
      value,
    ),
  ].filter((part) => part.segment.trim().length > 0).length;

export const resultSchema = z
  .object({
    document: z
      .object({
        fileName: z.string().min(1).max(255),
        pages: z.number().int().min(1).max(100),
        language: z
          .string()
          .refine((value) => languageCodes.has(value))
          .nullable(),
        type: z.enum(["faktura", "umowa", "oferta", "raport", "inne"]),
        title: text.nullable(),
        date: date.nullable(),
      })
      .strict(),
    summary: text.refine((value) => {
      const count = sentenceCount(value);
      return count >= 3 && count <= 5;
    }, "Podsumowanie musi zawierać 3–5 zdań"),
    keyPoints: z.array(text).min(3).max(7),
    entities: z
      .object({
        organizations: z.array(text).max(100),
        people: z.array(text).max(100),
      })
      .strict(),
    amounts: z
      .array(
        z
          .object({
            value: z.number().finite(),
            currency: z
              .string()
              .refine((value) => currencies.has(value))
              .nullable(),
            context: text,
          })
          .strict(),
      )
      .max(100),
    dates: z.array(z.object({ date, context: text }).strict()).max(100),
    keywords: z.array(text).max(100),
    analysis: z
      .object({
        missingPages: z.array(z.number().int().positive()).max(100),
        ocrPages: z.array(z.number().int().positive()).max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export type AnalysisResult = z.infer<typeof resultSchema>;
