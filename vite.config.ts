import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // Bundle size optimizatsiyasi
    target: "esnext",
    // Esbuild minify - terser'ga qaraganda tezroq va default
    minify: "esbuild",
    // CSS code splitting
    cssCodeSplit: true,
    // Asset inline limit - kichik asset'larni inline qilish
    assetsInlineLimit: 4096, // 4KB dan kichik asset'lar inline bo'ladi
    // Code splitting optimizatsiyasi
    rollupOptions: {
      output: {
        // Manual chunk splitting - katta library'larni alohida chunk'larga ajratish
        manualChunks: (id) => {
          // Node modules'ni alohida chunk'larga ajratish
          if (id.includes("node_modules")) {
            // React va React DOM - bir chunk'da bo'lishi kerak (React dependency uchun)
            if (
              (id.includes("react/") || id.includes("react\\")) &&
              !id.includes("react-dom") &&
              !id.includes("react-router")
            ) {
              return "react-vendor";
            }
            // React DOM - React bilan bir chunk'da
            if (id.includes("react-dom")) {
              return "react-vendor";
            }
            // React Router - alohida
            if (id.includes("react-router")) {
              return "react-router-vendor";
            }
            // Redux Toolkit - alohida
            if (id.includes("@reduxjs/toolkit")) {
              return "redux-toolkit-vendor";
            }
            // React Redux - alohida
            if (id.includes("react-redux")) {
              return "react-redux-vendor";
            }
            // Redux Persist - alohida
            if (id.includes("redux-persist")) {
              return "redux-persist-vendor";
            }
            // Radix UI - katta library, alohida chunk
            if (id.includes("@radix-ui")) {
              return "ui-vendor";
            }
            // Chart.js - alohida
            if (id.includes("chart.js")) {
              return "chartjs-vendor";
            }
            // Recharts - alohida
            if (id.includes("recharts")) {
              return "recharts-vendor";
            }
            // React ChartJS - alohida
            if (id.includes("react-chartjs")) {
              return "react-chartjs-vendor";
            }
            // PDF library'lar - faqat kerak bo'lganda yuklash
            if (id.includes("@react-pdf") || id.includes("jspdf")) {
              return "pdf-vendor";
            }
            // Excel library'lar - faqat kerak bo'lganda yuklash
            if (id.includes("xlsx") || id.includes("sheetjs")) {
              return "excel-vendor";
            }
            // Image export library'lar - faqat kerak bo'lganda yuklash
            if (
              id.includes("html2canvas") ||
              id.includes("html-to-image") ||
              id.includes("dom-to-image") ||
              id.includes("file-saver")
            ) {
              return "image-export-vendor";
            }
            // Crypto - alohida
            if (id.includes("crypto-js")) {
              return "crypto-vendor";
            }
            // Date utilities - alohida
            if (id.includes("date-fns")) {
              return "date-vendor";
            }
            // i18next - alohida
            if (id.includes("i18next")) {
              return "i18n-vendor";
            }
            // Lucide icons - alohida
            if (id.includes("lucide-react")) {
              return "icons-vendor";
            }
            // Boshqa kichik vendor'lar
            return "vendor";
          }
          
          // Source code'ni ham chunk'larga ajratish
          // Dashboard - katta komponent, alohida chunk
          if (id.includes("/views/Dashboard/")) {
            return "dashboard";
          }
          // Auth - alohida chunk
          if (id.includes("/views/Auth/")) {
            return "auth";
          }
          // Components - alohida chunk
          if (id.includes("/components/")) {
            return "components";
          }
          // Services - alohida chunk
          if (id.includes("/services/")) {
            return "services";
          }
        },
        // Chunk naming optimizatsiyasi
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
  },
  // Performance optimizatsiyasi
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-router-dom",
      "@reduxjs/toolkit",
      "react-redux",
    ],
    exclude: ["@react-pdf/renderer", "jspdf", "xlsx"],
    // Force optimization - tezroq yuklash uchun
    force: true,
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
  },
  // Preview optimizatsiyasi
  preview: {
    port: 4173,
    strictPort: true,
  },
})