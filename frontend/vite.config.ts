import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "/pdf-insight/",
  plugins: [react()],
  server: { fs: { allow: [".."] } },
});
