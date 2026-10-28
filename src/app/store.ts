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
import { persistStore, persistReducer, createTransform, PersistConfig } from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage ishlatish uchun
import { combineReducers } from "redux";
import { eimzoApi } from "@/services/eimzoApi";
import { informationAnalyticalApi } from "@/services/informationAnalyticalApi";
import { uniqeApi } from "@/services/uniqeApi";
import { billingApi } from "@/services/billingApi";
import { yashilApi } from "@/services/yashilApi";

const rootReducer = combineReducers({
  [reportApi.reducerPath]: reportApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [generalApi.reducerPath]: generalApi.reducer,
  [statistikApi.reducerPath]: statistikApi.reducer,
  [sumApi.reducerPath]: sumApi.reducer,
  [eimzoApi.reducerPath]: eimzoApi.reducer,
  [informationAnalyticalApi.reducerPath]: informationAnalyticalApi.reducer,
  [uniqeApi.reducerPath]: uniqeApi.reducer,
  [billingApi.reducerPath]: billingApi.reducer,
  [yashilApi.reducerPath]: yashilApi.reducer,

  auth: authReducer,
  report: reportReducer,
  language: languageReducer,
  sidebar: sidebarReducer,
  ui: uiReducer,
});

// auth: faqat profil (user) saqlanadi — access token xotirada, refresh token
// HttpOnly cookie'da (audit A5). localStorage'da token bo'lmaydi.
const authTransform = createTransform<any, any, any, any>(
  (inbound: any) => {
    const user = inbound?.user ? { ...inbound.user } : null;
    if (user) {
      delete user.access;
      delete user.refresh;
    }
    return { user, token: null };
  },
  (outbound: any) => ({ user: outbound?.user ?? null, token: null }),
  { whitelist: ["auth"] }
);

// Redux Persist optimizatsiyasi
const persistConfig: PersistConfig<ReturnType<typeof rootReducer>> = {
  key: "root",
  storage,
  whitelist: ["auth", "language"], // faqat qaysi slice'lar saqlansin
  transforms: [authTransform],
  // Performance optimizatsiyasi
  blacklist: [
    reportApi.reducerPath,
    generalApi.reducerPath,
    statistikApi.reducerPath,
    sumApi.reducerPath,
    eimzoApi.reducerPath,
    informationAnalyticalApi.reducerPath,
    billingApi.reducerPath,
    yashilApi.reducerPath,
    "report",
    "sidebar",
    "ui",
  ], // Bu slice'lar persist qilinmaydi - performance uchun
};

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
      uniqeApi.middleware,
      billingApi.middleware,
      yashilApi.middleware
    ),
});

// 🆕 persist uchun export
export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
