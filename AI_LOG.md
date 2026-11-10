# AI log

## Narzędzie i sposób użycia

Copilot w VS Code pomógł w analizie briefu, projektowaniu rozwiązania, napisaniu aplikacji oraz testów. Decyzje o dostawcy AI, rezygnacji z OCR i zewnętrznego licznika podjął użytkownik. Kod i rezultat wymagają weryfikacji przez osobę oddającą zadanie.

## Rzeczywiste instrukcje użytkownika

1. „Przeanalizuj plan działania PLAN_PDF_INSIGHT.md i dane, które przygotowałem.”
2. „jeśli chodzi o dostawce API AI wybiorę api z aistudio.google.com utworzyłem tam już klucz.”
3. „jak utworzymy backend dla vercela i wrzucimy na githuba w vercelu podeptnę to.”
4. „Chcę, abyś zaczął wdrażać aplikację. Jeśli będziesz czegoś potrzebował ode mnie to pytaj. Jeśli wdrożysz rozwiązanie i sprawdzisz zaznacz to w planie, że wykonane”
5. „Nie znam limitów, wolę ominąć Upstash. Wolałbym, aby ustalić jakiś limit w backendzie (jeśli się da), albo zrobić mechanizm, że jeśli z api dostaniemy odpowiedź, że limity osiągnięte to wyświetlimy taki komunikat na stronie?”

## Przykład pomyłki i poprawki

Pierwszy test walidacji PDF próbował importować PDF.js w środowisku Node, w którym brakowało `DOMMatrix`. Test nie startował. Walidację pliku wydzielono do osobnego modułu, który można przetestować bez renderowania PDF; właściwy odczyt sprawdzono w przeglądarce. Nie oznacza to przetestowania prawdziwej odpowiedzi Gemini.
