import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import autoprefixer from "autoprefixer";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(() => {
  return {
    base: "./",
    build: {
      outDir: "build",
    },
    css: {
      postcss: {
        plugins: [
          autoprefixer({}), // add options if needed
        ],
      },
    },
    esbuild: {
      loader: "jsx",
      include: /src\/.*\.jsx?$/,
      exclude: [],
    },
    optimizeDeps: {
      force: true,
      esbuildOptions: {
        loader: {
          ".js": "jsx",
        },
      },
    },
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: [
        {
          find: "@/",
          replacement: `${path.resolve(__dirname, "src")}/`,
        },
        {
          find: "src/",
          replacement: `${path.resolve(__dirname, "src")}/`,
        },
      ],
      extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json", ".scss"],
    },
    server: {
      port: 3000,
      proxy: {
        // https://vitejs.dev/config/server-options.html
      },
    },
  };
});
