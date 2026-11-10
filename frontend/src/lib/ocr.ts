import type { PDFPageProxy } from "pdfjs-dist";
import { createWorker } from "tesseract.js";

const MAX_PIXELS = 12_000_000;
const MAX_DIMENSION = 4096;

export async function createOcr() {
  const base = new URL(`${import.meta.env.BASE_URL}ocr/`, location.origin);
  await Promise.all(
    ["pol", "eng"].map(async (language) => {
      const response = await fetch(
        new URL(`lang/${language}.traineddata.gz`, base),
        { signal: AbortSignal.timeout(60_000) },
      );
      if (!response.ok)
        throw new Error(`OCR language unavailable: ${language}`);
      const data = new Uint8Array(await response.arrayBuffer());
      const gzip = data[0] === 0x1f && data[1] === 0x8b;
      // Some hosts serve .gz with Content-Encoding, so fetch returns raw traineddata.
      const entries =
        data.length >= 4 ? new DataView(data.buffer).getUint32(0, true) : 0;
      const trainedData =
        entries > 0 && entries <= 64 && data.length >= 4 + entries * 8;
      if (!gzip && !trainedData)
        throw new Error(`Invalid OCR language data: ${language}`);
    }),
  );
  let initializing = true;
  let onError: (error: unknown) => void = () => {};
  let timer: ReturnType<typeof setTimeout> | undefined;
  const initializationFailure = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new Error("OCR initialization timed out")),
      60_000,
    );
    onError = (error) => {
      if (initializing) reject(new Error(String(error)));
    };
  });
  const workerPromise = createWorker(["pol", "eng"], 1, {
    workerPath: new URL("worker.min.js", base).href,
    corePath: new URL("core", base).href,
    langPath: new URL("lang", base).href,
    cacheMethod: "none",
    errorHandler: (error) => onError(error),
  });
  let worker: Awaited<typeof workerPromise>;
  try {
    worker = await Promise.race([workerPromise, initializationFailure]);
  } catch (error) {
    void workerPromise.then(
      (lateWorker) => lateWorker.terminate(),
      () => undefined,
    );
    throw error;
  } finally {
    initializing = false;
    clearTimeout(timer);
  }

  return {
    async recognize(page: PDFPageProxy) {
      const original = page.getViewport({ scale: 1 });
      const scale = Math.min(
        2,
        MAX_DIMENSION / original.width,
        MAX_DIMENSION / original.height,
        Math.sqrt(MAX_PIXELS / (original.width * original.height)),
      );
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      try {
        const context = canvas.getContext("2d", { alpha: false });
        if (!context || !canvas.width || !canvas.height)
          throw new Error("Nie można utworzyć obrazu strony.");
        await page.render({ canvas, canvasContext: context, viewport }).promise;
        const result = await worker.recognize(canvas);
        return result.data.text.trim();
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    },
    async terminate() {
      await worker.terminate();
    },
  };
}
