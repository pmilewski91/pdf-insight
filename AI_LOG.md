# AI log — PDF Insight

W tym dokumencie opisuję, jak korzystałem z AI podczas realizacji projektu, jakie decyzje podjąłem oraz jak weryfikowałem rozwiązanie. Szczegóły architektury i uruchomienia znajdują się w [dokumentacji projektu](./DOKUMENTACJA.md) oraz [README](./README.md).

## Narzędzie i podział odpowiedzialności

Do pracy nad projektem korzystałem z **GitHub Copilot w VS Code**. (W normalnych warunkach użyłbym Claude lub Codexa, ale aktualnie nie mam dostępu). Asystent pomógł mi przeanalizować brief i plan, zaproponować rozwiązania, przygotować kod, testy i dokumentację oraz zdiagnozować problemy. Korzystał również z narzędzi do uruchamiania testów, budowania aplikacji i sprawdzania działania w przeglądarce.

Sam określałem wymagania i podejmowałem decyzje dotyczące kierunku projektu, dostawcy AI, wdrożenia, OCR i historii analiz. Podłączyłem backend w Vercel, opublikowałem kod oraz przetestowałem aplikację na przygotowanym dokumencie. Zależy mi na zrozumieniu i weryfikacji kodu oraz wyników powstałych z pomocą AI.

## Przykładowe rzeczywiste instrukcje

Poniższe cytaty to moje instrukcje z rozmowy, pokazujące kolejne etapy pracy:

1. **Analiza zadania:** „Przeanalizuj plan działania PLAN_PDF_INSIGHT.md i dane, które przygotowałem.”
2. **Wybór dostawcy:** „jeśli chodzi o dostawce API AI wybiorę api z aistudio.google.com utworzyłem tam już klucz.”
3. **Implementacja i kontrola postępów:** „Chcę, abyś zaczął wdrażać aplikację. Jeśli będziesz czegoś potrzebował ode mnie to pytaj. Jeśli wdrożysz rozwiązanie i sprawdzisz zaznacz to w planie, że wykonane”


## Najważniejsze decyzje

| Obszar | Decyzja i uzasadnienie |
|---|---|
| Analiza AI | Wybrałem darmowy Gemini API. Klucz jest przechowywany po stronie backendu, a nie we frontendzie. |
| Wdrożenie | Zdecydowałem się na publikację frontendu przez GitHub Pages i backendu jako Vercel Function. Podłączyłem backend i opublikowałem kod. |
| OCR | Początkowo pierwsza wersja nie miała OCR. Po przetestowaniu dokumentu i omówieniu rozwiązania zdecydowałem się na opcjonalne rozpoznawanie skanów. OCR działa w przeglądarce i jest domyślnie wyłączony. |
| Historia | Wybrałem automatyczne zapisywanie pięciu ostatnich wyników lokalnie w przeglądarce, z możliwością ich otwarcia i usunięcia.
| Prywatność | Oryginalny PDF nie jest wysyłany do backendu, ale odczytany tekst trafia do Gemini po wyrażeniu zgody. Lokalna historia przechowuje wyniki, które mogą zawierać dane wrażliwe. |

## Przykłady problemów i poprawek

### Test PDF.js w środowisku Node

Pierwszy test walidacji PDF próbował importować PDF.js w środowisku Node, w którym brakowało `DOMMatrix`. Test nie startował. Walidację pliku wydzielono do osobnego modułu, który można przetestować bez renderowania PDF; właściwy odczyt sprawdzono w przeglądarce.

### Konfiguracja wdrożenia Vercel

Podczas wdrożenia backendu Vercel zgłaszał brak katalogu wyjściowego `public`. Z pomocą Copilota poprawiono konfigurację projektu backendu, dodano wskazany katalog i sprawdzono build funkcji lokalnie. Następnie ponownie wdrożyłem backend.

### Zasoby językowe OCR

Podczas testów wykryto, że przy niedostępnym polskim modelu OCR silnik mógł kontynuować pracę z samym modelem angielskim. Dodano sprawdzenie odpowiedzi i podstawowego formatu obu plików językowych przed uruchomieniem OCR oraz test sytuacji, w której serwer zwraca stronę HTML zamiast modelu.

