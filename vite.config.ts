import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "prompt",
      includeAssets: ["icon.svg"],
      manifest: {
        name: "Diha Keeper",
        short_name: "Diha",
        description: "사람 형태의 Ocean Keeper를 돌보는 로컬 우선 게임",
        theme_color: "#0b7085",
        background_color: "#f5ead2",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        lang: "ko",
        icons: [
          { src: "/icon.svg", sizes: "192x192", type: "image/svg+xml", purpose: "any" },
          { src: "/icon.svg", sizes: "512x512", type: "image/svg+xml", purpose: "maskable" }
        ]
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,webmanifest}"],
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.destination === "audio",
            handler: "CacheFirst",
            options: {
              cacheName: "diha-audio-v1",
              expiration: { maxEntries: 20, maxAgeSeconds: 2592000 }
            }
          }
        ]
      }
    })
  ],
  build: {
    target: "es2022",
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ["phaser"],
          persistence: ["idb", "zod"]
        }
      }
    }
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: { reporter: ["text", "html"] }
  }
});
