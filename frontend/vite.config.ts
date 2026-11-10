import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { viteStaticCopy } from "vite-plugin-static-copy";

export default defineConfig({
  base: "/pdf-insight/",
  plugins: [
    react(),
    viteStaticCopy({
      targets: [
        {
          src: "node_modules/tesseract.js/dist/worker.min.js",
          dest: "ocr",
          rename: { stripBase: true },
        },
        {
          src: "node_modules/tesseract.js-core/*.wasm.js",
          dest: "ocr/core",
          rename: { stripBase: true },
        },
        {
          src: "node_modules/@tesseract.js-data/{pol,eng}/4.0.0_best_int/*.gz",
          dest: "ocr/lang",
          rename: { stripBase: true },
        },
      ],
    }),
  ],
  server: { fs: { allow: [".."] } },
});
