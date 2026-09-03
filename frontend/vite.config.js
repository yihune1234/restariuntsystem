import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { fileURLToPath } from "url"
import { VitePWA } from 'vite-plugin-pwa'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'Tasty Station POS',
        short_name: 'POS',
        description: 'Point of Sale System for Tasty Station',
        theme_color: '#0d9488',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        // Automatically cache all static assets
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        // Increase maximum file size for caching (default is 2MB, JS bundles can be large)
        maximumFileSizeToCacheInBytes: 5000000,
        // SPA navigation: serve index.html for all navigation requests
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api/, /^\/public/, /^\/auth/],
        runtimeCaching: [
          {
            // Cache GET API responses that don't change often
            urlPattern: ({ url }) => url.pathname.startsWith('/api/v1/branches'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'api-branches',
              expiration: { maxEntries: 10, maxAgeSeconds: 3600 },
            },
          },
        ],
      }
    })
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    // Restrict test discovery to the frontend test directory only.
    // Use the vitest `projects`-style include glob; the parent monorepo
    // contains backend jest tests which must not be picked up.
    include: ['./src/**/*.{test,spec}.?(js|mjs|cjs|jsx|ts|mts|cts|tsx)'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '../Cafeteria-Management-System-Backend/**',
      './node_modules/**',
    ],
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    setupFiles: './src/test/setup.jsx',
    css: true,
  },
})