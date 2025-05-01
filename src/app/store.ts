import { configureStore } from "@reduxjs/toolkit";
import { reportApi } from "@/services/reportsApi";
import authReducer from "../features/authSlice";
import { authApi } from "@/services/authApi";

export const store = configureStore({
  reducer: {
    [reportApi.reducerPath]: reportApi.reducer,
    [authApi.reducerPath]: authApi.reducer,

    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }).concat(reportApi.middleware, authApi.middleware),
});

export type AppDispatch = typeof store.dispatch;
export type RootState = ReturnType<typeof store.getState>;
