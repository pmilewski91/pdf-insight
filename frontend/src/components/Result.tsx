import { downloadJson } from "../lib/api";
import type { AnalysisResult } from "../../../backend/lib/schema";

type Props = { result: AnalysisResult };

export default function Result({ result }: Props) {
  const { document, entities, amounts, dates } = result;
  return (
    <section className="result" aria-labelledby="result-title">
      <div className="result-heading">
        <div>
          <p className="eyebrow">ANALIZA GOTOWA</p>
          <h2 id="result-title">{document.title ?? document.fileName}</h2>
          <p className="muted">
            {document.fileName} · {document.pages} stron · {document.type} ·{" "}
            {document.language ?? "język nieznany"}
          </p>
        </div>
        <button className="primary" onClick={() => downloadJson(result)}>
          Pobierz JSON ↓
        </button>
      </div>
      {result.analysis && result.analysis.missingPages.length > 0 && (
        <div className="notice warning" role="status">
          Wynik jest niepełny: bez tekstu na stronach{" "}
          {result.analysis.missingPages.join(", ")}. Ich treść została
          pominięta.
        </div>
      )}
      {!!result.analysis?.ocrPages?.length && (
        <div className="notice warning" role="status">
          Strony odczytane przez OCR: {result.analysis.ocrPages.join(", ")}. OCR
          może popełniać błędy — sprawdź ważne informacje w oryginale.
        </div>
      )}
      <div className="result-grid">
        <article className="card">
          <h3>Podsumowanie</h3>
          <p>{result.summary}</p>
          <h3>Najważniejsze informacje</h3>
          <ul>
            {result.keyPoints.map((point, index) => (
              <li key={index}>{point}</li>
            ))}
          </ul>
        </article>
        <article className="card">
          <h3>Informacje z dokumentu</h3>
          <dl>
            <dt>Data dokumentu</dt>
            <dd>{document.date ?? "Nie podano"}</dd>
            <dt>Organizacje</dt>
            <dd>{entities.organizations.join(", ") || "Nie podano"}</dd>
            <dt>Osoby</dt>
            <dd>{entities.people.join(", ") || "Nie podano"}</dd>
            <dt>Kwoty</dt>
            <dd>
              {amounts.length
                ? amounts.map((amount, index) => (
                    <div key={index}>
                      {amount.value} {amount.currency ?? ""} — {amount.context}
                    </div>
                  ))
                : "Nie podano"}
            </dd>
            <dt>Daty</dt>
            <dd>
              {dates.length
                ? dates.map((item, index) => (
                    <div key={index}>
                      {item.date} — {item.context}
                    </div>
                  ))
                : "Nie podano"}
            </dd>
            <dt>Słowa kluczowe</dt>
            <dd>{result.keywords.join(", ") || "Nie podano"}</dd>
          </dl>
        </article>
      </div>
      <details className="card json">
        <summary>Podgląd danych JSON</summary>
        <pre>{JSON.stringify(result, null, 2)}</pre>
      </details>
      <p className="muted small">
        AI może popełniać błędy. Zweryfikuj ważne informacje w oryginalnym
        dokumencie.
      </p>
    </section>
  );
}
