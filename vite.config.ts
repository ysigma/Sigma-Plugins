import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  // Relative base so the build works whether it's hosted at a domain root or a
  // sub-path (Netlify deploy previews, S3 prefixes, GitHub Pages, etc.).
  base: "./",
  server: {
    // Sigma's "Plugin Dev Playground" points at http://localhost:3000 by default.
    port: 3000,
    host: true,
  },
  preview: {
    port: 3000,
  },
  build: {
    outDir: "dist",
    // react-globe.gl / three produce a large-ish bundle; silence the warning.
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      // Each HTML entry compiles to its own page so multiple Sigma plugins can
      // be hosted from one deploy. Add a new key here to register another.
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        table: fileURLToPath(new URL("./table.html", import.meta.url)),
      },
    },
  },
});
