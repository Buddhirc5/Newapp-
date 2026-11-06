/// <reference types="vitest/config" />
import { fileURLToPath, URL } from "node:url";
import { defineConfig, type PluginOption } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

// Two build targets:
//  - production (default): installable PWA with offline support, served from "/".
//  - preview (`--mode preview`): a self-contained bundle with relative paths and
//    in-memory routing, used to publish a clickable preview.
export default defineConfig(({ mode }) => {
  const isPreview = mode === "preview";
  const plugins: PluginOption[] = [react(), tailwindcss()];

  if (!isPreview) {
    plugins.push(
      VitePWA({
        registerType: "autoUpdate",
        // Registered in main.tsx, where a refusal (crawlers, private modes) is handled quietly.
        injectRegister: false,
        includeAssets: ["favicon.svg", "apple-touch-icon.png"],
        manifest: {
          name: "KiwiPath",
          short_name: "KiwiPath",
          description: "Your step-by-step guide from Sri Lanka to New Zealand.",
          theme_color: "#F5F4ED",
          background_color: "#F5F4ED",
          display: "standalone",
          orientation: "portrait",
          start_url: "/",
          icons: [
            { src: "/pwa-192.png", sizes: "192x192", type: "image/png" },
            { src: "/pwa-512.png", sizes: "512x512", type: "image/png" },
            { src: "/pwa-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
          // PDF reading and writing load only when someone uses CV Studio; don't make every visitor download them.
          globIgnores: ["**/pdf-*.js", "**/pdf.worker*", "**/jspdf*.js", "**/html2canvas*.js", "**/purify*.js", "**/index.es-*.js"],
          navigateFallback: "/index.html",
          // Public search pages are plain HTML; let the network serve them.
          navigateFallbackDenylist: [/^\/learn/, /^\/visa/, /^\/cities/, /^\/sitemap/, /^\/robots/],
        },
      }),
    );
  }

  return {
    base: isPreview ? "./" : "/",
    plugins,
    define: { __BUILD_ID__: JSON.stringify((process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7)) },
    resolve: {
      alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    },
    build: {
      outDir: isPreview ? "dist-preview" : "dist",
      // The preview cannot fetch fonts from other hosts, so fonts and the
      // contour pattern are embedded in the stylesheet there.
      assetsInlineLimit: isPreview ? 400_000 : 4096,
      chunkSizeWarningLimit: 900,
    },
    test: {
      environment: "node",
      include: ["src/**/*.test.ts"],
    },
  };
});
