import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    // Conditionally add Replit plugins
    ...(process.env.REPL_ID ? [
      (await import("@replit/vite-plugin-runtime-error-modal").then(m => m.default())),
      (await import("@replit/vite-plugin-cartographer").then(m => m.cartographer())),
    ] : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "client", "src"),
      "@shared": path.resolve(import.meta.dirname, "shared"),
      "@assets": path.resolve(import.meta.dirname, "attached_assets"),
    },
  },
  root: path.resolve(import.meta.dirname, "client"),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
    // Optimize build performance
    sourcemap: process.env.NODE_ENV === "development",
    minify: "esbuild",
  },
  // Optimize dev server
  server: {
    port: 5173,
    strictPort: false,
  },
  // Optimize dependencies
  optimizeDeps: {
    include: ["react", "react-dom", "react-big-calendar", "moment"],
  },
});
