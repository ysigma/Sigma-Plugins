import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

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
    // Multi-page build: each plugin is its own HTML entry point and gets its own
    // sub-path URL once published (Sigma loads each plugin from a distinct URL).
    //   /                -> 3D Globe          (src/main.tsx)
    //   /segmented-bar/  -> Segmented Bar Meter (segmented-bar/main.tsx)
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL("./index.html", import.meta.url)),
        segmentedBar: fileURLToPath(new URL("./segmented-bar/index.html", import.meta.url)),
      },
    },
  },
});
