import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import viteCompression from "vite-plugin-compression";
import { visualizer } from "rollup-plugin-visualizer";

// https://vitejs.dev/config/
export default defineConfig(({ mode: _mode }) => ({
  server: {
    host: "0.0.0.0",
    port: 8080,
  },
  plugins: [
    react(),
    // Gzip compression for production builds
    viteCompression({
      algorithm: "gzip",
      threshold: 10240, // Only compress files > 10KB
    }),
    // Bundle analysis (run with ANALYZE=true npm run build)
    ...(process.env.ANALYZE
      ? [visualizer({ open: true, gzipSize: true, brotliSize: true })]
      : []),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunks to reduce main bundle size
          "vendor-react": ["react", "react-dom", "react-router-dom"],
          "vendor-radix": [
            "@radix-ui/react-dialog",
            "@radix-ui/react-dropdown-menu",
            "@radix-ui/react-popover",
            "@radix-ui/react-select",
            "@radix-ui/react-tabs",
            "@radix-ui/react-tooltip",
            "@radix-ui/react-toast",
            "@radix-ui/react-accordion",
            "@radix-ui/react-checkbox",
            "@radix-ui/react-label",
            "@radix-ui/react-scroll-area",
            "@radix-ui/react-separator",
            "@radix-ui/react-switch",
            "@radix-ui/react-slot",
          ],
          "vendor-supabase": ["@supabase/supabase-js"],
          "vendor-tanstack": ["@tanstack/react-query"],
          "vendor-charts": ["recharts"],
          "vendor-i18n": ["i18next", "react-i18next"],
          "vendor-forms": ["react-hook-form", "@hookform/resolvers", "zod"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    setupFiles: ["src/tests/setup.ts"],
  },
}));
