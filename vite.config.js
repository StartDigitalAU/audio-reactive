import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  base: "/audio-reactive/",
  publicDir: "public",
  root: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return id
              .toString()
              .split("node_modules/")[1]
              .split("/")[0]
              .toString();
          }
          return null;
        },
      },
    },
    minify: "esbuild",
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
