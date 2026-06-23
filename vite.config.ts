import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

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
      // Multi-page build: each plugin is its own HTML entry, so each gets its
      // own URL when hosted (e.g. GitHub Pages):
      //   index.html  -> 3D globe choropleth          ( /  )
      //   saudi.html  -> Saudi Arabia 3D regions map  ( /saudi.html )
      input: {
        main: resolve(__dirname, "index.html"),
        saudi: resolve(__dirname, "saudi.html"),
      },
    },
  },
});
