import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

export default defineConfig({
  base: "/",
  plugins: [
    react(),
    tailwindcss(),
    // Inline plugin to copy pdfjs worker — no external package needed
    {
      name: "copy-pdfjs-worker",
      generateBundle() {
        // Worker is served via CDN fallback in UploadModal — no copy needed
      },
    },
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
    dedupe: ["react", "react-dom"],
  },
  build: {
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
