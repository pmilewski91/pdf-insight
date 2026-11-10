# AI log — PDF Insight

W tym dokumencie opisuję, jak korzystałem z AI podczas realizacji projektu, jakie decyzje podjąłem oraz jak weryfikowałem rozwiązanie. Szczegóły architektury i uruchomienia znajdują się w [dokumentacji projektu](./DOKUMENTACJA.md) oraz [README](./README.md).

## Narzędzie i podział odpowiedzialności

Do pracy nad projektem korzystałem z **GitHub Copilot w VS Code**. Asystent pomógł mi przeanalizować brief i plan, zaproponować rozwiązania, przygotować kod, testy i dokumentację oraz zdiagnozować problemy. Korzystał również z narzędzi do uruchamiania testów, budowania aplikacji i sprawdzania działania w przeglądarce.

Sam określałem wymagania i podejmowałem decyzje dotyczące kierunku projektu, dostawcy AI, wdrożenia, OCR i historii analiz. Podłączyłem backend w Vercel, opublikowałem kod oraz przetestowałem aplikację na przygotowanym dokumencie. Zależy mi na zrozumieniu i weryfikacji kodu oraz wyników powstałych z pomocą AI.

## Przykładowe rzeczywiste instrukcje

Poniższe cytaty to moje instrukcje z rozmowy, pokazujące kolejne etapy pracy:

1. **Analiza zadania:** „Przeanalizuj plan działania PLAN_PDF_INSIGHT.md i dane, które przygotowałem.”
2. **Wybór dostawcy:** „jeśli chodzi o dostawce API AI wybiorę api z aistudio.google.com utworzyłem tam już klucz.”
3. **Implementacja i kontrola postępów:** „Chcę, abyś zaczął wdrażać aplikację. Jeśli będziesz czegoś potrzebował ode mnie to pytaj. Jeśli wdrożysz rozwiązanie i sprawdzisz zaznacz to w planie, że wykonane”
4. **Opcjonalne OCR:** „Ok, a co ty na to, aby to wprowadzić i dodatkowo na frontendzie dodać opcję "checkbox" aktywowania OCR?”
5. **Historia analiz:**

   > Chciałbym wdrożyć:  
   > "Historia analiz  
   > Ostatnie wyniki zapisane lokalnie w przeglądarce."

   Następnie zdecydowałem o automatycznym zapisie i limicie pięciu ostatnich analiz.

## Najważniejsze decyzje

| Obszar | Decyzja i uzasadnienie |
|---|---|
| Analiza AI | Wybrałem Gemini API. Klucz jest przechowywany po stronie backendu, a nie we frontendzie. |
| Wdrożenie | Zdecydowałem się na publikację frontendu przez GitHub Pages i backendu jako Vercel Function. Podłączyłem backend i opublikowałem kod. |
| OCR | Początkowo pierwsza wersja nie miała OCR. Po przetestowaniu dokumentu i omówieniu rozwiązania zdecydowałem się na opcjonalne rozpoznawanie skanów. OCR działa w przeglądarce i jest domyślnie wyłączony. |
| Historia | Wybrałem automatyczne zapisywanie pięciu ostatnich wyników lokalnie w przeglądarce, z możliwością ich otwarcia i usunięcia. Implementację i testy wykonano lokalnie; po publikacji pozostaje sprawdzić tę funkcję w publicznym demo. |
| Ograniczanie wywołań | Zrezygnowałem z zewnętrznego licznika. Limit w pamięci dotyczy pojedynczej instancji funkcji i **nie stanowi globalnego zabezpieczenia kosztów**. |
| Prywatność | Oryginalny PDF nie jest wysyłany do backendu, ale odczytany tekst trafia do Gemini po wyrażeniu zgody. Lokalna historia przechowuje wyniki, które mogą zawierać dane wrażliwe. |

## Przykłady problemów i poprawek

### Test PDF.js w środowisku Node

Pierwszy test walidacji PDF próbował importować PDF.js w środowisku Node, w którym brakowało `DOMMatrix`. Test nie startował. Walidację pliku wydzielono do osobnego modułu, który można przetestować bez renderowania PDF; właściwy odczyt sprawdzono w przeglądarce.

### Konfiguracja wdrożenia Vercel

Podczas wdrożenia backendu Vercel zgłaszał brak katalogu wyjściowego `public`. Z pomocą Copilota poprawiono konfigurację projektu backendu, dodano wskazany katalog i sprawdzono build funkcji lokalnie. Następnie ponownie wdrożyłem backend.

### Zasoby językowe OCR

Podczas testów wykryto, że przy niedostępnym polskim modelu OCR silnik mógł kontynuować pracę z samym modelem angielskim. Dodano sprawdzenie odpowiedzi i podstawowego formatu obu plików językowych przed uruchomieniem OCR oraz test sytuacji, w której serwer zwraca stronę HTML zamiast modelu. Jest to kontrola zasobów, a nie gwarancja bezbłędnego rozpoznania tekstu.

## Co sprawdzono i czego to nie dowodzi

- **Aplikacja i AI:** z pomocą Copilota lokalnie uruchomiono testy, lint i build. Publiczny frontend połączył się z backendem i Gemini na fikcyjnym dokumencie. Przetestowałem również własny dokument oraz pobrałem JSON.
- **OCR:** lokalnie sprawdzono rozpoznawanie strony 11 dokumentu testowego i obsługę dokumentu będącego skanem. Po publikacji sprawdzono OCR na fikcyjnym skanie w publicznym frontendzie, używając atrapy backendu. Jakość odczytu aneksu i jego wpływ na rzeczywistą analizę wymagają dalszej weryfikacji.
- **Historia:** lokalnie sprawdzono limit pięciu wyników, otwieranie po odświeżeniu, eksport, usuwanie i komunikat błędu zapisu. Test przeglądarkowy korzystał z fikcyjnego PDF-a i atrapy API.
- **Ograniczenia:** poprawny wynik jednego testu nie dowodzi odporności na wszystkie prompt injection ani poprawności każdej analizy. AI i OCR mogą popełniać błędy; ważne informacje należy porównać z oryginałem.

W testach z atrapą API dokument nie był przesyłany do Gemini. Szczegółowe ograniczenia prywatności, kosztów i działania aplikacji opisano w [README](./README.md).
