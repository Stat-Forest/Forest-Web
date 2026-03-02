import { configureStore } from "@reduxjs/toolkit";
import { reportApi } from "@/services/reportsApi";
import authReducer from "../features/authSlice";
import reportReducer from "../features/reportSlice";
import languageReducer from "../features/languageSlice";
import { authApi } from "@/services/authApi";
import { generalApi } from "@/services/generalApi";
import { statistikApi } from "@/services/statistikApi";
import { sumApi } from "@/services/sumApi";
import sidebarReducer from "@/features/sidebarSlice";
import uiReducer from "@/features/uiSlice";

// 🆕 persist qo'shiladi
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage ishlatish uchun
import { combineReducers } from "redux";
import { eimzoApi } from "@/services/eimzoApi";
import { informationAnalyticalApi } from "@/services/informationAnalyticalApi";

// Redux Persist optimizatsiyasi
const persistConfig = {
  key: "root",
  storage,
  whitelist: ["auth", "language"], // faqat qaysi slice'lar saqlansin
  // Performance optimizatsiyasi
  blacklist: [
    reportApi.reducerPath,
    generalApi.reducerPath,
    statistikApi.reducerPath,
    sumApi.reducerPath,
    eimzoApi.reducerPath,
    informationAnalyticalApi.reducerPath,
    "report",
    "sidebar",
    "ui",
  ], // Bu slice'lar persist qilinmaydi - performance uchun
};

const rootReducer = combineReducers({
  [reportApi.reducerPath]: reportApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [generalApi.reducerPath]: generalApi.reducer,
  [statistikApi.reducerPath]: statistikApi.reducer,
  [sumApi.reducerPath]: sumApi.reducer,
  [eimzoApi.reducerPath]: eimzoApi.reducer,
  [informationAnalyticalApi.reducerPath]: informationAnalyticalApi.reducer,

  auth: authReducer,
  report: reportReducer,
  language: languageReducer,
  sidebar: sidebarReducer,
  ui: uiReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable both checks to resolve warnings
      serializableCheck: false,
      immutableCheck: false,
    }    ).concat(
      reportApi.middleware,
      authApi.middleware,
      generalApi.middleware,
      statistikApi.middleware,
      sumApi.middleware,
      eimzoApi.middleware,
      informationAnalyticalApi.middleware,
    ),
});

// 🆕 persist uchun export
export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
