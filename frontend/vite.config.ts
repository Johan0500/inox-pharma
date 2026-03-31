import { defineConfig } from "vite";
import react            from "@vitejs/plugin-react";
import { VitePWA }      from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType:  "autoUpdate",
      injectRegister: "auto",
      devOptions:    { enabled: true },
      manifest: {
        name:             "INOX PHARMA",
        short_name:       "INOX PHARMA",
        description:      "Application de Gestion Pharmaceutique - Côte d'Ivoire",
        theme_color:      "#0f172a",
        background_color: "#0f172a",
        display:          "standalone",
        orientation:      "portrait",
        start_url:        "/",
        scope:            "/",
        lang:             "fr",
        icons: [
          { src: "/icon-192.png", sizes: "192x192", type: "image/png"                  },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png"                  },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
        shortcuts: [
          { name: "Nouveau rapport", url: "/?tab=report",   icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          { name: "GPS",             url: "/?tab=gps",      icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
          { name: "Messagerie",      url: "/?tab=messages", icons: [{ src: "/icon-192.png", sizes: "192x192" }] },
        ],
      },
      workbox: {
        globPatterns:          ["**/*.{js,css,html,ico,png,svg,woff,woff2}"],
        cleanupOutdatedCaches: true,
        skipWaiting:           true,
        clientsClaim:          true,
        runtimeCaching: [
          // Cache API avec stratégie NetworkFirst
          {
            urlPattern:  /^https:\/\/inox-pharma-0gkr\.onrender\.com\/api\/(pharmacies|products|laboratories|sectors|planning|delegates)/i,
            handler:     "NetworkFirst",
            options: {
              cacheName:         "api-data-cache",
              expiration:        { maxEntries: 100, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
              networkTimeoutSeconds: 5,
            },
          },
          // Cache photos et assets statiques
          {
            urlPattern:  /\.(png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler:     "CacheFirst",
            options: {
              cacheName:  "images-cache",
              expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
          // Cache fonts Google
          {
            urlPattern:  /^https:\/\/fonts\.(googleapis|gstatic)\.com/i,
            handler:     "CacheFirst",
            options: {
              cacheName:         "fonts-cache",
              expiration:        { maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          // Cache tuiles OpenStreetMap
          {
            urlPattern:  /^https:\/\/[abc]\.tile\.openstreetmap\.org/i,
            handler:     "CacheFirst",
            options: {
              cacheName:  "map-tiles-cache",
              expiration: { maxEntries: 500, maxAgeSeconds: 7 * 24 * 60 * 60 },
            },
          },
        ],
      },
    }),
  ],
  server: { port: 5173 },
});