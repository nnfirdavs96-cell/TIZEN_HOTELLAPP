import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  build: {
    target: "es2017",
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      output: {
        entryFileNames: "assets/[name]-[hash].js",
        chunkFileNames: "assets/[name]-[hash].js",
        assetFileNames: "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    host: true,
    port: 5173,
  },
});
