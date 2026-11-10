import { analyze, AnalysisError, requestSchema } from "../lib/analyze";

const maxBytes = 650_000;
const json = (body: object, status: number, headers: HeadersInit = {}) =>
  Response.json(body, {
    status,
    headers: { "Cache-Control": "no-store", ...headers },
  });

async function readBody(request: Request): Promise<unknown> {
  if (!request.body) throw new AnalysisError(400, "Brak treści żądania.");
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new AnalysisError(413, "Dokument jest zbyt duży do analizy.");
    }
    chunks.push(value);
  }
  const buffer = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    buffer.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(buffer)) as unknown;
  } catch {
    throw new AnalysisError(400, "Niepoprawny format żądania.");
  }
}

export default {
  async fetch(request: Request): Promise<Response> {
    const origin = request.headers.get("origin");
    const allowedOrigins = (
      process.env.ALLOWED_ORIGINS ?? "https://pmilewski91.github.io"
    )
      .split(",")
      .map((item) => item.trim());
    const headers: Record<string, string> = { Vary: "Origin" };
    if (origin && allowedOrigins.includes(origin))
      headers["Access-Control-Allow-Origin"] = origin;
    if (origin && !allowedOrigins.includes(origin))
      return json({ error: "Niedozwolone źródło żądania." }, 403, headers);
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          ...headers,
          "Access-Control-Allow-Methods": "POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }
    if (request.method !== "POST")
      return json({ error: "Niedozwolona metoda." }, 405, headers);
    if (
      !request.headers
        .get("content-type")
        ?.toLowerCase()
        .startsWith("application/json")
    ) {
      return json({ error: "Oczekiwano danych JSON." }, 415, headers);
    }
    const { GEMINI_API_KEY, GEMINI_MODEL, FREE_TIER_CONFIRMED } = process.env;
    if (!GEMINI_API_KEY || !GEMINI_MODEL || FREE_TIER_CONFIRMED !== "true") {
      return json({ error: "Usługa nie jest skonfigurowana." }, 503, headers);
    }
    try {
      const input = requestSchema.safeParse(await readBody(request));
      if (!input.success)
        return json(
          {
            error:
              "Nieprawidłowe dane lub przekroczony limit tekstu (150 000 znaków, 100 stron).",
          },
          400,
          headers,
        );
      const result = await analyze(input.data, {
        apiKey: GEMINI_API_KEY,
        model: GEMINI_MODEL,
      });
      return json(result, 200, headers);
    } catch (error) {
      if (error instanceof AnalysisError)
        return json({ error: error.message }, error.status, headers);
      return json(
        { error: "Wystąpił nieoczekiwany błąd analizy." },
        500,
        headers,
      );
    }
  },
};
