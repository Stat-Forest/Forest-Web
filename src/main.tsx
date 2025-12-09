import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./app/store.ts";
import App from "./App.tsx";

// Global interceptor - barcha HTTP URL'larni HTTPS'ga o'zgartirish
// Mixed Content muammosini hal qilish uchun
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  // MutationObserver - DOM'da yangi image element'lar qo'shilganda HTTP'ni HTTPS'ga o'zgartirish
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          
          // Image element'larni tekshirish
          if (element.tagName === "IMG") {
            const img = element as HTMLImageElement;
            if (img.src && img.src.startsWith("http://")) {
              img.src = img.src.replace("http://", "https://");
            }
          }
          
          // Barcha image element'larni tekshirish (nested)
          const images = element.querySelectorAll("img");
          images.forEach((img) => {
            if (img.src && img.src.startsWith("http://")) {
              img.src = img.src.replace("http://", "https://");
            }
          });
        }
      });
    });
  });

  // DOM'ni kuzatish
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
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
