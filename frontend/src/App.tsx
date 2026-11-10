import { useRef, useState, type ChangeEvent, type DragEvent } from "react";
import Result from "./components/Result";
import { analyzePdf } from "./lib/api";
import { extractPdf, type ExtractedPdf } from "./lib/pdf";
import { resultSchema, type AnalysisResult } from "../../backend/lib/schema";

export default function App() {
  const [pdf, setPdf] = useState<ExtractedPdf | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [consent, setConsent] = useState(false);
  const [ocrEnabled, setOcrEnabled] = useState(false);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<File | null>(null);
  const busyRef = useRef(false);

  async function selectFile(file: File | undefined, useOcr = ocrEnabled) {
    if (!file || busyRef.current) return;
    busyRef.current = true;
    fileRef.current = file;
    setPdf(null);
    setResult(null);
    setError("");
    setConsent(false);
    setBusy("Odczytujemy dokument…");
    try {
      setPdf(await extractPdf(file, { ocr: useOcr, onProgress: setBusy }));
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Nie udało się odczytać dokumentu.",
      );
    } finally {
      busyRef.current = false;
      setBusy("");
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setDragging(false);
    if (event.dataTransfer.files.length > 1) {
      setError("Wybierz jeden plik PDF.");
      return;
    }
    void selectFile(event.dataTransfer.files[0]);
  }

  async function runAnalysis() {
    if (!pdf || !consent || busyRef.current) return;
    busyRef.current = true;
    setBusy("Analizujemy dokument z pomocą AI…");
    setError("");
    setResult(null);
    try {
      const data = await analyzePdf(pdf);
      setResult(
        resultSchema.parse({
          ...data,
          analysis: { missingPages: pdf.missingPages, ocrPages: pdf.ocrPages },
        }),
      );
    } catch (issue) {
      setError(
        issue instanceof Error
          ? issue.message
          : "Nie udało się przeprowadzić analizy.",
      );
    } finally {
      busyRef.current = false;
      setBusy("");
    }
  }

  return (
    <main className="page">
      <header className="top">
        <a href={import.meta.env.BASE_URL} className="brand">
          <span className="brand-icon">P</span> PDF Insight
        </a>
        <span className="top-label">PROSTO Z DOKUMENTU</span>
      </header>
      <section className="intro">
        <p className="eyebrow">
          <span className="sparkle">✦</span> TWÓJ DOKUMENT, JAŚNIEJ
        </p>
        <h1>
          Mniej czytania.
          <br />
          <span>Więcej zrozumienia.</span>
        </h1>
        <p>
          Wgraj dokument PDF, a AI przygotuje podsumowanie i uporządkuje
          najważniejsze informacje.
        </p>
      </section>
      <section className="upload card" aria-label="Wybór dokumentu">
        <label
          className={`dropzone ${dragging ? "dragging" : ""} ${busy ? "disabled" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            if (!busy) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,application/pdf"
            disabled={!!busy}
            onChange={(event: ChangeEvent<HTMLInputElement>) =>
              void selectFile(event.target.files?.[0])
            }
          />
          <span className="upload-icon" aria-hidden="true">
            ↑
          </span>
          <strong>Przeciągnij PDF tutaj</strong>
          <span>
            lub <span className="link">wybierz plik z urządzenia</span>
          </span>
          <small>Jeden plik PDF · maksymalnie 10 MB</small>
        </label>
        <label className="consent ocr-option">
          <input
            type="checkbox"
            checked={ocrEnabled}
            disabled={!!busy}
            onChange={(event) => {
              const enabled = event.target.checked;
              setOcrEnabled(enabled);
              if (fileRef.current) void selectFile(fileRef.current, enabled);
            }}
          />
          <span>
            <strong>Włącz OCR dla stron bez tekstu</strong>
            <br />
            Rozpoznawanie skanów po polsku i angielsku w przeglądarce może
            potrwać. Rozpoznany tekst zostanie wysłany do Gemini po wyrażeniu
            zgody.
          </span>
        </label>
        {pdf && (
          <div className="selected">
            <div className="file-line">
              <span className="file-icon">PDF</span>
              <div>
                <strong>{pdf.fileName}</strong>
                <p className="muted small">
                  {pdf.pages} stron · tekst odczytany
                </p>
              </div>
            </div>
            {pdf.missingPages.length > 0 && (
              <div className="notice warning" role="status">
                <strong>Niepełna analiza.</strong> Strony bez tekstu:{" "}
                {pdf.missingPages.join(", ")}. Ich treść zostanie pominięta.
                {!ocrEnabled && " Włącz OCR, aby spróbować odczytać skany."}
              </div>
            )}
            {pdf.ocrPages.length > 0 && (
              <div className="notice warning" role="status">
                OCR odczytał strony: {pdf.ocrPages.join(", ")}. Rozpoznawanie
                może zawierać błędy — sprawdź ważne informacje w oryginale.
              </div>
            )}
            <div className="notice privacy">
              <strong>Twoja prywatność</strong>
              <br />
              Tekst dokumentu zostanie wysłany do Google Gemini przez nasze API.
              W darmowym planie Google może wykorzystywać treść do ulepszania
              swoich produktów. Nie wysyłaj dokumentów poufnych ani danych
              osobowych bez odpowiedniej zgody. Warunki Google i Vercel mogą się
              zmieniać.
            </div>
            <label className="consent">
              <input
                type="checkbox"
                checked={consent}
                disabled={!!busy}
                onChange={(event) => setConsent(event.target.checked)}
              />{" "}
              Rozumiem i zgadzam się na przesłanie tekstu do Gemini.
            </label>
            <button
              className="primary analyze-button"
              disabled={!consent || !!busy}
              onClick={() => void runAnalysis()}
            >
              Analizuj dokument <span>→</span>
            </button>
          </div>
        )}
        {busy && (
          <p className="status" role="status">
            <span className="spinner" />
            {busy}
          </p>
        )}
        {error && (
          <div className="notice error" role="alert">
            {error}
            {pdf && !busy && (
              <button
                className="retry"
                onClick={() => void runAnalysis()}
                disabled={!consent}
              >
                Spróbuj ponownie
              </button>
            )}
          </div>
        )}
      </section>
      {result ? (
        <Result result={result} />
      ) : (
        <section className="features" aria-label="Jak to działa">
          <div>
            <span>01</span>
            <strong>Wybierz dokument</strong>
            <p>Dodaj PDF z tekstem lub włącz OCR dla skanów.</p>
          </div>
          <div>
            <span>02</span>
            <strong>Poznaj najważniejsze</strong>
            <p>AI wyciągnie sedno z treści.</p>
          </div>
          <div>
            <span>03</span>
            <strong>Wykorzystaj dane</strong>
            <p>Pobierz uporządkowany JSON.</p>
          </div>
        </section>
      )}
      <footer>
        PDF Insight <span>·</span> Czytaj mniej, rozumiej więcej.
      </footer>
    </main>
  );
}
