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

// 🆕 persist qo‘shiladi
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage"; // localStorage ishlatish uchun
import { combineReducers } from "redux";

const rootReducer = combineReducers({
  [reportApi.reducerPath]: reportApi.reducer,
  [authApi.reducerPath]: authApi.reducer,
  [generalApi.reducerPath]: generalApi.reducer,
  [statistikApi.reducerPath]: statistikApi.reducer,
  [sumApi.reducerPath]: sumApi.reducer,

  auth: authReducer,
  report: reportReducer,
  language: languageReducer,
   sidebar: sidebarReducer,
});

const persistedReducer = persistReducer(
  {
    key: "root",
    storage,
    whitelist: ["auth", "language"], // faqat qaysi slice'lar saqlansin
  },
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // Disable both checks to resolve warnings
      serializableCheck: false,
      immutableCheck: false,
    }).concat(
      reportApi.middleware,
      authApi.middleware,
      generalApi.middleware,
      statistikApi.middleware,
      sumApi.middleware
    ),
});

// 🆕 persist uchun export
export const persistor = persistStore(store);

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
