import react from "@vitejs/plugin-react";
import { loadEnv, type HtmlTagDescriptor, type Plugin } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";
import { petResearchHandler } from "./server/petResearch";
import { placeSearchHandler } from "./server/placeSearch";

function petResearchDevApi(): Plugin {
  const attach = (middlewares: { use(path: string, handler: (request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => void): void }) => {
    middlewares.use("/api/pet-research", (request, response) => {
      void petResearchHandler(request, response);
    });
  };
  return {
    name: "diha-pet-research-dev-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    }
  };
}

function placeSearchDevApi(): Plugin {
  const attach = (middlewares: { use(path: string, handler: (request: import("node:http").IncomingMessage, response: import("node:http").ServerResponse) => void): void }) => {
    middlewares.use("/api/place-search", (request, response) => {
      void placeSearchHandler(request, response);
    });
  };
  return {
    name: "diha-place-search-dev-api",
    configureServer(server) {
      attach(server.middlewares);
    },
    configurePreviewServer(server) {
      attach(server.middlewares);
    }
  };
}

const PUBLIC_ROUTES = ["/about", "/dog", "/cat", "/pet-health", "/dha", "/app", "/privacy", "/terms", "/support"];

function seoStaticRoutes(): Plugin {
  const rewrite = (request: import("node:http").IncomingMessage, _response: import("node:http").ServerResponse, next: () => void) => {
    if (request.url) {
      const url = new URL(request.url, "http://diha.local");
      if (PUBLIC_ROUTES.includes(url.pathname)) request.url = `${url.pathname}.html${url.search}`;
    }
    next();
  };
  return {
    name: "diha-static-seo-routes",
    configureServer(server) { server.middlewares.use(rewrite); },
    configurePreviewServer(server) { server.middlewares.use(rewrite); }
  };
}

function searchVerificationMeta(env: Record<string, string>): Plugin {
  return {
    name: "diha-search-verification",
    transformIndexHtml() {
      const tags: HtmlTagDescriptor[] = [];
      if (env.VITE_GOOGLE_SITE_VERIFICATION) tags.push({ tag: "meta", attrs: { name: "google-site-verification", content: env.VITE_GOOGLE_SITE_VERIFICATION }, injectTo: "head" });
      if (env.VITE_NAVER_SITE_VERIFICATION) tags.push({ tag: "meta", attrs: { name: "naver-site-verification", content: env.VITE_NAVER_SITE_VERIFICATION }, injectTo: "head" });
      return tags;
    }
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  return {
    plugins: [
      react(),
      seoStaticRoutes(),
      searchVerificationMeta(env),
      petResearchDevApi(),
      placeSearchDevApi(),
      VitePWA({
      registerType: "prompt",
      manifestFilename: "app.webmanifest",
      includeAssets: ["icon.svg", "pwa-192x192.png", "pwa-512x512.png", "pwa-maskable-512x512.png", "apple-touch-icon.png"],
      manifest: {
        id: "/",
        name: "Diha - 디지털 펫 헬스",
        short_name: "Diha",
        description: "강아지와 고양이의 산책, 영양, 건강 루틴을 디지털 펫 게임과 연결하는 디지털 펫 헬스 플랫폼",
        theme_color: "#0b7085",
        background_color: "#fff9e9",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "ko",
        categories: ["health", "lifestyle", "games"],
        icons: [
          { src: "/pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/pwa-maskable-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" }
        ]
      },
      workbox: {
        cleanupOutdatedCaches: true,
        globPatterns: ["**/*.{js,css,html,svg,png,jpg,jpeg,webmanifest,xml,txt}"],
        globIgnores: ["assets/*-photoreal-v1.jpg"],
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//, /^\/__\/auth\//, /^\/__\/firebase\//],
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
  };
});
