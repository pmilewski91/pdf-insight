# PDF Insight

Aplikacja do podsumowania PDF i eksportu danych do JSON. Interfejs: React, TypeScript, Vite i PDF.js. Analizę wykonuje Gemini przez Vercel Function; klucz nie trafia do przeglądarki.

**Demo:** https://pmilewski91.github.io/pdf-insight/ — będzie dostępne po skonfigurowaniu i wdrożeniu opisanym poniżej. Adres API zostanie ustalony podczas wdrożenia Vercel.

![Ekran początkowy aplikacji](docs/screenshot.png)

## Jak to działa

1. Przeglądarka sprawdza plik PDF (maks. 10 MB) i odczytuje tekst poszczególnych stron.
2. Przed wysłaniem tekstu użytkownik otrzymuje informację o przetwarzaniu przez Gemini i wyraża zgodę. Strony bez tekstu są wyraźnie wskazywane; informacja o nich znajduje się też w `analysis.missingPages` w wyniku.
3. Backend waliduje żądanie, sprawdza limit instancji i wysyła tekst do Gemini z osobną instrukcją systemową. Odpowiedź jest walidowana w Zod; niepoprawna odpowiedź jest ponawiana dokładnie raz.
4. Przeglądarka ponownie waliduje dane, wyświetla je i pozwala pobrać ten sam wynik w JSON. Nazwę i liczbę stron określa aplikacja, nie model.

Kod nie zapisuje dokumentów ani wyników na serwerze. To nie jest gwarancja dotycząca logów, retencji lub przetwarzania u Vercel i Google. W darmowym planie Google może wykorzystywać treści do ulepszania swoich produktów: zobacz [cennik Gemini](https://ai.google.dev/gemini-api/docs/pricing) i [warunki Gemini API](https://ai.google.dev/gemini-api/terms). Nie przesyłaj dokumentów poufnych ani danych osobowych bez prawa i zgody na takie przetwarzanie.

## Ważne ograniczenia

- Brak OCR: strona zawierająca jedynie obraz nie zostanie odczytana. Sama obecność niewielkiej ilości tekstu nie gwarantuje, że obrazy na stronie zostały odczytane.
- Maksimum to 100 stron i 150 000 znaków tekstu. Dłuższy dokument zostaje odrzucony; dzielenie i historia nie zostały wdrożone.
- Analiza AI może być niepoprawna, także mimo instrukcji chroniącej przed manipulacją w dokumencie. Istotne dane należy sprawdzić w oryginale. Czas poniżej 30 sekund nie jest gwarantowany.
- Limit 5 wywołań Gemini na minutę i 40 na dobę dotyczy **każdej instancji funkcji osobno**. Reset instancji lub równoległe instancje go omijają. CORS nie jest uwierzytelnianiem. Odpowiedź 429 Gemini jest sygnalizowana w interfejsie. To **nie jest globalny limit ani zabezpieczenie budżetu**. Weryfikuj darmowy plan i brak aktywnych rozliczeń w Google; przy płatnym planie nie publikuj tego API bez skutecznego współdzielonego limitowania i ochrony kosztów. Jeśli limity dostawcy się wyczerpią, demo może przestać działać.
- Publiczne demo i rzeczywista integracja z Gemini wymagają konfiguracji kont oraz testów po wdrożeniu.

## Uruchomienie lokalne

Wymagany Node.js 22 lub nowszy i npm. Frontend importuje wspólny schemat z `backend/lib`, dlatego zależności instalujemy w obu katalogach:

```bash
npm ci --prefix backend
npm ci --prefix frontend
cp frontend/.env.example frontend/.env
cp backend/.env.example backend/.env
```

W `frontend/.env` ustaw publiczny adres lokalnego API, np. `VITE_API_URL=http://localhost:3000`. Dla lokalnej funkcji skonfiguruj `backend/.env`; można uruchomić Vercel CLI w katalogu `backend` poleceniem `vercel dev` po wcześniejszej instalacji i zalogowaniu. Dla local dev dopisz `http://localhost:5173` do `ALLOWED_ORIGINS`. Frontend uruchom poleceniem `npm run dev --prefix frontend`, a następnie otwórz wskazany przez Vite adres.

Testy i kontrola:

```bash
npm run lint --prefix backend && npm run lint --prefix frontend
npm run format:check --prefix backend && npm run format:check --prefix frontend
npm test --prefix backend && npm test --prefix frontend
npm run build --prefix backend && npm run build --prefix frontend
```

## Wdrożenie

1. W AI Studio sprawdź, czy projekt klucza ma **Free Tier**, brak płatnego rozliczenia i czy wybrany model jest dostępny na koncie. Cennik Google na 10.11.2026 pokazuje Free Tier dla `gemini-3.5-flash-lite`; dostępność i limity mogą się zmienić. Nie wpisuj klucza do repozytorium ani czatu.
2. W Vercel zaimportuj repozytorium i ustaw **Root Directory** na `backend`. Plik `backend/vercel.json` wybiera preset Other, polecenie sprawdzające TypeScript i katalog wyjściowy `backend/public`; funkcja znajduje się w `backend/api`. W Project Settings → Environment Variables dodaj:
   - `GEMINI_API_KEY` — sekret z AI Studio;
   - `GEMINI_MODEL` — np. `gemini-3.5-flash-lite`, jeśli jest dostępny w Twoim darmowym planie;
   - `FREE_TIER_CONFIRMED` — `true` dopiero po osobistym sprawdzeniu planu i rozliczeń; to deklaracja administratora, nie automatyczna kontrola Google;
   - `ALLOWED_ORIGINS` — `https://pmilewski91.github.io` (dokładny origin, bez ukośnika na końcu).
3. Wdróż backend. Ustal jego publiczny adres HTTPS, np. `https://twoj-projekt.vercel.app`. Nie wpisuj w zmiennej ścieżki `/api/analyze`.
4. W GitHub → Settings → Secrets and variables → Actions → Variables dodaj **publiczną** zmienną repozytorium `VITE_API_URL` z tym adresem. To nie jest miejsce na klucz API.
5. W GitHub → Settings → Pages wybierz źródło **GitHub Actions**. Uruchom ponownie workflow `Test and deploy` z zakładki Actions (pierwszy przebieg bez `VITE_API_URL` celowo zakończy się błędem). Workflow instaluje zależności, sprawdza lint/format/testy/build i publikuje `frontend/dist`.
6. Przetestuj demo bez logowania, z niesensytywnym PDF: weryfikacja analizy, błędów, pobranego JSON, CORS i czasu, a także zachowania po wyczerpaniu limitów. Monitoruj dostępność przez co najmniej 14 dni.

Sekrety lokalne (`.env`) są ignorowane przez Git. Przed publikacją lub udostępnieniem repozytorium zawsze sprawdź historię i zawartość plików.
