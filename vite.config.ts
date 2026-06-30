import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";
import fs from "fs";

/**
 * Stamps a unique build id into the service worker at build time.
 *
 * Why this exists: the previous sw.js used a hardcoded CACHE name
 * ("schorahub-v2"). Every deploy produces new content-hashed asset
 * filenames (e.g. index-Dae4NCUj.js), but the *cache name* never
 * changed between deploys — so an already-installed PWA could keep
 * its old cache around indefinitely and, under poor network
 * conditions (the network-first navigation fetch timing out or
 * failing), fall back to a cached index.html that references JS/CSS
 * bundle hashes that no longer exist on the server after a redeploy.
 * That produces a blank screen / instant-close on the very next
 * launch after any update — exactly the reported symptom.
 *
 * This plugin replaces a placeholder token in public/sw.js with a
 * build-unique string (timestamp + random) on every `vite build`,
 * so each deploy automatically gets its own cache namespace and the
 * activate handler's "delete any cache that isn't CACHE" logic
 * guarantees stale shells are purged the moment the new SW activates.
 */
function swBuildIdPlugin() {
  return {
    name: "sw-build-id",
    apply: "build" as const,
    closeBundle() {
      const swPath = path.resolve(__dirname, "dist/sw.js");
      if (!fs.existsSync(swPath)) return;
      const buildId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const contents = fs.readFileSync(swPath, "utf-8");
      const stamped = contents.replace(/BUILD_ID_PLACEHOLDER/g, buildId);
      fs.writeFileSync(swPath, stamped, "utf-8");
    },
  };
}

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    swBuildIdPlugin(),
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  build: {
    target: "es2015",
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            if (id.includes("react-dom") || id.includes("/react/")) return "vendor-react";
            if (id.includes("@supabase")) return "vendor-supabase";
            if (id.includes("@radix-ui")) return "vendor-radix";
            if (id.includes("pdfjs-dist")) return "vendor-pdfjs";
          }
        },
      },
    },
    minify: "esbuild",
    sourcemap: false,
  },
  optimizeDeps: {
    include: ["react", "react-dom", "wouter", "@tanstack/react-query", "@supabase/supabase-js", "lucide-react"],
    exclude: ["pdfjs-dist"],
  },
});
