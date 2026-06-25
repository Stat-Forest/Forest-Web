import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/",
  build: {
    // Bundle size optimizatsiyasi
    target: "esnext",
    // Esbuild minify - terser'ga qaraganda tezroq va default
    minify: "esbuild",
    // CSS code splitting
    cssCodeSplit: true,
    // Asset inline limit - kichik asset'larni inline qilish
    assetsInlineLimit: 4096, // 4KB dan kichik asset'lar inline bo'ladi
    // OutDir - build output directory
    outDir: "dist",
    // AssetsDir - asset'lar papkasi
    assetsDir: "assets",
    // CommonJS va ES modules'ni to'g'ri handle qilish
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true,
    },
    // Code splitting optimizatsiyasi - default Vite chunk splitting
    rollupOptions: {
      output: {
        // Chunk naming optimizatsiyasi - relative path'lar
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
        assetFileNames: (assetInfo) => {
          // TypeScript xatosini oldini olish - name undefined bo'lishi mumkin
          if (!assetInfo.name) {
            return `assets/[name]-[hash][extname]`;
          }
          
          const info = assetInfo.name.split(".");
          const ext = info[info.length - 1];
          
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/woff|woff2|eot|ttf|otf/i.test(ext)) {
            return `assets/fonts/[name]-[hash][extname]`;
          }
          return `assets/[ext]/[name]-[hash][extname]`;
        },
      },
    },
    // Chunk size warning'ini oshirish
    chunkSizeWarningLimit: 600, // Katta chunk'larni ajratish uchun
    // Source maps - production'da o'chirish
    sourcemap: false,
    // Report compressed size - gzip size'ni ko'rsatish
    reportCompressedSize: true,
    // Module preload - default Vite strategiyasi
    modulePreload: {
      polyfill: true,
    },
  },
  // Performance optimizatsiyasi
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react-router-dom",
      "@reduxjs/toolkit",
      "react-redux",
    ],
    exclude: ["@react-pdf/renderer", "jspdf", "xlsx"],
    // Force optimization - tezroq yuklash uchun
    force: true,
  },
  // Resolve konfiguratsiyasi - React'ni to'g'ri resolve qilish
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // React'ni bitta instance'ga majburlash
      react: path.resolve(__dirname, "./node_modules/react"),
      "react-dom": path.resolve(__dirname, "./node_modules/react-dom"),
    },
    dedupe: ["react", "react-dom"],
  },
  // Esbuild options - console.log va debugger'larni olib tashlash
  esbuild: {
    drop: ["console", "debugger"], // Production'da console.log va debugger'larni olib tashlash
    legalComments: "none", // Legal comments'larni olib tashlash
    treeShaking: true, // Tree shaking optimizatsiyasi
  },
  // Server optimizatsiyasi (development uchun)
  server: {
    // HMR optimizatsiyasi
    hmr: {
      overlay: false, // Error overlay'ni o'chirish - performance uchun
    },
    // Dev server proxy: local requests to /api will be forwarded to the remote API
    proxy: {
      "/api": {
        target: "https://forest.yutori.uz",
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, "/api/v1"),
      },
    },
  },
  // Preview optimizatsiyasi
  preview: {
    port: 4173,
    strictPort: true,
  },
})