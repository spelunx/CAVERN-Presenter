import { defineConfig } from "vite";

export default defineConfig({
  base: "/CAVERN-Presenter/",
  build: {
    minify: "esbuild",
    rollupOptions: {
      treeshake: "smallest",
    },
  },
});
