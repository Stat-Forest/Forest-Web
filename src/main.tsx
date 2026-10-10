import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./app/store.ts";
import App from "./App.tsx";

// Mixed content: zamonaviy brauzerlar https sahifada http:// rasmlarni o'zi
// https ga ko'taradi. Qolgan hollar uchun yuklanmagan rasmni bir marta https
// bilan qayta urinamiz. (Ilgari MutationObserver har DOM o'zgarishida barcha
// img'larni qidirardi — katta jadvallarda qimmat edi.)
if (typeof window !== "undefined" && window.location.protocol === "https:") {
  window.addEventListener(
    "error",
    (event) => {
      const target = event.target;
      if (target instanceof HTMLImageElement && target.src.startsWith("http://")) {
        target.src = target.src.replace("http://", "https://");
      }
    },
    true,
  );
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
