import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./app/store.ts";
import App from "./App.tsx";

// Background image'ni lazy load qilish - performance optimizatsiyasi
// Katta image (5.3 MB) ni lazy load qilish - FCP va LCP'ni yaxshilaydi
if (typeof window !== "undefined") {
  // Defer background image loading - sahifa render bo'lgandan keyin
  const loadBackgroundImage = () => {
    if ("requestIdleCallback" in window) {
      // Browser support qilsa, idle vaqtda yuklash
      requestIdleCallback(
        () => {
          const img = new Image();
          img.src = "/src/assets/bg.png";
          img.onload = () => {
            // Image yuklangandan keyin body'ga class qo'shish
            document.body.style.backgroundImage = `linear-gradient(#a7bcb075, #e7fced7d), url(${img.src})`;
          };
        },
        { timeout: 2000 }
      );
    } else {
      // Fallback - setTimeout
      setTimeout(() => {
        const img = new Image();
        img.src = "/src/assets/bg.png";
        img.onload = () => {
          document.body.style.backgroundImage = `linear-gradient(#a7bcb075, #e7fced7d), url(${img.src})`;
        };
      }, 100);
    }
  };

  // DOM ready bo'lgandan keyin yuklash
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadBackgroundImage);
  } else {
    loadBackgroundImage();
  }
}

createRoot(document.getElementById("root")!).render(
  <Provider store={store}>
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  </Provider>
);
