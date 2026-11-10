import type { HistoryEntry } from "../lib/history";

type Props = {
  entries: HistoryEntry[];
  error: string;
  busy: boolean;
  onOpen: (entry: HistoryEntry) => void;
  onDelete: (id: string) => void;
  onClear: () => void;
};

export default function History({
  entries,
  error,
  busy,
  onOpen,
  onDelete,
  onClear,
}: Props) {
  return (
    <section className="history card" aria-labelledby="history-title">
      <div className="history-heading">
        <div>
          <h2 id="history-title">Historia analiz</h2>
          <p>
            Ostatnie 5 wyników zapisuje się automatycznie w tej przeglądarce na
            tym urządzeniu. Wyniki mogą zawierać dane wrażliwe i są dostępne
            osobom korzystającym z tego profilu przeglądarki. Możesz je usunąć.
            PDF i pełny odczytany tekst nie są zapisywane w historii.
          </p>
        </div>
        {(entries.length > 0 || error) && (
          <button className="history-clear" disabled={busy} onClick={onClear}>
            Usuń całą historię
          </button>
        )}
      </div>
      {error && (
        <div className="notice error" role="alert">
          {error}
        </div>
      )}
      {!entries.length && !error && (
        <p className="muted small">Nie masz jeszcze zapisanych analiz.</p>
      )}
      {entries.length > 0 && (
        <ul className="history-list">
          {entries.map((entry) => (
            <li key={entry.id}>
              <div className="history-item">
                <strong>
                  {entry.result.document.title ??
                    entry.result.document.fileName}
                </strong>
                <span className="muted small">
                  {entry.result.document.fileName} ·{" "}
                  {new Intl.DateTimeFormat("pl-PL", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }).format(new Date(entry.savedAt))}
                </span>
              </div>
              <div className="history-actions">
                <button disabled={busy} onClick={() => onOpen(entry)}>
                  Otwórz
                  <span className="sr-only">
                    {" "}
                    {entry.result.document.fileName}
                  </span>
                </button>
                <button disabled={busy} onClick={() => onDelete(entry.id)}>
                  Usuń
                  <span className="sr-only">
                    {" "}
                    {entry.result.document.fileName}
                  </span>
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
