import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

const entry = (p: string) => fileURLToPath(new URL(p, import.meta.url));

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
      // Each plugin is its own page/URL. The globe stays at index.html; the
      // Apdex badge builds to apdex.html. Register each with Sigma separately.
      input: {
        main: entry("./index.html"),
        apdex: entry("./apdex.html"),
      },
    },
  },
});
