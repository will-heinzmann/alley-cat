import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { createRequire } from "node:module";
import { componentTagger } from "lovable-tagger";
import { getPrerenderRoutes } from "./prerender/routes";

const require = createRequire(import.meta.url);
const vitePrerender = require("vite-plugin-prerender");

// https://vitejs.dev/config/
export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const prerenderRoutes = mode === "production" ? await getPrerenderRoutes(env) : [];

  return {
    server: {
      host: "::",
      port: 8080,
      hmr: {
        overlay: false,
      },
    },
    plugins: [
      react(),
      mode === "development" && componentTagger(),
      mode === "production" && prerenderRoutes.length > 0 && vitePrerender({
        staticDir: path.join(__dirname, "dist"),
        routes: prerenderRoutes,
        renderer: new vitePrerender.PuppeteerRenderer({
          renderAfterDocumentEvent: "alleycat:prerender-ready",
          maxConcurrentRoutes: 4,
        }),
      }),
    ].filter(Boolean),
    optimizeDeps: {
      exclude: ["react-leaflet", "@react-leaflet/core"],
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: [
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "@tanstack/react-query",
        "@tanstack/query-core",
        "react-leaflet",
        "@react-leaflet/core",
      ],
    },
  };
});
